from __future__ import annotations

import os
import secrets
from pathlib import Path

import httpx
from fastapi import FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .connectors import begin_authorization, connector_manifests
from .gpc import check_gpc_support
from .importer import (
    MAX_ZIP_UPLOAD_BYTES,
    PrivacyImportError,
    extract_searchable_fragments,
    import_privacy_file,
)
from .models import (
    CanaryCreateRequest,
    CanaryDetection,
    CanaryMarker,
    ConnectorAuthorizationRequest,
    ConnectorAuthorizationResponse,
    ConnectorManifest,
    ConsentRecord,
    DeleteAccountResponse,
    FindingFeedback,
    GpcCheckRequest,
    GpcCheckResult,
    LeakScanRequest,
    LeakScanResponse,
    QualityMetrics,
    ReceiptVerification,
    ScanResponse,
    SensitiveScanResponse,
    SignedPrivacyReceipt,
    TimelineSnapshot,
    ThreatProfile,
    TrustSummary,
    WatchEvent,
    WatchSnapshotRequest,
    WatchStatus,
    AuditEvent,
    PrivacyProof,
    Playbook,
    AnonymousAccount,
    BreachScanRequest,
    BreachScanResponse,
    PhoneIntelRequest,
    PhoneIntelResponse,
    FootprintScanRequest,
    FootprintScanResponse,
)
from .risk_engine import analyze_export, risk_model_description
from .sensitive_scanner import MAX_SCAN_BYTES, scan_sensitive_file, scan_sensitive_stream
from .web_leak_scanner import run_leak_scan
from .breach_intel import (
    check_email_breach,
    analyze_phone_number,
    scan_digital_footprint,
)
from .store import (
    create_canary_marker,
    create_privacy_receipt,
    delete_account_data,
    detect_canary_markers,
    get_timeline,
    get_watch_status,
    list_canary_markers,
    list_consents,
    list_privacy_receipts,
    quality_metrics,
    record_consent,
    record_feedback,
    save_snapshot,
    trust_summary,
    verify_privacy_receipt,
    list_audit,
    record_audit,
    create_risk_proof,
    verify_risk_proof,
)


MAX_REQUEST_BYTES = 27 * 1024 * 1024
MAX_STREAM_REQUEST_BYTES = 5 * 1024 * 1024 * 1024


def _allowed_origins() -> list[str]:
    configured = os.getenv("DIGIMIRROR_ALLOWED_ORIGINS", "")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ]


app = FastAPI(
    title="DigiMirror Privacy API",
    version="0.3.0",
    description=(
        "Privacy-safe export analysis, explainable scoring, derived snapshot monitoring, "
        "trust controls, signed receipts, canary detection, GPC inspection, and OAuth-ready connector manifests."
    ),
)

from .auth import ensure_sample_user, router as auth_router

try:
    ensure_sample_user()
except Exception:
    pass

try:
    from .db_models import initialize_relational_schema
    initialize_relational_schema()
except Exception:
    pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Accept", "Content-Type", "X-Request-ID", "Authorization"],
)

app.include_router(auth_router)


@app.middleware("http")
async def privacy_headers(request, call_next):
    request_id = request.headers.get("X-Request-ID") or secrets.token_hex(12)
    content_length = request.headers.get("content-length")
    request_limit = MAX_STREAM_REQUEST_BYTES if request.url.path == "/api/v1/scan/sensitive" else MAX_REQUEST_BYTES
    if content_length and content_length.isdigit() and int(content_length) > request_limit:
        message = "Streaming sensitive scan exceeds the 5 GB service limit" if request_limit == MAX_STREAM_REQUEST_BYTES else "Request exceeds the 27 MB service limit"
        return JSONResponse(status_code=413, content={"detail": message}, headers={"X-Request-ID": request_id})
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    response.headers["X-Request-ID"] = request_id
    return response


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "digimirror-privacy-api", "version": "0.3.0"}


@app.get("/api/v1/risk/model")
async def risk_model() -> dict[str, object]:
    return risk_model_description()


@app.post("/api/v1/scan/import", response_model=ScanResponse)
async def scan_import(
    file: UploadFile = File(...),
    threat_profile: ThreatProfile = Form("everyday"),
    account_id: str | None = Form(None),
) -> ScanResponse:
    try:
        export = await import_privacy_file(file)
        result = analyze_export(export, threat_profile=threat_profile)
        if account_id:
            try:
                from .relational_store import persist_scan
                persist_scan(account_id, result)
            except ModuleNotFoundError:
                pass
        return result
    except PrivacyImportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.post("/api/v1/scan/sensitive", response_model=SensitiveScanResponse)
async def scan_sensitive(file: UploadFile = File(...), previous_file: UploadFile | None = File(None), account_id: str | None = Form(None)) -> SensitiveScanResponse:
    try:
        previous = None
        if previous_file is not None:
            if Path(previous_file.filename or "").suffix.casefold() == ".zip":
                previous_file.file.seek(0)
                previous = scan_sensitive_stream(previous_file.filename or "previous.zip", previous_file.file)
            else:
                previous_content = await previous_file.read(MAX_SCAN_BYTES + 1)
                previous = scan_sensitive_file(previous_file.filename or "previous", previous_content)
            await previous_file.close()
        if Path(file.filename or "").suffix.casefold() == ".zip":
            file.file.seek(0)
            result = scan_sensitive_stream(file.filename or "upload.zip", file.file, previous)
        else:
            content = await file.read(MAX_SCAN_BYTES + 1)
            result = scan_sensitive_file(file.filename or "upload", content, previous)
        await file.close()
        if account_id:
            record_audit(account_id, "analysis", result.files_scanned, sum(item.count for item in result.findings), result.analysis.delta_summary)
        return result
    except ValueError as exc:
        status = 413 if "limit" in str(exc).lower() else 415
        raise HTTPException(status_code=status, detail=str(exc)) from exc


@app.post("/api/v1/watcher/snapshots", response_model=WatchEvent)
async def watcher_snapshot(payload: WatchSnapshotRequest) -> WatchEvent:
    return save_snapshot(payload.account_id, payload.scan)


@app.get("/api/v1/watcher/{account_id}", response_model=WatchStatus)
async def watcher_status(account_id: str) -> WatchStatus:
    return get_watch_status(account_id)


@app.get("/api/v1/timeline/{account_id}", response_model=list[TimelineSnapshot])
async def privacy_timeline(account_id: str) -> list[TimelineSnapshot]:
    return get_timeline(account_id)


@app.post("/api/v1/receipts/{account_id}", response_model=SignedPrivacyReceipt)
async def issue_privacy_receipt(account_id: str) -> SignedPrivacyReceipt:
    try:
        return create_privacy_receipt(account_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/api/v1/receipts/{account_id}", response_model=list[SignedPrivacyReceipt])
async def privacy_receipts(account_id: str) -> list[SignedPrivacyReceipt]:
    return list_privacy_receipts(account_id)


@app.post("/api/v1/receipts/verification/check", response_model=ReceiptVerification)
async def verify_receipt(receipt: SignedPrivacyReceipt) -> ReceiptVerification:
    return ReceiptVerification(valid=verify_privacy_receipt(receipt), receipt_id=receipt.payload.receipt_id)


@app.post("/api/v1/canaries", response_model=CanaryMarker)
async def create_canary(request: CanaryCreateRequest) -> CanaryMarker:
    return create_canary_marker(request)


@app.get("/api/v1/canaries/{account_id}", response_model=list[CanaryMarker])
async def canaries(account_id: str) -> list[CanaryMarker]:
    return list_canary_markers(account_id)


@app.post("/api/v1/canaries/detect", response_model=CanaryDetection)
async def detect_canaries(
    account_id: str = Form(...),
    file: UploadFile = File(...),
) -> CanaryDetection:
    suffix = Path(file.filename or "").suffix.casefold()
    if suffix not in {".json", ".csv", ".txt", ".zip"}:
        raise HTTPException(status_code=415, detail="Canary detection accepts JSON, CSV, TXT, or ZIP exports")
    content = await file.read(MAX_ZIP_UPLOAD_BYTES + 1)
    await file.close()
    if len(content) > MAX_ZIP_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Canary scan exceeds the 25 MB limit")
    try:
        return detect_canary_markers(account_id, extract_searchable_fragments(content, suffix))
    except PrivacyImportError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.post("/api/v1/gpc/check", response_model=GpcCheckResult)
async def gpc_check(request: GpcCheckRequest) -> GpcCheckResult:
    try:
        return await check_gpc_support(request.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="The website's GPC support resource could not be reached") from exc


@app.post("/api/v1/trust/consents", response_model=ConsentRecord)
async def create_consent(consent: ConsentRecord) -> ConsentRecord:
    return record_consent(consent)


@app.get("/api/v1/trust/consents/{account_id}", response_model=list[ConsentRecord])
async def consents(account_id: str) -> list[ConsentRecord]:
    return list_consents(account_id)


@app.post("/api/v1/quality/feedback", status_code=204)
async def finding_feedback(feedback: FindingFeedback) -> Response:
    record_feedback(feedback)
    return Response(status_code=204)


@app.get("/api/v1/quality/{account_id}", response_model=QualityMetrics)
async def metrics(account_id: str) -> QualityMetrics:
    return quality_metrics(account_id)


@app.get("/api/v1/trust/{account_id}", response_model=TrustSummary)
async def account_trust_summary(account_id: str) -> TrustSummary:
    return trust_summary(account_id)


@app.delete("/api/v1/trust/{account_id}", response_model=DeleteAccountResponse)
async def delete_account(account_id: str) -> DeleteAccountResponse:
    return delete_account_data(account_id)


@app.get("/api/v1/trust/{account_id}/audit", response_model=list[AuditEvent])
async def audit_log(account_id: str) -> list[AuditEvent]:
    return list_audit(account_id)


@app.post("/api/v1/trust/{account_id}/risk-proof", response_model=PrivacyProof)
async def risk_proof(account_id: str, threshold: int = Form(...)) -> PrivacyProof:
    try:
        return create_risk_proof(account_id, threshold)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/v1/trust/risk-proof/verify")
async def verify_risk(proof: PrivacyProof) -> dict[str, object]:
    return {"valid": verify_risk_proof(proof), "claim": proof.claim, "threshold": proof.threshold}


@app.get("/api/v1/playbooks", response_model=list[Playbook])
async def playbooks() -> list[Playbook]:
    return [
        Playbook(id="job-check", title="Prepare for a background check", description="Reduce unnecessary identity, social, and financial exposure before a professional screening.", action_ids=["profile-phone", "ad-personalization", "saved-payment"], expected_reduction=24),
        Playbook(id="travel", title="Reduce risk before travel", description="Limit location history, device continuity, and public contact discovery before a trip.", action_ids=["location-history", "profile-phone", "ad-personalization"], expected_reduction=28),
        Playbook(id="insurance", title="Clean up before applying for insurance", description="Minimize retained payment, purchase, and behavioral profiling signals.", action_ids=["saved-payment", "ad-personalization", "location-history"], expected_reduction=22),
    ]


@app.post("/api/v1/accounts", response_model=AnonymousAccount)
async def create_anonymous_account(threat_profile: ThreatProfile = Form("everyday")) -> AnonymousAccount:
    account_id = "acct_" + secrets.token_urlsafe(24)
    try:
        from .relational_store import ensure_account
        ensure_account(account_id, threat_profile)
    except ModuleNotFoundError as exc:
        raise HTTPException(status_code=503, detail="SQLAlchemy relational persistence is not installed") from exc
    return AnonymousAccount(account_id=account_id, threat_profile=threat_profile)


@app.get("/api/v1/connectors", response_model=list[ConnectorManifest])
async def connectors() -> list[ConnectorManifest]:
    return connector_manifests()


@app.post(
    "/api/v1/connectors/{provider}/authorize",
    response_model=ConnectorAuthorizationResponse,
)
async def authorize_connector(
    provider: str,
    request: ConnectorAuthorizationRequest,
) -> ConnectorAuthorizationResponse:
    try:
        return begin_authorization(provider, request)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc



@app.post("/api/v1/leak/scan", response_model=LeakScanResponse)
async def leak_scan(request: LeakScanRequest) -> LeakScanResponse:
    """Scrape supplied public HTTPS URLs for email, phone, and photo leakage."""
    try:
        result = await run_leak_scan(
            urls=request.urls,
            email=request.email,
            phone=request.phone,
        )
        return LeakScanResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="One or more target URLs could not be reached") from exc


@app.post("/api/v1/breach/email", response_model=BreachScanResponse)
async def breach_scan_email(request: BreachScanRequest) -> BreachScanResponse:
    """Check a real email against HIBP v3 breach & paste databases."""
    hibp_key = os.getenv("HIBP_API_KEY") or None
    try:
        result = await check_email_breach(request.email, hibp_key)
        return BreachScanResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="HIBP service could not be reached") from exc


@app.post("/api/v1/breach/phone", response_model=PhoneIntelResponse)
async def phone_intel(request: PhoneIntelRequest) -> PhoneIntelResponse:
    """Parse, validate, and analyse a phone number locally (no external API)."""
    result = analyze_phone_number(request.phone, request.default_region)
    return PhoneIntelResponse(**result)


@app.post("/api/v1/breach/footprint", response_model=FootprintScanResponse)
async def footprint_scan(request: FootprintScanRequest) -> FootprintScanResponse:
    """OSINT footprint scan — probe 8 major platforms for account presence."""
    try:
        result = await scan_digital_footprint(request.email)
        return FootprintScanResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="One or more platform probes could not be reached") from exc


@app.exception_handler(413)
async def payload_too_large_handler(_request, exc):
    return JSONResponse(status_code=413, content={"detail": str(exc.detail)})
