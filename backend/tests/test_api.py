from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import store
from backend.app.main import app


client = TestClient(app)


SAMPLE_ITEMS = [
    {
        "field": "phone",
        "source": "Instagram profile + contacts",
        "visibility": "public",
        "action": "Enabled contact syncing during signup",
        "recipients": ["Profile visitors", "Contact matching"],
        "permission_status": "enabled",
        "value": "+91-99999-00000",
    },
    {
        "field": "location",
        "source": "Google Maps",
        "visibility": "shared",
        "action": "Allowed location access all the time",
        "recipients": ["Location history", "Ad personalization"],
        "permission_status": "enabled",
        "value": "A raw address that must never be returned",
    },
]


@pytest.fixture
def isolated_store(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DATABASE_PATH", tmp_path / "digimirror-test.db")
    store.initialize_store()
    return tmp_path


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers["cache-control"] == "no-store"


def test_json_import_scores_and_redacts_raw_values() -> None:
    payload = json.dumps({"export_version": 1, "items": SAMPLE_ITEMS})
    response = client.post(
        "/api/v1/scan/import",
        files={"file": ("privacy.json", payload, "application/json")},
    )

    assert response.status_code == 200
    body = response.json()
    serialized = response.text
    assert body["summary"]["processed_in_memory"] is True
    assert body["summary"]["raw_values_stored"] is False
    assert body["summary"]["exposed_fields"] == 2
    assert body["findings"][0]["score"] >= body["findings"][1]["score"]
    assert "+91-99999-00000" not in serialized
    assert "A raw address that must never be returned" not in serialized


def test_normalized_metadata_redacts_embedded_personal_values() -> None:
    payload = {
        "items": [
            {
                "field": "person@example.com",
                "source": "Account for person@example.com",
                "visibility": "shared",
                "action": "Shared from +91 99999 00000",
                "recipients": ["https://example.com/profile?user=person", "12.971599, 77.594566"],
            }
        ]
    }
    response = client.post(
        "/api/v1/scan/import",
        files={"file": ("privacy.json", json.dumps(payload), "application/json")},
    )
    assert response.status_code == 200
    serialized = response.text
    assert response.json()["findings"][0]["field_key"] == "email_address"
    assert "person@example.com" not in serialized
    assert "+91 99999 00000" not in serialized
    assert "12.971599" not in serialized
    assert "example.com/profile" not in serialized


def test_csv_import() -> None:
    csv_text = (
        "field,source,visibility,action,recipients,permission_status\n"
        "email,Google,shared,Used Continue with Google,ShopCart;Soundwave,enabled\n"
    )
    response = client.post(
        "/api/v1/scan/import",
        files={"file": ("privacy.csv", csv_text, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["findings"][0]["field_key"] == "email_address"
    assert body["summary"]["source_count"] == 1


def test_rejects_unsupported_file_type() -> None:
    response = client.post(
        "/api/v1/scan/import",
        files={"file": ("privacy.txt", "not accepted", "text/plain")},
    )
    assert response.status_code == 415


def test_rejects_oversized_upload() -> None:
    response = client.post(
        "/api/v1/scan/import",
        files={"file": ("privacy.json", b"x" * (2 * 1024 * 1024 + 1), "application/json")},
    )
    assert response.status_code == 413


def test_sensitive_scan_returns_derived_findings_only() -> None:
    payload = b'''{"email":"person@example.com","phone":"+91 99999 00000","password":"not-a-real-secret-123"}'''
    response = client.post(
        "/api/v1/scan/sensitive",
        files={"file": ("privacy.json", payload, "application/json")},
    )
    assert response.status_code == 200
    body = response.json()
    assert {finding["type"] for finding in body["findings"]} == {"email", "phone", "secret"}
    assert body["raw_values_stored"] is False
    assert body["processed_in_memory"] is True
    assert "person@example.com" not in response.text
    assert "99999" not in response.text
    assert "not-a-real-secret" not in response.text


def test_sensitive_scan_rejects_unsafe_archive_member() -> None:
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w") as archive:
        archive.writestr("../secret.txt", "person@example.com")
    response = client.post(
        "/api/v1/scan/sensitive",
        files={"file": ("privacy.zip", archive_buffer.getvalue(), "application/zip")},
    )
    assert response.status_code == 415


def test_sensitive_scan_expands_metadata_and_compares_previous_export() -> None:
    before = b'{"email":"person@example.com","scope":"contacts location offline","ua":"Mozilla/5.0 Chrome/120","coords":"12.9716, 77.5946","card":"4111 1111 1111 1111"}'
    after = b'{"email":"person@example.com","scope":"contacts","ua":"Mozilla/5.0 Chrome/120"}'
    response = client.post(
        "/api/v1/scan/sensitive",
        data={"account_id": "expanded-test"},
        files={"file": ("before.json", before, "application/json"), "previous_file": ("after.json", after, "application/json")},
    )
    assert response.status_code == 200
    body = response.json()
    types = {finding["type"] for finding in body["findings"]}
    assert {"location", "device", "financial", "permission"}.issubset(types)
    assert body["analysis"]["delta_summary"]
    assert body["analysis"]["permission_drift"]
    audit = client.get("/api/v1/trust/expanded-test/audit")
    assert audit.status_code == 200
    assert audit.json()[0]["event_type"] == "analysis"


def test_playbooks_and_threshold_proof(isolated_store) -> None:
    scan = client.post(
        "/api/v1/scan/import",
        files={"file": ("privacy.json", json.dumps({"items": [{"field": "email", "source": "Google", "visibility": "stored"}]}), "application/json")},
    ).json()
    client.post("/api/v1/watcher/snapshots", json={"account_id": "proof-test", "scan": scan})
    playbooks = client.get("/api/v1/playbooks")
    assert playbooks.status_code == 200
    assert len(playbooks.json()) >= 3
    proof = client.post("/api/v1/trust/proof-test/risk-proof", data={"threshold": 100})
    assert proof.status_code == 200
    verified = client.post("/api/v1/trust/risk-proof/verify", json=proof.json())
    assert verified.json()["valid"] is True


def test_google_takeout_zip_adapter_adds_provenance_and_confidence() -> None:
    archive = Path("sample-data/google-takeout-before.zip").read_bytes()
    response = client.post(
        "/api/v1/scan/import",
        files={"file": ("takeout.zip", archive, "application/zip")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["import_type"] == "google_takeout"
    assert body["summary"]["adapter_version"] == "google-takeout-v1"
    assert body["summary"]["processed_files"] == 4
    assert body["summary"]["exposed_fields"] >= 6
    assert all(finding["confidence"] == "high" for finding in body["findings"])
    assert all(finding["evidence_sources"] for finding in body["findings"])
    assert "demo@example.com" not in response.text
    assert "https://example.com/store" not in response.text


def test_takeout_rescan_produces_lower_score_and_resolves_findings() -> None:
    before = client.post(
        "/api/v1/scan/import",
        files={
            "file": (
                "takeout-before.zip",
                Path("sample-data/google-takeout-before.zip").read_bytes(),
                "application/zip",
            )
        },
    ).json()
    after = client.post(
        "/api/v1/scan/import",
        files={
            "file": (
                "takeout-after.zip",
                Path("sample-data/google-takeout-after.zip").read_bytes(),
                "application/zip",
            )
        },
    ).json()

    assert after["overall_score"] < before["overall_score"]
    assert after["summary"]["exposed_fields"] < before["summary"]["exposed_fields"]


def test_takeout_rejects_path_traversal() -> None:
    archive_buffer = io.BytesIO()
    with zipfile.ZipFile(archive_buffer, "w") as archive:
        archive.writestr("../Chrome/BrowserHistory.json", '{"Browser History": []}')

    response = client.post(
        "/api/v1/scan/import",
        files={"file": ("takeout.zip", archive_buffer.getvalue(), "application/zip")},
    )
    assert response.status_code == 415


@pytest.mark.parametrize(
    ("archive_name", "expected_type"),
    [
        ("instagram-export.zip", "instagram_export"),
        ("spotify-export.zip", "spotify_export"),
        ("commerce-export.zip", "commerce_export"),
    ],
)
def test_additional_platform_adapters(archive_name: str, expected_type: str) -> None:
    response = client.post(
        "/api/v1/scan/import",
        files={
            "file": (
                archive_name,
                Path("sample-data", archive_name).read_bytes(),
                "application/zip",
            )
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["import_type"] == expected_type
    assert body["findings"]
    assert body["quality"]["average_confidence"] >= 80


def test_personalized_risk_graph_and_closed_loop_actions() -> None:
    archive = Path("sample-data/google-takeout-before.zip").read_bytes()
    everyday = client.post(
        "/api/v1/scan/import",
        data={"threat_profile": "everyday"},
        files={"file": ("takeout.zip", archive, "application/zip")},
    ).json()
    public_figure = client.post(
        "/api/v1/scan/import",
        data={"threat_profile": "public_figure"},
        files={"file": ("takeout.zip", archive, "application/zip")},
    ).json()

    assert public_figure["overall_score"] >= everyday["overall_score"]
    assert public_figure["risk_explanation"]
    assert everyday["graph"]["nodes"]
    assert everyday["graph"]["edges"]
    assert all(action["steps"] for action in everyday["actions"])
    assert all(action["settings_url"] for action in everyday["actions"])
    assert all(action["verification_field_key"] for action in everyday["actions"])
    assert everyday["completeness"]["score"] >= 0
    assert everyday["completeness"]["observed_signals"]


def test_watcher_trust_metrics_and_deletion(isolated_store) -> None:
    before = client.post(
        "/api/v1/scan/import",
        files={"file": ("before.zip", Path("sample-data/google-takeout-before.zip").read_bytes(), "application/zip")},
    ).json()
    after = client.post(
        "/api/v1/scan/import",
        files={"file": ("after.zip", Path("sample-data/google-takeout-after.zip").read_bytes(), "application/zip")},
    ).json()

    baseline = client.post("/api/v1/watcher/snapshots", json={"account_id": "test-account", "scan": before})
    improved = client.post("/api/v1/watcher/snapshots", json={"account_id": "test-account", "scan": after})
    assert baseline.status_code == 200
    assert baseline.json()["event_type"] == "baseline"
    assert improved.json()["event_type"] == "improved"
    assert improved.json()["verified_fixes"] > 0

    consent = client.post(
        "/api/v1/trust/consents",
        json={"account_id": "test-account", "purpose": "Analyze privacy export", "data_categories": ["account metadata"], "granted": True},
    )
    assert consent.status_code == 200
    feedback = client.post(
        "/api/v1/quality/feedback",
        json={"account_id": "test-account", "finding_key": "browsing_interests|Chrome", "verdict": "accurate"},
    )
    assert feedback.status_code == 204

    status = client.get("/api/v1/watcher/test-account").json()
    metrics = client.get("/api/v1/quality/test-account").json()
    trust = client.get("/api/v1/trust/test-account").json()
    assert status["scan_count"] == 2
    assert metrics["total_verified_fixes"] > 0
    assert metrics["confirmed_accuracy_rate"] == 100
    assert trust["raw_values_stored"] is False

    deleted = client.delete("/api/v1/trust/test-account")
    assert deleted.status_code == 200
    assert deleted.json()["deleted"]["snapshots"] == 2


def test_connector_manifests_and_encrypted_token_vault(isolated_store, monkeypatch) -> None:
    monkeypatch.delenv("DIGIMIRROR_GOOGLE_CLIENT_ID", raising=False)
    manifests = client.get("/api/v1/connectors")
    assert manifests.status_code == 200
    google = next(item for item in manifests.json() if item["id"] == "google")
    assert google["configured"] is False
    assert google["requires_provider_approval"] is True

    authorization = client.post(
        "/api/v1/connectors/google/authorize",
        json={"account_id": "test-account", "redirect_uri": "http://127.0.0.1:5173/oauth/callback"},
    )
    assert authorization.status_code == 503

    store.store_oauth_token("test-account", "google", {"access_token": "secret"})
    assert store.load_oauth_token("test-account", "google") == {"access_token": "secret"}
    database_bytes = store.DATABASE_PATH.read_bytes()
    assert b"secret" not in database_bytes
    deleted = client.delete("/api/v1/trust/test-account")
    assert deleted.status_code == 200
    assert deleted.json()["deleted"]["oauth_tokens"] == 1
    assert store.load_oauth_token("test-account", "google") is None


def test_timeline_and_signed_privacy_receipt(isolated_store) -> None:
    before = client.post(
        "/api/v1/scan/import",
        files={"file": ("before.zip", Path("sample-data/google-takeout-before.zip").read_bytes(), "application/zip")},
    ).json()
    after = client.post(
        "/api/v1/scan/import",
        files={"file": ("after.zip", Path("sample-data/google-takeout-after.zip").read_bytes(), "application/zip")},
    ).json()
    client.post("/api/v1/watcher/snapshots", json={"account_id": "receipt-account", "scan": before})
    client.post("/api/v1/watcher/snapshots", json={"account_id": "receipt-account", "scan": after})

    timeline = client.get("/api/v1/timeline/receipt-account")
    assert timeline.status_code == 200
    assert len(timeline.json()) == 2
    assert timeline.json()[0]["score"] > timeline.json()[1]["score"]

    response = client.post("/api/v1/receipts/receipt-account")
    assert response.status_code == 200
    receipt = response.json()
    assert receipt["payload"]["raw_values_included"] is False
    assert receipt["payload"]["verified_fixes"] > 0
    assert receipt["algorithm"] == "Ed25519"
    verified = client.post("/api/v1/receipts/verification/check", json=receipt)
    assert verified.status_code == 200
    assert verified.json()["valid"] is True

    receipt["payload"]["score"] += 1
    tampered = client.post("/api/v1/receipts/verification/check", json=receipt)
    assert tampered.status_code == 200
    assert tampered.json()["valid"] is False


def test_encrypted_canary_creation_and_detection(isolated_store) -> None:
    created = client.post(
        "/api/v1/canaries",
        json={"account_id": "canary-account", "service": "Demo Social", "alias_type": "email"},
    )
    assert created.status_code == 200
    marker = created.json()
    assert marker["alias"].endswith("@canary.invalid")
    assert marker["alias"].encode() not in store.DATABASE_PATH.read_bytes()

    payload = json.dumps({"profile": {"contact": marker["alias"]}})
    detected = client.post(
        "/api/v1/canaries/detect",
        data={"account_id": "canary-account"},
        files={"file": ("export.json", payload, "application/json")},
    )
    assert detected.status_code == 200
    assert detected.json()["detected"][0]["service"] == "Demo Social"
    assert detected.json()["detected"][0]["alias"] is None
    listed = client.get("/api/v1/canaries/canary-account").json()
    assert listed[0]["detection_count"] == 1
    assert listed[0]["alias"] is None


def test_gpc_agent_blocks_private_network_targets() -> None:
    response = client.post("/api/v1/gpc/check", json={"url": "https://127.0.0.1"})
    assert response.status_code == 400
    assert "private network" in response.json()["detail"].lower()


def test_email_breach_lookup_free_osint_fallback(monkeypatch) -> None:
    monkeypatch.delenv("HIBP_API_KEY", raising=False)
    response = client.post("/api/v1/breach/email", json={"email": "safe_random_user_test_9999@example.com"})
    assert response.status_code == 200
    data = response.json()
    assert data["api_key_configured"] is True
    assert data["severity"] in ("clean", "low", "medium", "high", "critical", "unknown")
    assert isinstance(data["breaches"], list)

