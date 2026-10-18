from __future__ import annotations

import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

DATABASE_PATH = Path(
    os.getenv(
        "DIGIMIRROR_DATABASE_PATH",
        Path(__file__).resolve().parents[1] / "data" / "digimirror.db",
    )
)
SECRET_KEY = os.getenv("DIGIMIRROR_JWT_SECRET", "digimirror-secure-session-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

SAMPLE_EMAIL = "sample@digimirror.local"
SAMPLE_PASSWORD = "sample123"

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# --- Schemas ---


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str = "User"
    account_name: str | None = None
    account_label: str = "Personal account"
    threat_profile: str = "everyday"


class LoginRequest(BaseModel):
    email: str
    password: str


class CreateAccountRequest(BaseModel):
    name: str
    label: str = "Personal account"
    threat_profile: str = "everyday"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str


class UserAccountResponse(BaseModel):
    id: str
    name: str
    label: str
    initials: str
    threat_profile: str
    baseRisk: int = 50
    services: int = 4
    exposedFields: int = 15


class AuthResponse(BaseModel):
    token: str
    user: UserResponse
    accounts: list[UserAccountResponse]


class MeResponse(BaseModel):
    user: UserResponse
    accounts: list[UserAccountResponse]


# --- Database connection and schema ---


def _connect() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_auth_db() -> None:
    with _connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS user_accounts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                label TEXT NOT NULL,
                initials TEXT NOT NULL,
                threat_profile TEXT NOT NULL DEFAULT 'everyday',
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            """
        )
        db.commit()


# --- Password & JWT helpers ---


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired session token") from exc


def make_initials(name: str) -> str:
    parts = name.strip().split()
    if not parts:
        return "AC"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def get_user_accounts(user_id: str, db: sqlite3.Connection) -> list[UserAccountResponse]:
    rows = db.execute(
        "SELECT id, name, label, initials, threat_profile FROM user_accounts WHERE user_id = ? ORDER BY created_at ASC",
        (user_id,),
    ).fetchall()
    return [
        UserAccountResponse(
            id=r["id"],
            name=r["name"],
            label=r["label"],
            initials=r["initials"],
            threat_profile=r["threat_profile"],
            baseRisk=48 if "work" in r["id"] else 72 if "personal" in r["id"] else 64,
            services=3 if "work" in r["id"] else 4,
            exposedFields=14 if "work" in r["id"] else 22 if "personal" in r["id"] else 19,
        )
        for r in rows
    ]


def ensure_sample_user() -> dict:
    init_auth_db()
    with _connect() as db:
        user = db.execute("SELECT * FROM users WHERE email = ?", (SAMPLE_EMAIL,)).fetchone()
        if not user:
            user_id = "usr_sample"
            now = datetime.now(timezone.utc).isoformat()
            db.execute(
                "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, SAMPLE_EMAIL, "Harshika Thopte", hash_password(SAMPLE_PASSWORD), now),
            )
            # Add sample demo profiles
            sample_accounts = [
                ("harshika-personal", user_id, "Harshika", "Personal account", "HS", "everyday", now),
                ("harshika-work", user_id, "Harshika", "Work account", "HT", "financially_sensitive", now),
                ("ishan-demo", user_id, "Ishan", "Team demo account", "IS", "family", now),
            ]
            db.executemany(
                "INSERT INTO user_accounts (id, user_id, name, label, initials, threat_profile, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                sample_accounts,
            )
            db.commit()
            user = db.execute("SELECT * FROM users WHERE email = ?", (SAMPLE_EMAIL,)).fetchone()
        elif user["name"] != "Harshika Thopte":
            # Keep existing development databases aligned with the named demo profile.
            db.execute(
                "UPDATE users SET name = ? WHERE id = ?",
                ("Harshika Thopte", user["id"]),
            )
            db.commit()
            user = db.execute("SELECT * FROM users WHERE email = ?", (SAMPLE_EMAIL,)).fetchone()
        return dict(user)


def get_current_user_from_header(authorization: str | None = Header(None)) -> tuple[str, str]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required. Please sign in.")
    token = authorization[7:].strip()
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Malformed session token")
    return user_id, email


# --- Endpoints ---


@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest) -> AuthResponse:
    init_auth_db()
    clean_email = req.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid email address is required")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    with _connect() as db:
        existing = db.execute("SELECT id FROM users WHERE email = ?", (clean_email,)).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists")

        user_id = "usr_" + secrets.token_hex(12)
        user_name = req.name.strip() or "User"
        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, clean_email, user_name, hash_password(req.password), now),
        )

        initial_name = req.account_name.strip() if req.account_name else user_name
        account_id = f"acct_{secrets.token_hex(8)}"
        db.execute(
            "INSERT INTO user_accounts (id, user_id, name, label, initials, threat_profile, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                account_id,
                user_id,
                initial_name,
                req.account_label.strip() or "Personal account",
                make_initials(initial_name),
                req.threat_profile,
                now,
            ),
        )
        db.commit()

        token = create_access_token(user_id, clean_email)
        accounts = get_user_accounts(user_id, db)
        return AuthResponse(
            token=token,
            user=UserResponse(id=user_id, email=clean_email, name=user_name),
            accounts=accounts,
        )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest) -> AuthResponse:
    init_auth_db()
    clean_input = req.email.strip().lower()

    with _connect() as db:
        # Check for sample quick login
        if clean_input in ("sample", "sample@digimirror.local"):
            sample = ensure_sample_user()
            # Accept sample123, sample, or empty for 1-click quick demo login
            if req.password not in (SAMPLE_PASSWORD, "sample", ""):
                if not verify_password(req.password, sample["password_hash"]):
                    raise HTTPException(status_code=401, detail="Invalid password for sample account")
            token = create_access_token(sample["id"], sample["email"])
            accounts = get_user_accounts(sample["id"], db)
            return AuthResponse(
                token=token,
                user=UserResponse(id=sample["id"], email=sample["email"], name=sample["name"]),
                accounts=accounts,
            )

        user = db.execute("SELECT * FROM users WHERE email = ?", (clean_input,)).fetchone()
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_access_token(user["id"], user["email"])
        accounts = get_user_accounts(user["id"], db)
        return AuthResponse(
            token=token,
            user=UserResponse(id=user["id"], email=user["email"], name=user["name"]),
            accounts=accounts,
        )


@router.get("/me", response_model=MeResponse)
async def me(authorization: str | None = Header(None)) -> MeResponse:
    init_auth_db()
    user_id, _ = get_current_user_from_header(authorization)
    with _connect() as db:
        user = db.execute("SELECT id, email, name FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User account not found")
        accounts = get_user_accounts(user_id, db)
        return MeResponse(
            user=UserResponse(id=user["id"], email=user["email"], name=user["name"]),
            accounts=accounts,
        )


@router.post("/accounts", response_model=list[UserAccountResponse])
async def create_linked_account(req: CreateAccountRequest, authorization: str | None = Header(None)) -> list[UserAccountResponse]:
    init_auth_db()
    user_id, _ = get_current_user_from_header(authorization)
    clean_name = req.name.strip() or "New Account"
    account_id = f"acct_{secrets.token_hex(8)}"
    now = datetime.now(timezone.utc).isoformat()

    with _connect() as db:
        user = db.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        db.execute(
            "INSERT INTO user_accounts (id, user_id, name, label, initials, threat_profile, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                account_id,
                user_id,
                clean_name,
                req.label.strip() or "Personal account",
                make_initials(clean_name),
                req.threat_profile,
                now,
            ),
        )
        db.commit()

        return get_user_accounts(user_id, db)


@router.delete("/accounts/{account_id}", response_model=list[UserAccountResponse])
async def delete_linked_account(account_id: str, authorization: str | None = Header(None)) -> list[UserAccountResponse]:
    init_auth_db()
    user_id, _ = get_current_user_from_header(authorization)
    with _connect() as db:
        accounts = db.execute("SELECT id FROM user_accounts WHERE user_id = ?", (user_id,)).fetchall()
        if len(accounts) <= 1:
            raise HTTPException(status_code=400, detail="Cannot remove your only active account profile")

        target = db.execute("SELECT id FROM user_accounts WHERE id = ? AND user_id = ?", (account_id, user_id)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="Account profile not found")

        db.execute("DELETE FROM user_accounts WHERE id = ? AND user_id = ?", (account_id, user_id))
        db.commit()

        return get_user_accounts(user_id, db)
