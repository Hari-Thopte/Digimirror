from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


Visibility = Literal["public", "shared", "stored", "inferred", "protected"]
PermissionStatus = Literal["enabled", "disabled", "unknown"]
ThreatProfile = Literal[
    "everyday",
    "public_figure",
    "frequent_traveler",
    "financially_sensitive",
    "family",
]


class PrivacyRecord(BaseModel):
    """Metadata about an exposure. Raw personal values are deliberately ignored."""

    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    field: str = Field(min_length=1, max_length=80)
    source: str = Field(min_length=1, max_length=120)
    visibility: Visibility
    action: str = Field(
        default="Imported from the account privacy export",
        min_length=1,
        max_length=500,
    )
    recipients: list[str] = Field(default_factory=list, max_length=30)
    permission_status: PermissionStatus = "unknown"
    evidence_file: str | None = Field(default=None, max_length=300)
    observed_at: str | None = Field(default=None, max_length=80)

    @field_validator("recipients", mode="before")
    @classmethod
    def split_recipients(cls, value: object) -> object:
        if isinstance(value, str):
            separator = ";" if ";" in value else "|"
            return [item.strip() for item in value.split(separator) if item.strip()]
        return value

    @field_validator("recipients")
    @classmethod
    def limit_recipient_length(cls, value: list[str]) -> list[str]:
        for recipient in value:
            if not recipient or len(recipient) > 160:
                raise ValueError("each recipient must be between 1 and 160 characters")
        return value


class PrivacyExport(BaseModel):
    model_config = ConfigDict(extra="ignore")

    export_version: int = Field(default=1, ge=1, le=10)
    items: list[PrivacyRecord] = Field(min_length=1, max_length=1000)
    import_type: Literal[
        "normalized",
        "google_takeout",
        "instagram_export",
        "spotify_export",
        "commerce_export",
        "multi_platform",
    ] = "normalized"
    processed_files: int = Field(default=1, ge=0, le=1000)
    adapter_version: str = Field(default="normalized-v1", max_length=80)


class CategoryResult(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    finding_count: int = Field(ge=0)
    weight: float = Field(ge=0, le=1)


class ExposureFinding(BaseModel):
    id: str
    field_key: str
    field: str
    category: str
    classification: str
    severity: Literal["high", "medium", "low"]
    score: int = Field(ge=0, le=100)
    origin: str
    action: str
    destination: str
    visible_to: str
    evidence: str
    confidence: Literal["high", "medium", "low"]
    confidence_score: int = Field(ge=0, le=100)
    evidence_sources: list[str]
    observed_at: str | None = None
    fix: str


class PrivacyAction(BaseModel):
    id: str
    title: str
    description: str
    source: str
    impact: Literal["High impact", "Medium impact", "Low impact"]
    estimated_reduction: int = Field(ge=0, le=100)
    verification_field_key: str
    settings_url: str | None = None
    steps: list[str] = Field(min_length=1, max_length=8)


class RiskFactor(BaseModel):
    category: str
    raw_score: int = Field(ge=0, le=100)
    profile_multiplier: float = Field(ge=0.5, le=2)
    adjusted_score: int = Field(ge=0, le=100)
    weighted_contribution: float = Field(ge=0, le=100)
    explanation: str


class GraphNode(BaseModel):
    id: str
    type: Literal["person", "data", "source", "action", "recipient", "fix"]
    label: str
    risk_score: int | None = Field(default=None, ge=0, le=100)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relation: Literal[
        "has_data",
        "originated_from",
        "triggered_by",
        "shared_with",
        "mitigated_by",
    ]


class PrivacyGraph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class ScanQuality(BaseModel):
    average_confidence: int = Field(ge=0, le=100)
    coverage_score: int = Field(ge=0, le=100)
    recognized_files: int = Field(ge=0)
    limitations: list[str]


class ExportCompleteness(BaseModel):
    score: int = Field(ge=0, le=100)
    observed_signals: list[str]
    missing_signals: list[str]
    recommendation: str


class ScanSummary(BaseModel):
    exposed_fields: int = Field(ge=0)
    source_count: int = Field(ge=0)
    raw_values_stored: Literal[False] = False
    processed_in_memory: Literal[True] = True
    import_type: Literal[
        "normalized",
        "google_takeout",
        "instagram_export",
        "spotify_export",
        "commerce_export",
        "multi_platform",
    ]
    processed_files: int = Field(ge=0)
    adapter_version: str


class ScanResponse(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    risk_level: Literal["high", "medium", "low"]
    categories: list[CategoryResult]
    findings: list[ExposureFinding]
    actions: list[PrivacyAction]
    summary: ScanSummary
    threat_profile: ThreatProfile
    risk_explanation: list[RiskFactor]
    graph: PrivacyGraph
    quality: ScanQuality
    completeness: ExportCompleteness | None = None
    model_version: str


class SensitiveFinding(BaseModel):
    type: Literal["face", "email", "phone", "secret", "location", "device", "financial", "contacts", "permission", "tracking", "biometric"]
    label: str
    severity: Literal["high", "medium", "low"]
    count: int = Field(ge=1)
    confidence: int = Field(ge=0, le=100)
    example: str
    source: str
    category: str = "personal_data"
    details: list[str] = Field(default_factory=list, max_length=12)


class SensitiveAnalysis(BaseModel):
    correlated_services: list[str] = Field(default_factory=list)
    correlation_multiplier: float = Field(default=1.0, ge=1, le=2)
    exposure_age_days: int | None = Field(default=None, ge=0)
    age_adjustment: float = Field(default=1.0, ge=0.5, le=1.2)
    permission_drift: list[str] = Field(default_factory=list)
    minimization_score: int = Field(default=0, ge=0, le=100)
    adversary_reconstruction: list[str] = Field(default_factory=list)
    forecast_score: int | None = Field(default=None, ge=0, le=100)
    delta_summary: list[str] = Field(default_factory=list)
    behavioral_tracking_intensity: int = Field(default=0, ge=0, le=100)
    data_broker_surface: list[str] = Field(default_factory=list)
    reidentification_risk: int = Field(default=0, ge=0, le=100)
    shadow_profile_signals: list[str] = Field(default_factory=list)
    consent_theater_signals: list[str] = Field(default_factory=list)


class SensitiveDiff(BaseModel):
    added: list[str] = Field(default_factory=list)
    removed: list[str] = Field(default_factory=list)
    changed: list[str] = Field(default_factory=list)
    risk_change: int = 0


class SensitiveScanResponse(BaseModel):
    file_name: str
    findings: list[SensitiveFinding]
    files_scanned: int = Field(ge=0)
    notes: list[str]
    raw_values_stored: Literal[False] = False
    processed_in_memory: Literal[True] = True
    analysis: SensitiveAnalysis = Field(default_factory=SensitiveAnalysis)
    diff: SensitiveDiff | None = None


class PrivacyProof(BaseModel):
    claim: str
    threshold: int = Field(ge=0, le=100)
    commitment: str
    proof: str
    algorithm: Literal["HMAC-SHA256-commitment"] = "HMAC-SHA256-commitment"
    issued_at: str


class Playbook(BaseModel):
    id: str
    title: str
    description: str
    action_ids: list[str]
    expected_reduction: int = Field(ge=0, le=100)


class AnonymousAccount(BaseModel):
    account_id: str
    threat_profile: ThreatProfile
    raw_identity_stored: Literal[False] = False


class AnalysisRunSummary(BaseModel):
    run_id: str
    account_id: str
    status: Literal["completed"] = "completed"
    finding_count: int = Field(ge=0)
    overall_score: int = Field(ge=0, le=100)


class WatchSnapshotRequest(BaseModel):
    account_id: str = Field(min_length=1, max_length=120)
    scan: ScanResponse


class WatchEvent(BaseModel):
    id: int
    created_at: str
    event_type: Literal["baseline", "improved", "worsened", "unchanged"]
    score_before: int | None = Field(default=None, ge=0, le=100)
    score_after: int = Field(ge=0, le=100)
    score_change: int
    resolved_fields: list[str]
    new_fields: list[str]
    verified_fixes: int = Field(ge=0)


class WatchStatus(BaseModel):
    account_id: str
    active: bool
    scan_count: int = Field(ge=0)
    latest_score: int | None = Field(default=None, ge=0, le=100)
    latest_scan_at: str | None = None
    events: list[WatchEvent]


class TimelineSnapshot(BaseModel):
    id: int
    created_at: str
    score: int = Field(ge=0, le=100)
    risk_level: Literal["high", "medium", "low"]
    threat_profile: ThreatProfile
    categories: dict[str, int]
    fields: dict[str, int]


class ReceiptPayload(BaseModel):
    receipt_id: str
    issued_at: str
    snapshot_at: str
    score: int = Field(ge=0, le=100)
    risk_level: Literal["high", "medium", "low"]
    model_version: str
    threat_profile: ThreatProfile
    import_type: str
    finding_count: int = Field(ge=0)
    verified_fixes: int = Field(ge=0)
    resolved_fields: list[str]
    findings_fingerprint: str
    raw_values_included: Literal[False] = False


class SignedPrivacyReceipt(BaseModel):
    payload: ReceiptPayload
    algorithm: Literal["Ed25519"] = "Ed25519"
    signature: str
    public_key: str


class ReceiptVerification(BaseModel):
    valid: bool
    receipt_id: str


class ConsentRecord(BaseModel):
    id: int | None = None
    account_id: str = Field(min_length=1, max_length=120)
    purpose: str = Field(min_length=1, max_length=200)
    data_categories: list[str] = Field(min_length=1, max_length=30)
    granted: bool
    created_at: str | None = None


class FindingFeedback(BaseModel):
    account_id: str = Field(min_length=1, max_length=120)
    finding_key: str = Field(min_length=1, max_length=200)
    verdict: Literal["accurate", "false_positive", "unsure"]


class QualityMetrics(BaseModel):
    account_id: str
    scan_count: int = Field(ge=0)
    average_score: float = Field(ge=0, le=100)
    latest_score: int | None = Field(default=None, ge=0, le=100)
    total_verified_fixes: int = Field(ge=0)
    finding_feedback_count: int = Field(ge=0)
    confirmed_accuracy_rate: float | None = Field(default=None, ge=0, le=100)


class CanaryCreateRequest(BaseModel):
    account_id: str = Field(min_length=1, max_length=120)
    service: str = Field(min_length=1, max_length=80)
    alias_type: Literal["email", "username"] = "email"


class CanaryMarker(BaseModel):
    id: int
    service: str
    alias_type: Literal["email", "username"]
    masked_alias: str
    alias: str | None = None
    created_at: str
    last_detected_at: str | None = None
    detection_count: int = Field(ge=0)


class CanaryDetection(BaseModel):
    checked_markers: int = Field(ge=0)
    detected: list[CanaryMarker]


class GpcCheckRequest(BaseModel):
    url: str = Field(min_length=4, max_length=500)


class GpcCheckResult(BaseModel):
    url: str
    hostname: str
    support_resource_found: bool
    declares_gpc_support: bool
    status_code: int | None = None
    evidence: str
    checked_at: str


class ConnectorManifest(BaseModel):
    id: str
    name: str
    mode: Literal["oauth", "export"]
    configured: bool
    requires_provider_approval: bool
    scopes: list[str]
    export_help_url: str | None = None
    authorization_url: str | None = None


class ConnectorAuthorizationRequest(BaseModel):
    account_id: str = Field(min_length=1, max_length=120)
    redirect_uri: str = Field(min_length=8, max_length=500)


class ConnectorAuthorizationResponse(BaseModel):
    provider: str
    authorization_url: str
    expires_in: int


class TrustSummary(BaseModel):
    account_id: str
    derived_snapshots: int
    watcher_events: int
    consent_records: int
    feedback_records: int
    canary_markers: int = 0
    privacy_receipts: int = 0
    audit_events: int = 0
    raw_values_stored: Literal[False] = False
    data_retention: str


class AuditEvent(BaseModel):
    id: int
    created_at: str
    event_type: Literal["analysis", "snapshot", "delete", "consent", "receipt"]
    files_scanned: int = Field(default=0, ge=0)
    finding_count: int = Field(default=0, ge=0)
    details: list[str] = Field(default_factory=list)


class DeleteAccountResponse(BaseModel):
    account_id: str
    deleted: dict[str, int]
    local_cleanup_required: bool = True


# ---------------------------------------------------------------------------
# Web Leak Scanner
# ---------------------------------------------------------------------------


class LeakScanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    urls: list[str] = Field(min_length=1, max_length=10)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=30)

    @field_validator("urls")
    @classmethod
    def validate_url_lengths(cls, values: list[str]) -> list[str]:
        for url in values:
            if len(url) > 2048:
                raise ValueError("Each URL must be at most 2048 characters")
        return values


class LeakPageResult(BaseModel):
    url: str
    status_code: int | None = None
    reachable: bool
    email_found: bool
    phone_found: bool
    photo_signal_found: bool
    og_images: list[str] = Field(default_factory=list)
    profile_images: list[str] = Field(default_factory=list)
    page_title: str
    risk_level: Literal["high", "medium", "none"]
    error: str | None = None


class LeakScanResponse(BaseModel):
    scanned_at: str
    urls_scanned: int = Field(ge=0)
    email_searched: bool
    phone_searched: bool
    overall_risk: Literal["high", "medium", "low", "clean"]
    pages_with_email_match: int = Field(ge=0)
    pages_with_phone_match: int = Field(ge=0)
    pages_with_photo_signal: int = Field(ge=0)
    high_risk_pages: int = Field(ge=0)
    medium_risk_pages: int = Field(ge=0)
    raw_values_stored: Literal[False] = False
    pages: list[LeakPageResult]


# ---------------------------------------------------------------------------
# Breach Intelligence
# ---------------------------------------------------------------------------


class BreachScanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def basic_email_format(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.lower()


class BreachRecord(BaseModel):
    name: str
    domain: str
    breach_date: str
    pwn_count: int = Field(ge=0)
    data_classes: list[str] = Field(default_factory=list)
    is_sensitive: bool = False
    is_verified: bool = True
    is_fabricated: bool = False
    description_snippet: str = ""


class PasteRecord(BaseModel):
    source: str
    id: str
    title: str
    date: str
    email_count: int = Field(ge=0)


class BreachScanResponse(BaseModel):
    checked_at: str
    breach_count: int = Field(ge=0)
    paste_count: int = Field(ge=0)
    severity: Literal["critical", "high", "medium", "low", "clean", "unknown"]
    exposed_data_classes: list[str] = Field(default_factory=list)
    breaches: list[BreachRecord] = Field(default_factory=list)
    pastes: list[PasteRecord] = Field(default_factory=list)
    api_key_configured: bool
    error: str | None = None
    raw_values_stored: Literal[False] = False


# ---------------------------------------------------------------------------
# Phone Number Intelligence
# ---------------------------------------------------------------------------


class PhoneIntelRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    phone: str = Field(min_length=4, max_length=30)
    default_region: str = Field(default="IN", min_length=2, max_length=2)


class PhoneIntelResponse(BaseModel):
    checked_at: str
    valid: bool
    possible: bool = False
    e164: str | None = None
    country_code: str | None = None
    country_name: str | None = None
    national_number: str | None = None
    carrier: str | None = None
    line_type: str | None = None
    is_voip: bool = False
    is_mobile: bool = False
    is_premium: bool = False
    is_toll_free: bool = False
    risk_flags: list[str] = Field(default_factory=list)
    risk_level: Literal["high", "medium", "low", "unknown"]
    error: str | None = None


# ---------------------------------------------------------------------------
# Digital Footprint (OSINT) Scanner
# ---------------------------------------------------------------------------


class FootprintScanRequest(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    email: str = Field(min_length=3, max_length=320)

    @field_validator("email")
    @classmethod
    def basic_email_format(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.lower()


class PlatformPresence(BaseModel):
    platform: str
    presence: Literal["present", "absent", "uncertain"]
    error: str | None = None


class FootprintScanResponse(BaseModel):
    checked_at: str
    platforms_checked: int = Field(ge=0)
    platforms_present: int = Field(ge=0)
    platforms_uncertain: int = Field(ge=0)
    platforms_absent: int = Field(ge=0)
    footprint_level: Literal["extensive", "moderate", "minimal", "none"]
    platforms: list[PlatformPresence] = Field(default_factory=list)
    raw_values_stored: Literal[False] = False
