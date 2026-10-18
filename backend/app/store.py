from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import base64
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from .models import (
    CanaryCreateRequest,
    CanaryDetection,
    CanaryMarker,
    ConsentRecord,
    DeleteAccountResponse,
    FindingFeedback,
    QualityMetrics,
    ReceiptPayload,
    ScanResponse,
    SignedPrivacyReceipt,
    TimelineSnapshot,
    TrustSummary,
    WatchEvent,
    WatchStatus,
    AuditEvent,
    PrivacyProof,
)


DATABASE_PATH = Path(
    os.getenv(
        "DIGIMIRROR_DATABASE_PATH",
        Path(__file__).resolve().parents[1] / "data" / "digimirror.db",
    )
)
ACCOUNT_HASH_KEY = os.getenv("DIGIMIRROR_ACCOUNT_HASH_KEY", "dev-only-change-me")
TOKEN_KEY_MATERIAL = os.getenv("DIGIMIRROR_TOKEN_KEY", ACCOUNT_HASH_KEY)
RETENTION_DAYS = int(os.getenv("DIGIMIRROR_RETENTION_DAYS", "90"))
MAX_SCANS_PER_ACCOUNT = int(os.getenv("DIGIMIRROR_MAX_SCANS_PER_ACCOUNT", "50"))


def _connect() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def _account_hash(account_id: str) -> str:
    return hmac.new(
        ACCOUNT_HASH_KEY.encode("utf-8"),
        account_id.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def initialize_store() -> None:
    with _connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                score INTEGER NOT NULL,
                scan_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_snapshots_account
                ON snapshots(account_hash, id DESC);

            CREATE TABLE IF NOT EXISTS watcher_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                event_type TEXT NOT NULL,
                score_before INTEGER,
                score_after INTEGER NOT NULL,
                score_change INTEGER NOT NULL,
                resolved_fields TEXT NOT NULL,
                new_fields TEXT NOT NULL,
                verified_fixes INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_events_account
                ON watcher_events(account_hash, id DESC);

            CREATE TABLE IF NOT EXISTS consents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                purpose TEXT NOT NULL,
                data_categories TEXT NOT NULL,
                granted INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS finding_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                finding_key TEXT NOT NULL,
                verdict TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS oauth_states (
                state_hash TEXT PRIMARY KEY,
                account_hash TEXT NOT NULL,
                provider TEXT NOT NULL,
                code_verifier TEXT NOT NULL,
                redirect_uri TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS oauth_tokens (
                account_hash TEXT NOT NULL,
                provider TEXT NOT NULL,
                encrypted_token BLOB NOT NULL,
                expires_at TEXT,
                updated_at TEXT NOT NULL,
                PRIMARY KEY(account_hash, provider)
            );

            CREATE TABLE IF NOT EXISTS canary_markers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_hash TEXT NOT NULL,
                service TEXT NOT NULL,
                alias_type TEXT NOT NULL,
                encrypted_alias BLOB NOT NULL,
                alias_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_detected_at TEXT,
                detection_count INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_canaries_account
                ON canary_markers(account_hash, id DESC);

            CREATE TABLE IF NOT EXISTS privacy_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                receipt_id TEXT NOT NULL UNIQUE,
                payload_json TEXT NOT NULL,
                signature TEXT NOT NULL,
                public_key TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_receipts_account
                ON privacy_receipts(account_hash, id DESC);

            CREATE TABLE IF NOT EXISTS audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                event_type TEXT NOT NULL,
                files_scanned INTEGER NOT NULL DEFAULT 0,
                finding_count INTEGER NOT NULL DEFAULT 0,
                details TEXT NOT NULL DEFAULT '[]'
            );
            CREATE INDEX IF NOT EXISTS idx_audit_account ON audit_events(account_hash, id DESC);
            """
        )


def _finding_map(scan: ScanResponse) -> dict[str, object]:
    return {
        f"{finding.field_key}|{finding.origin}": finding
        for finding in scan.findings
    }


def _compare(previous: ScanResponse | None, current: ScanResponse) -> dict[str, object]:
    if previous is None:
        return {
            "event_type": "baseline",
            "score_before": None,
            "score_change": 0,
            "resolved_fields": [],
            "new_fields": [finding.field for finding in current.findings],
            "verified_fixes": 0,
        }
    before, after = _finding_map(previous), _finding_map(current)
    resolved = [before[key].field for key in before.keys() - after.keys()]
    added = [after[key].field for key in after.keys() - before.keys()]
    reduced = [
        after[key].field
        for key in before.keys() & after.keys()
        if after[key].score < before[key].score
    ]
    score_change = previous.overall_score - current.overall_score
    event_type = "improved" if score_change > 0 else "worsened" if score_change < 0 else "unchanged"
    return {
        "event_type": event_type,
        "score_before": previous.overall_score,
        "score_change": score_change,
        "resolved_fields": resolved,
        "new_fields": added,
        "verified_fixes": len(resolved) + len(reduced),
    }


def _row_to_event(row: sqlite3.Row) -> WatchEvent:
    return WatchEvent(
        id=row["id"],
        created_at=row["created_at"],
        event_type=row["event_type"],
        score_before=row["score_before"],
        score_after=row["score_after"],
        score_change=row["score_change"],
        resolved_fields=json.loads(row["resolved_fields"]),
        new_fields=json.loads(row["new_fields"]),
        verified_fixes=row["verified_fixes"],
    )


def save_snapshot(account_id: str, scan: ScanResponse) -> WatchEvent:
    account_hash = _account_hash(account_id)
    created_at = _now()
    with _connect() as db:
        previous_row = db.execute(
            "SELECT scan_json FROM snapshots WHERE account_hash = ? ORDER BY id DESC LIMIT 1",
            (account_hash,),
        ).fetchone()
        previous = ScanResponse.model_validate_json(previous_row["scan_json"]) if previous_row else None
        comparison = _compare(previous, scan)
        db.execute(
            "INSERT INTO snapshots(account_hash, created_at, score, scan_json) VALUES (?, ?, ?, ?)",
            (account_hash, created_at, scan.overall_score, scan.model_dump_json()),
        )
        cursor = db.execute(
            """
            INSERT INTO watcher_events(
                account_hash, created_at, event_type, score_before, score_after,
                score_change, resolved_fields, new_fields, verified_fixes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                account_hash,
                created_at,
                comparison["event_type"],
                comparison["score_before"],
                scan.overall_score,
                comparison["score_change"],
                json.dumps(comparison["resolved_fields"]),
                json.dumps(comparison["new_fields"]),
                comparison["verified_fixes"],
            ),
        )
        cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
        db.execute("DELETE FROM snapshots WHERE account_hash = ? AND created_at < ?", (account_hash, cutoff))
        db.execute("DELETE FROM watcher_events WHERE account_hash = ? AND created_at < ?", (account_hash, cutoff))
        db.execute(
            """
            DELETE FROM snapshots WHERE account_hash = ? AND id NOT IN (
                SELECT id FROM snapshots WHERE account_hash = ? ORDER BY id DESC LIMIT ?
            )
            """,
            (account_hash, account_hash, MAX_SCANS_PER_ACCOUNT),
        )
        db.execute(
            """
            DELETE FROM watcher_events WHERE account_hash = ? AND id NOT IN (
                SELECT id FROM watcher_events WHERE account_hash = ? ORDER BY id DESC LIMIT ?
            )
            """,
            (account_hash, account_hash, MAX_SCANS_PER_ACCOUNT),
        )
        event_row = db.execute("SELECT * FROM watcher_events WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _row_to_event(event_row)


def get_watch_status(account_id: str) -> WatchStatus:
    account_hash = _account_hash(account_id)
    with _connect() as db:
        snapshot = db.execute(
            "SELECT score, created_at FROM snapshots WHERE account_hash = ? ORDER BY id DESC LIMIT 1",
            (account_hash,),
        ).fetchone()
        scan_count = db.execute("SELECT COUNT(*) AS count FROM snapshots WHERE account_hash = ?", (account_hash,)).fetchone()["count"]
        rows = db.execute("SELECT * FROM watcher_events WHERE account_hash = ? ORDER BY id DESC LIMIT 20", (account_hash,)).fetchall()
    return WatchStatus(
        account_id=account_id,
        active=scan_count > 0,
        scan_count=scan_count,
        latest_score=snapshot["score"] if snapshot else None,
        latest_scan_at=snapshot["created_at"] if snapshot else None,
        events=[_row_to_event(row) for row in rows],
    )


def record_consent(consent: ConsentRecord) -> ConsentRecord:
    created_at = _now()
    with _connect() as db:
        cursor = db.execute(
            "INSERT INTO consents(account_hash, created_at, purpose, data_categories, granted) VALUES (?, ?, ?, ?, ?)",
            (_account_hash(consent.account_id), created_at, consent.purpose, json.dumps(consent.data_categories), int(consent.granted)),
        )
    return consent.model_copy(update={"id": cursor.lastrowid, "created_at": created_at})


def list_consents(account_id: str) -> list[ConsentRecord]:
    with _connect() as db:
        rows = db.execute("SELECT * FROM consents WHERE account_hash = ? ORDER BY id DESC", (_account_hash(account_id),)).fetchall()
    return [ConsentRecord(id=row["id"], account_id=account_id, purpose=row["purpose"], data_categories=json.loads(row["data_categories"]), granted=bool(row["granted"]), created_at=row["created_at"]) for row in rows]


def record_feedback(feedback: FindingFeedback) -> None:
    with _connect() as db:
        db.execute(
            "INSERT INTO finding_feedback(account_hash, created_at, finding_key, verdict) VALUES (?, ?, ?, ?)",
            (_account_hash(feedback.account_id), _now(), feedback.finding_key, feedback.verdict),
        )


def quality_metrics(account_id: str) -> QualityMetrics:
    account_hash = _account_hash(account_id)
    with _connect() as db:
        snapshot = db.execute("SELECT COUNT(*) AS count, COALESCE(AVG(score), 0) AS average FROM snapshots WHERE account_hash = ?", (account_hash,)).fetchone()
        latest = db.execute("SELECT score FROM snapshots WHERE account_hash = ? ORDER BY id DESC LIMIT 1", (account_hash,)).fetchone()
        verified = db.execute("SELECT COALESCE(SUM(verified_fixes), 0) AS total FROM watcher_events WHERE account_hash = ?", (account_hash,)).fetchone()["total"]
        feedback_rows = db.execute("SELECT verdict, COUNT(*) AS count FROM finding_feedback WHERE account_hash = ? GROUP BY verdict", (account_hash,)).fetchall()
    feedback = {row["verdict"]: row["count"] for row in feedback_rows}
    feedback_total = sum(feedback.values())
    decided = feedback.get("accurate", 0) + feedback.get("false_positive", 0)
    accuracy = round(feedback.get("accurate", 0) / decided * 100, 1) if decided else None
    return QualityMetrics(account_id=account_id, scan_count=snapshot["count"], average_score=round(snapshot["average"], 1), latest_score=latest["score"] if latest else None, total_verified_fixes=verified, finding_feedback_count=feedback_total, confirmed_accuracy_rate=accuracy)


def trust_summary(account_id: str) -> TrustSummary:
    account_hash = _account_hash(account_id)
    with _connect() as db:
        counts = {
            table: db.execute(f"SELECT COUNT(*) AS count FROM {table} WHERE account_hash = ?", (account_hash,)).fetchone()["count"]
            for table in ("snapshots", "watcher_events", "consents", "finding_feedback", "canary_markers", "privacy_receipts", "audit_events")
        }
    return TrustSummary(account_id=account_id, derived_snapshots=counts["snapshots"], watcher_events=counts["watcher_events"], consent_records=counts["consents"], feedback_records=counts["finding_feedback"], canary_markers=counts["canary_markers"], privacy_receipts=counts["privacy_receipts"], audit_events=counts["audit_events"], data_retention=f"Snapshots: up to {RETENTION_DAYS} days or {MAX_SCANS_PER_ACCOUNT} records")


def record_audit(account_id: str, event_type: str, files_scanned: int = 0, finding_count: int = 0, details: list[str] | None = None) -> AuditEvent:
    with _connect() as db:
        cursor = db.execute("INSERT INTO audit_events(account_hash, created_at, event_type, files_scanned, finding_count, details) VALUES (?, ?, ?, ?, ?, ?)", (_account_hash(account_id), _now(), event_type, files_scanned, finding_count, json.dumps(details or [])[:2000]))
        row = db.execute("SELECT * FROM audit_events WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return AuditEvent(id=row["id"], created_at=row["created_at"], event_type=row["event_type"], files_scanned=row["files_scanned"], finding_count=row["finding_count"], details=json.loads(row["details"]))


def list_audit(account_id: str) -> list[AuditEvent]:
    with _connect() as db:
        rows = db.execute("SELECT * FROM audit_events WHERE account_hash = ? ORDER BY id DESC LIMIT 100", (_account_hash(account_id),)).fetchall()
    return [AuditEvent(id=row["id"], created_at=row["created_at"], event_type=row["event_type"], files_scanned=row["files_scanned"], finding_count=row["finding_count"], details=json.loads(row["details"])) for row in rows]


def create_risk_proof(account_id: str, threshold: int) -> PrivacyProof:
    account_hash = _account_hash(account_id)
    with _connect() as db:
        row = db.execute("SELECT score, created_at, scan_json FROM snapshots WHERE account_hash = ? ORDER BY id DESC LIMIT 1", (account_hash,)).fetchone()
    if not row:
        raise LookupError("Create a monitoring snapshot before generating a proof")
    if row["score"] > threshold:
        raise ValueError("The latest score is above the requested threshold")
    issued = _now()
    commitment = hashlib.sha256((account_hash + row["scan_json"] + issued).encode("utf-8")).hexdigest()
    claim = "risk_score_below_threshold"
    message = f"{claim}|{threshold}|{commitment}".encode("utf-8")
    signature = hmac.new(ACCOUNT_HASH_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return PrivacyProof(claim=claim, threshold=threshold, commitment=commitment, proof=signature, issued_at=issued)


def verify_risk_proof(proof: PrivacyProof) -> bool:
    message = f"{proof.claim}|{proof.threshold}|{proof.commitment}".encode("utf-8")
    expected = hmac.new(ACCOUNT_HASH_KEY.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, proof.proof)


def delete_account_data(account_id: str) -> DeleteAccountResponse:
    account_hash = _account_hash(account_id)
    deleted: dict[str, int] = {}
    with _connect() as db:
        for table in (
            "snapshots",
            "watcher_events",
            "consents",
            "finding_feedback",
            "oauth_states",
            "oauth_tokens",
            "canary_markers",
            "privacy_receipts",
            "audit_events",
        ):
            cursor = db.execute(f"DELETE FROM {table} WHERE account_hash = ?", (account_hash,))
            deleted[table] = cursor.rowcount
    return DeleteAccountResponse(account_id=account_id, deleted=deleted)


def save_oauth_state(account_id: str, provider: str, state: str, verifier: str, redirect_uri: str, expires_at: str) -> None:
    with _connect() as db:
        db.execute(
            "INSERT OR REPLACE INTO oauth_states(state_hash, account_hash, provider, code_verifier, redirect_uri, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
            (hashlib.sha256(state.encode()).hexdigest(), _account_hash(account_id), provider, verifier, redirect_uri, expires_at),
        )


def _token_cipher() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(TOKEN_KEY_MATERIAL.encode("utf-8")).digest())
    return Fernet(key)


def store_oauth_token(account_id: str, provider: str, token_payload: dict[str, object], expires_at: str | None = None) -> None:
    encrypted = _token_cipher().encrypt(json.dumps(token_payload).encode("utf-8"))
    with _connect() as db:
        db.execute(
            """
            INSERT INTO oauth_tokens(account_hash, provider, encrypted_token, expires_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(account_hash, provider) DO UPDATE SET
                encrypted_token = excluded.encrypted_token,
                expires_at = excluded.expires_at,
                updated_at = excluded.updated_at
            """,
            (_account_hash(account_id), provider, encrypted, expires_at, _now()),
        )


def load_oauth_token(account_id: str, provider: str) -> dict[str, object] | None:
    with _connect() as db:
        row = db.execute(
            "SELECT encrypted_token FROM oauth_tokens WHERE account_hash = ? AND provider = ?",
            (_account_hash(account_id), provider),
        ).fetchone()
    if not row:
        return None
    try:
        return json.loads(_token_cipher().decrypt(row["encrypted_token"]).decode("utf-8"))
    except (InvalidToken, json.JSONDecodeError):
        return None


def get_timeline(account_id: str) -> list[TimelineSnapshot]:
    with _connect() as db:
        rows = db.execute(
            "SELECT id, created_at, scan_json FROM snapshots WHERE account_hash = ? ORDER BY id ASC",
            (_account_hash(account_id),),
        ).fetchall()
    timeline: list[TimelineSnapshot] = []
    for row in rows:
        scan = ScanResponse.model_validate_json(row["scan_json"])
        timeline.append(
            TimelineSnapshot(
                id=row["id"],
                created_at=row["created_at"],
                score=scan.overall_score,
                risk_level=scan.risk_level,
                threat_profile=scan.threat_profile,
                categories={category.name: category.score for category in scan.categories},
                fields={finding.field: finding.score for finding in scan.findings},
            )
        )
    return timeline


def _receipt_private_key() -> Ed25519PrivateKey:
    material = os.getenv("DIGIMIRROR_RECEIPT_SIGNING_KEY", TOKEN_KEY_MATERIAL)
    return Ed25519PrivateKey.from_private_bytes(hashlib.sha256(material.encode("utf-8")).digest())


def _canonical_receipt_payload(payload: ReceiptPayload) -> bytes:
    return json.dumps(
        payload.model_dump(mode="json"),
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _signed_receipt(payload: ReceiptPayload) -> SignedPrivacyReceipt:
    private_key = _receipt_private_key()
    signature = base64.urlsafe_b64encode(private_key.sign(_canonical_receipt_payload(payload))).decode("ascii")
    public_key = base64.urlsafe_b64encode(
        private_key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
    ).decode("ascii")
    return SignedPrivacyReceipt(payload=payload, signature=signature, public_key=public_key)


def create_privacy_receipt(account_id: str) -> SignedPrivacyReceipt:
    account_hash = _account_hash(account_id)
    with _connect() as db:
        snapshot = db.execute(
            "SELECT id, created_at, scan_json FROM snapshots WHERE account_hash = ? ORDER BY id DESC LIMIT 1",
            (account_hash,),
        ).fetchone()
        event = db.execute(
            "SELECT verified_fixes, resolved_fields FROM watcher_events WHERE account_hash = ? ORDER BY id DESC LIMIT 1",
            (account_hash,),
        ).fetchone()
    if not snapshot:
        raise LookupError("Create a monitoring snapshot before generating a receipt")
    scan = ScanResponse.model_validate_json(snapshot["scan_json"])
    issued_at = _now()
    fingerprint_source = [
        {"field": finding.field_key, "score": finding.score}
        for finding in sorted(scan.findings, key=lambda finding: (finding.field_key, finding.score))
    ]
    fingerprint = hashlib.sha256(
        json.dumps(fingerprint_source, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    receipt_id = "dmr_" + hashlib.sha256(
        f"{account_hash}:{snapshot['id']}:{issued_at}".encode("utf-8")
    ).hexdigest()[:20]
    payload = ReceiptPayload(
        receipt_id=receipt_id,
        issued_at=issued_at,
        snapshot_at=snapshot["created_at"],
        score=scan.overall_score,
        risk_level=scan.risk_level,
        model_version=scan.model_version,
        threat_profile=scan.threat_profile,
        import_type=scan.summary.import_type,
        finding_count=len(scan.findings),
        verified_fixes=event["verified_fixes"] if event else 0,
        resolved_fields=json.loads(event["resolved_fields"]) if event else [],
        findings_fingerprint=fingerprint,
    )
    receipt = _signed_receipt(payload)
    with _connect() as db:
        db.execute(
            "INSERT INTO privacy_receipts(account_hash, created_at, receipt_id, payload_json, signature, public_key) VALUES (?, ?, ?, ?, ?, ?)",
            (account_hash, issued_at, receipt_id, payload.model_dump_json(), receipt.signature, receipt.public_key),
        )
    return receipt


def list_privacy_receipts(account_id: str) -> list[SignedPrivacyReceipt]:
    with _connect() as db:
        rows = db.execute(
            "SELECT payload_json, signature, public_key FROM privacy_receipts WHERE account_hash = ? ORDER BY id DESC LIMIT 20",
            (_account_hash(account_id),),
        ).fetchall()
    return [
        SignedPrivacyReceipt(
            payload=ReceiptPayload.model_validate_json(row["payload_json"]),
            signature=row["signature"],
            public_key=row["public_key"],
        )
        for row in rows
    ]


def verify_privacy_receipt(receipt: SignedPrivacyReceipt) -> bool:
    expected_public = _signed_receipt(receipt.payload).public_key
    if not hmac.compare_digest(receipt.public_key, expected_public):
        return False
    try:
        Ed25519PublicKey.from_public_bytes(base64.urlsafe_b64decode(receipt.public_key)).verify(
            base64.urlsafe_b64decode(receipt.signature),
            _canonical_receipt_payload(receipt.payload),
        )
        return True
    except (InvalidSignature, ValueError):
        return False


def _mask_canary(alias: str, alias_type: str) -> str:
    if alias_type == "email":
        local, domain = alias.split("@", 1)
        return f"{local[:5]}…@{domain}"
    return f"{alias[:5]}…{alias[-3:]}"


def _row_to_canary(row: sqlite3.Row, *, reveal: bool = False) -> CanaryMarker:
    alias = _token_cipher().decrypt(row["encrypted_alias"]).decode("utf-8")
    return CanaryMarker(
        id=row["id"],
        service=row["service"],
        alias_type=row["alias_type"],
        masked_alias=_mask_canary(alias, row["alias_type"]),
        alias=alias if reveal else None,
        created_at=row["created_at"],
        last_detected_at=row["last_detected_at"],
        detection_count=row["detection_count"],
    )


def create_canary_marker(request: CanaryCreateRequest) -> CanaryMarker:
    service = re.sub(r"[^a-z0-9]+", "-", request.service.casefold()).strip("-")[:32] or "service"
    token = secrets.token_hex(4)
    alias = (
        f"dm-{service}-{token}@canary.invalid"
        if request.alias_type == "email"
        else f"dm_{service}_{token}"
    )
    encrypted = _token_cipher().encrypt(alias.encode("utf-8"))
    alias_hash = hmac.new(ACCOUNT_HASH_KEY.encode("utf-8"), alias.encode("utf-8"), hashlib.sha256).hexdigest()
    created_at = _now()
    with _connect() as db:
        cursor = db.execute(
            "INSERT INTO canary_markers(account_hash, service, alias_type, encrypted_alias, alias_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (_account_hash(request.account_id), request.service.strip(), request.alias_type, encrypted, alias_hash, created_at),
        )
        row = db.execute("SELECT * FROM canary_markers WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return _row_to_canary(row, reveal=True)


def list_canary_markers(account_id: str) -> list[CanaryMarker]:
    with _connect() as db:
        rows = db.execute(
            "SELECT * FROM canary_markers WHERE account_hash = ? ORDER BY id DESC",
            (_account_hash(account_id),),
        ).fetchall()
    return [_row_to_canary(row) for row in rows]


def detect_canary_markers(account_id: str, fragments: list[str]) -> CanaryDetection:
    account_hash = _account_hash(account_id)
    haystack = "\n".join(fragments).casefold()
    detected: list[CanaryMarker] = []
    with _connect() as db:
        rows = db.execute(
            "SELECT * FROM canary_markers WHERE account_hash = ? ORDER BY id DESC",
            (account_hash,),
        ).fetchall()
        for row in rows:
            alias = _token_cipher().decrypt(row["encrypted_alias"]).decode("utf-8")
            if alias.casefold() not in haystack:
                continue
            now = _now()
            db.execute(
                "UPDATE canary_markers SET last_detected_at = ?, detection_count = detection_count + 1 WHERE id = ?",
                (now, row["id"]),
            )
            updated = db.execute("SELECT * FROM canary_markers WHERE id = ?", (row["id"],)).fetchone()
            detected.append(_row_to_canary(updated))
    return CanaryDetection(checked_markers=len(rows), detected=detected)


initialize_store()
