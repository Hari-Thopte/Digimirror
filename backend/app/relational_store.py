from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from datetime import datetime, timezone

from .db_models import AccountORM, ActionORM, AnalysisRunORM, AuditLogORM, ExposureTrailORM, FindingORM, SessionLocal, WatcherSnapshotORM, initialize_relational_schema
from .models import ScanResponse

ACCOUNT_HASH_KEY = __import__("os").getenv("DIGIMIRROR_ACCOUNT_HASH_KEY", "dev-only-change-me")


def account_key(account_id: str) -> str:
    return hmac.new(ACCOUNT_HASH_KEY.encode(), account_id.encode(), hashlib.sha256).hexdigest()


def ensure_account(account_id: str, threat_profile: str = "everyday") -> str:
    initialize_relational_schema()
    key = account_key(account_id)
    with SessionLocal() as session:
        if not session.get(AccountORM, key):
            session.add(AccountORM(id=key, threat_profile=threat_profile))
            session.commit()
    return key


def persist_scan(account_id: str, scan: ScanResponse, run_id: str | None = None) -> str:
    key = ensure_account(account_id, scan.threat_profile)
    run_id = run_id or "run_" + secrets.token_hex(16)
    with SessionLocal() as session:
        run = AnalysisRunORM(id=run_id, account_id=key, status="completed", overall_score=scan.overall_score, risk_level=scan.risk_level, import_type=scan.summary.import_type, model_version=scan.model_version, raw_values_stored=False)
        session.add(run)
        for finding in scan.findings:
            evidence = hashlib.sha256((finding.evidence + "|" + "|".join(finding.evidence_sources)).encode()).hexdigest()
            session.add(FindingORM(id=f"{run_id}:{finding.id}", run_id=run_id, field_key=finding.field_key, finding_type=finding.classification, source=finding.origin, severity=finding.severity, confidence_score=finding.confidence_score, evidence_hash=evidence, redacted_preview="[redacted]", metadata_json=json.dumps({"destination": finding.destination, "category": finding.category})))
            session.add(ExposureTrailORM(id=f"{run_id}:{finding.id}:trail", run_id=run_id, finding_id=finding.id, origin=finding.origin, action=finding.action, recipient=finding.destination))
        for action in scan.actions:
            session.add(ActionORM(id=f"{run_id}:{action.id}", run_id=run_id, title=action.title, description=action.description, settings_url=action.settings_url, estimated_reduction=action.estimated_reduction))
        session.add(WatcherSnapshotORM(id="snapshot_" + secrets.token_hex(12), account_id=key, run_id=run_id, score=scan.overall_score))
        session.add(AuditLogORM(account_id=key, event_type="analysis_completed", run_id=run_id, details_json=json.dumps({"finding_count": len(scan.findings), "raw_values_stored": False})))
        session.commit()
    return run_id
