import uuid
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_sample_quick_login():
    response = client.post("/api/v1/auth/login", json={"email": "sample", "password": "sample123"})
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["name"] == "Harshika Thopte"
    assert "token" in data
    assert data["user"]["email"] == "sample@digimirror.local"
    assert len(data["accounts"]) >= 3
    assert any(a["name"] == "Harshika" for a in data["accounts"])


def test_sample_blank_password_quick_login():
    response = client.post("/api/v1/auth/login", json={"email": "sample", "password": ""})
    assert response.status_code == 200
    data = response.json()
    assert "token" in data


def test_signup_and_me_and_accounts():
    email = f"test_{uuid.uuid4().hex[:10]}@example.com"
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": email,
            "password": "secretpassword123",
            "name": "Alex Test",
            "account_name": "Alex Personal",
            "account_label": "Personal account",
            "threat_profile": "everyday",
        },
    )
    assert signup_res.status_code == 200
    auth_data = signup_res.json()
    token = auth_data["token"]
    assert auth_data["user"]["email"] == email
    assert len(auth_data["accounts"]) == 1
    assert auth_data["accounts"][0]["name"] == "Alex Personal"

    # Test /me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["name"] == "Alex Test"

    # Test adding linked account
    create_acct_res = client.post(
        "/api/v1/auth/accounts",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Alex Work",
            "label": "Work account",
            "threat_profile": "financially_sensitive",
        },
    )
    assert create_acct_res.status_code == 200
    accounts = create_acct_res.json()
    assert len(accounts) == 2
    work_acct = next(a for a in accounts if a["name"] == "Alex Work")
    assert work_acct["label"] == "Work account"

    # Test deleting linked account
    del_res = client.delete(
        f"/api/v1/auth/accounts/{work_acct['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200
    assert len(del_res.json()) == 1


def test_login_invalid_password():
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "sample@digimirror.local", "password": "wrongpassword!"},
    )
    assert response.status_code == 401
