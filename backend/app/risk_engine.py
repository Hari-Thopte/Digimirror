from __future__ import annotations

import re
from dataclasses import dataclass

from .models import (
    CategoryResult,
    ExposureFinding,
    ExportCompleteness,
    GraphEdge,
    GraphNode,
    PrivacyAction,
    PrivacyExport,
    PrivacyGraph,
    PrivacyRecord,
    RiskFactor,
    ScanQuality,
    ScanResponse,
    ScanSummary,
    ThreatProfile,
)


MODEL_VERSION = "digimirror-risk-v2"


@dataclass(frozen=True)
class FieldRule:
    label: str
    category: str
    base_score: int
    fix: str
    settings_url: str
    steps: tuple[str, ...]


FIELD_RULES: dict[str, FieldRule] = {
    "phone_number": FieldRule(
        "Phone number", "identity", 88,
        "Disable contact discovery where possible and hide the phone field from public profiles.",
        "https://myaccount.google.com/personal-info",
        ("Open the account's personal-information settings.", "Remove public phone visibility and disable contact discovery.", "Turn off contact syncing and delete uploaded contacts.", "Rescan to verify the finding is removed or reduced."),
    ),
    "email_address": FieldRule(
        "Email address", "identity", 62,
        "Use aliases for non-essential services and revoke unused sign-in connections.",
        "https://myaccount.google.com/connections",
        ("Review services connected through the email account.", "Revoke unused sign-in connections and marketing permissions.", "Use an alias where the primary address is unnecessary.", "Rescan to confirm fewer services receive the address."),
    ),
    "home_address": FieldRule(
        "Home address", "location", 88,
        "Delete unused saved addresses and provide delivery details only when required.",
        "https://myaccount.google.com/addresses",
        ("Open saved addresses for the source service.", "Delete outdated or unnecessary addresses.", "Disable automatic address syncing where available.", "Rescan to verify the address is no longer retained."),
    ),
    "precise_location": FieldRule(
        "Precise location", "location", 92,
        "Change location access to 'While using' and pause location-history timelines.",
        "https://myaccount.google.com/activitycontrols/location",
        ("Open location or timeline controls.", "Pause location history and delete unnecessary activity.", "Change device permission from 'Always' to 'While using'.", "Create a fresh export and rescan."),
    ),
    "purchase_history": FieldRule(
        "Purchase history", "financial", 60,
        "Disable personalized recommendations and optional advertising measurement.",
        "https://myaccount.google.com/data-and-privacy",
        ("Review order-history retention and personalization.", "Disable optional ad measurement and recommendation sharing.", "Delete old activity where permitted.", "Rescan to verify recipients or retention decreased."),
    ),
    "saved_payment_method": FieldRule(
        "Saved payment method", "financial", 94,
        "Remove unused stored payment methods and enable transaction alerts.",
        "https://payments.google.com/gp/w/home/paymentmethods",
        ("Open saved payment methods.", "Remove unused cards or billing profiles.", "Enable transaction notifications and strong authentication.", "Rescan to confirm the finding is resolved."),
    ),
    "browsing_interests": FieldRule(
        "Browsing interests", "behavioral", 58,
        "Reject optional advertising cookies and clear the existing advertising profile.",
        "https://myaccount.google.com/activitycontrols",
        ("Open activity and ad-personalization controls.", "Pause unnecessary history and delete activity.", "Reject optional analytics and advertising cookies.", "Rescan to confirm fewer behavioral signals remain."),
    ),
    "listening_activity": FieldRule(
        "Listening activity", "behavioral", 38,
        "Clear activity history periodically or pause personalization.",
        "https://www.spotify.com/account/privacy/",
        ("Open privacy and listening-history settings.", "Disable optional personalization or social sharing.", "Remove old activity when supported.", "Download a newer export and rescan."),
    ),
    "device_identifier": FieldRule(
        "Device identifier", "behavioral", 72,
        "Reset the advertising identifier and limit cross-app tracking.",
        "https://myaccount.google.com/device-activity",
        ("Review active sessions and devices.", "Sign out unknown or unused devices.", "Reset the advertising identifier and limit cross-app tracking.", "Rescan to verify the old identifier is gone."),
    ),
    "other_personal_info": FieldRule(
        "Other personal information", "identity", 50,
        "Review the source account and remove unnecessary profile information.",
        "https://myaccount.google.com/data-and-privacy",
        ("Open the source service's privacy controls.", "Remove information that is not required.", "Limit visibility and third-party sharing.", "Rescan to verify the change."),
    ),
}

CATEGORY_WEIGHTS = {"identity": 0.35, "location": 0.25, "financial": 0.20, "behavioral": 0.20}

THREAT_PROFILE_MULTIPLIERS: dict[str, dict[str, float]] = {
    "everyday": {category: 1.0 for category in CATEGORY_WEIGHTS},
    "public_figure": {"identity": 1.20, "location": 1.15, "financial": 1.0, "behavioral": 1.05},
    "frequent_traveler": {"identity": 1.05, "location": 1.30, "financial": 1.05, "behavioral": 1.0},
    "financially_sensitive": {"identity": 1.15, "location": 1.0, "financial": 1.35, "behavioral": 0.95},
    "family": {"identity": 1.15, "location": 1.20, "financial": 1.0, "behavioral": 1.05},
}

VISIBILITY_MULTIPLIERS = {"public": 1.0, "shared": 0.82, "stored": 0.58, "inferred": 0.48, "protected": 0.15}
CLASSIFICATIONS = {"public": "Public exposure", "shared": "Third-party sharing", "stored": "Stored data", "inferred": "Inferred data", "protected": "Protected data"}


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _rule_for(field: str) -> FieldRule:
    return FIELD_RULES.get(field, FIELD_RULES["other_personal_info"])


def _score_record(record: PrivacyRecord, rule: FieldRule) -> int:
    score = round(rule.base_score * VISIBILITY_MULTIPLIERS[record.visibility] + min(len(record.recipients) * 3, 12) + (5 if record.permission_status == "enabled" else 0))
    return max(0, min(100, score))


def _severity(score: int) -> str:
    return "high" if score >= 70 else "medium" if score >= 40 else "low"


def _risk_level(score: int) -> str:
    return "high" if score >= 70 else "medium" if score >= 45 else "low"


def _impact(score: int) -> str:
    return "High impact" if score >= 70 else "Medium impact" if score >= 40 else "Low impact"


def _confidence(record: PrivacyRecord) -> tuple[str, int, list[str]]:
    score = 45
    sources = [record.source]
    if record.evidence_file:
        score += 25
        sources.append(record.evidence_file)
    score += 8 if record.source else 0
    score += 8 if record.action and "Imported from" not in record.action else 0
    score += 7 if record.recipients else 0
    score += 5 if record.permission_status != "unknown" else 0
    score = min(100, score)
    return ("high" if score >= 80 else "medium" if score >= 60 else "low"), score, sources


def _finding(record: PrivacyRecord, index: int) -> tuple[ExposureFinding, int, str]:
    rule = _rule_for(record.field)
    score = _score_record(record, rule)
    recipients = record.recipients or [f"{record.source} only"]
    permission_note = "The related permission is enabled." if record.permission_status == "enabled" else "The export reports this visibility setting."
    confidence, confidence_score, evidence_sources = _confidence(record)
    finding = ExposureFinding(
        id=f"{_slug(record.field)}-{index + 1}", field_key=record.field,
        field=rule.label if record.field in FIELD_RULES else record.field.replace("_", " ").title(),
        category=rule.category.title(), classification=CLASSIFICATIONS[record.visibility],
        severity=_severity(score), score=score, origin=record.source, action=record.action,
        destination=", ".join(recipients), visible_to=", ".join(recipients[:2]),
        evidence=f"The imported privacy metadata marks this field as {record.visibility}. {permission_note} No raw personal value was retained.",
        confidence=confidence, confidence_score=confidence_score, evidence_sources=evidence_sources,
        observed_at=record.observed_at, fix=rule.fix,
    )
    return finding, score, rule.category


def _settings_url(finding: ExposureFinding, rule: FieldRule) -> str:
    source = finding.origin.casefold()
    if any(name in source for name in ("instagram", "facebook", "meta")):
        return "https://accountscenter.instagram.com/info_and_permissions/"
    if "spotify" in source:
        return "https://www.spotify.com/account/privacy/"
    if "amazon" in source or "commerce" in source:
        return "https://www.amazon.com/gp/help/customer/display.html?nodeId=GXPU3YPMBZQRWZK2"
    return rule.settings_url


def _build_graph(findings: list[ExposureFinding], actions: list[PrivacyAction]) -> PrivacyGraph:
    nodes: dict[str, GraphNode] = {"person:self": GraphNode(id="person:self", type="person", label="You")}
    edges: dict[str, GraphEdge] = {}
    action_by_field = {action.verification_field_key: action for action in actions}

    def add_node(node: GraphNode) -> None:
        nodes.setdefault(node.id, node)

    def add_edge(source: str, target: str, relation: str) -> None:
        edge_id = f"{source}|{relation}|{target}"
        edges.setdefault(edge_id, GraphEdge(id=_slug(edge_id), source=source, target=target, relation=relation))

    for finding in findings:
        data_id, source_id, trigger_id = f"data:{_slug(finding.field_key)}", f"source:{_slug(finding.origin)}", f"action:{_slug(finding.action)[:80]}"
        add_node(GraphNode(id=data_id, type="data", label=finding.field, risk_score=finding.score))
        add_node(GraphNode(id=source_id, type="source", label=finding.origin))
        add_node(GraphNode(id=trigger_id, type="action", label=finding.action))
        add_edge("person:self", data_id, "has_data")
        add_edge(data_id, source_id, "originated_from")
        add_edge(source_id, trigger_id, "triggered_by")
        for recipient in [value.strip() for value in finding.destination.split(",") if value.strip()]:
            recipient_id = f"recipient:{_slug(recipient)}"
            add_node(GraphNode(id=recipient_id, type="recipient", label=recipient))
            add_edge(source_id, recipient_id, "shared_with")
        fix = action_by_field.get(finding.field_key)
        if fix:
            fix_id = f"fix:{_slug(fix.id)}"
            add_node(GraphNode(id=fix_id, type="fix", label=fix.title))
            add_edge(data_id, fix_id, "mitigated_by")
    return PrivacyGraph(nodes=list(nodes.values()), edges=list(edges.values()))


def _quality(export: PrivacyExport, findings: list[ExposureFinding]) -> ScanQuality:
    average = round(sum(item.confidence_score for item in findings) / len(findings)) if findings else 0
    expected = {"normalized": 1, "google_takeout": 6, "instagram_export": 4, "spotify_export": 3, "commerce_export": 4, "multi_platform": 10}[export.import_type]
    coverage = min(100, round(export.processed_files / expected * 100))
    limits = ["A data export shows retained account data, not every external copy or confirmed breach.", "Recipients are derived from export schema and settings, not network interception."]
    if coverage < 70:
        limits.append("Only part of the supported export surface was present in this archive.")
    return ScanQuality(average_confidence=average, coverage_score=coverage, recognized_files=export.processed_files, limitations=limits)


EXPECTED_EXPORT_SIGNALS: dict[str, dict[str, str]] = {
    "google_takeout": {
        "browsing_interests": "Chrome, Search, or YouTube activity",
        "precise_location": "Maps Timeline or saved places",
        "email_address": "Chrome Autofill or Contacts",
        "phone_number": "Chrome Autofill or Contacts",
        "home_address": "Chrome Autofill addresses",
        "purchase_history": "Google Pay transactions",
        "saved_payment_method": "Google Pay payment methods",
    },
    "instagram_export": {
        "phone_number": "Profile or synced contacts",
        "email_address": "Profile information",
        "precise_location": "Logged location information",
        "browsing_interests": "Advertising interests",
    },
    "spotify_export": {
        "listening_activity": "Streaming history",
        "browsing_interests": "Search queries",
        "email_address": "Identity export",
        "device_identifier": "Device or identity information",
    },
    "commerce_export": {
        "purchase_history": "Order history",
        "home_address": "Saved shipping addresses",
        "saved_payment_method": "Payment methods",
        "browsing_interests": "Browsing or recommendation activity",
    },
}


def _completeness(export: PrivacyExport) -> ExportCompleteness:
    observed_keys = {record.field for record in export.items}
    if export.import_type == "normalized":
        observed = sorted(record.field.replace("_", " ").title() for record in export.items)
        return ExportCompleteness(
            score=100,
            observed_signals=observed,
            missing_signals=[],
            recommendation="This is a user-defined normalized export. Import a provider archive for provider-specific completeness checks.",
        )
    expected = (
        {key: label for mapping in EXPECTED_EXPORT_SIGNALS.values() for key, label in mapping.items()}
        if export.import_type == "multi_platform"
        else EXPECTED_EXPORT_SIGNALS.get(export.import_type, {})
    )
    observed = sorted(label for key, label in expected.items() if key in observed_keys)
    missing = sorted(label for key, label in expected.items() if key not in observed_keys)
    score = round(len(observed) / len(expected) * 100) if expected else 100
    recommendation = (
        "The expected signal groups were found in this export."
        if not missing
        else "Create a new export including the missing products, then rescan for broader coverage."
    )
    return ExportCompleteness(score=score, observed_signals=observed, missing_signals=missing, recommendation=recommendation)


def analyze_export(export: PrivacyExport, threat_profile: ThreatProfile = "everyday") -> ScanResponse:
    findings: list[ExposureFinding] = []
    scores_by_category: dict[str, list[int]] = {category: [] for category in CATEGORY_WEIGHTS}
    sources: set[str] = set()
    for index, record in enumerate(export.items):
        finding, score, category = _finding(record, index)
        findings.append(finding)
        scores_by_category[category].append(score)
        sources.add(record.source.casefold())

    categories: list[CategoryResult] = []
    factors: list[RiskFactor] = []
    multipliers = THREAT_PROFILE_MULTIPLIERS[threat_profile]
    for name, weight in CATEGORY_WEIGHTS.items():
        scores = scores_by_category[name]
        raw = round(sum(scores) / len(scores)) if scores else 0
        multiplier = multipliers[name]
        adjusted = min(100, round(raw * multiplier))
        contribution = round(adjusted * weight, 2)
        categories.append(CategoryResult(name=name.title(), score=adjusted, finding_count=len(scores), weight=weight))
        factors.append(RiskFactor(category=name.title(), raw_score=raw, profile_multiplier=multiplier, adjusted_score=adjusted, weighted_contribution=contribution, explanation=f"{len(scores)} finding(s) averaged {raw}; the {threat_profile.replace('_', ' ')} profile applies {multiplier:.2f}x and the category contributes {weight:.0%}."))
    overall = round(sum(item.weighted_contribution for item in factors))
    sorted_findings = sorted(findings, key=lambda item: item.score, reverse=True)

    actions: list[PrivacyAction] = []
    seen_fields: set[str] = set()
    for finding in sorted_findings:
        if finding.field_key in seen_fields:
            continue
        seen_fields.add(finding.field_key)
        rule = _rule_for(finding.field_key)
        actions.append(PrivacyAction(id=f"fix-{finding.field_key}", title=f"Reduce {finding.field.lower()} exposure", description=finding.fix, source=finding.origin, impact=_impact(finding.score), estimated_reduction=max(2, round(finding.score * 0.09)), verification_field_key=finding.field_key, settings_url=_settings_url(finding, rule), steps=list(rule.steps)))

    return ScanResponse(
        overall_score=overall, risk_level=_risk_level(overall), categories=categories,
        findings=sorted_findings, actions=actions,
        summary=ScanSummary(exposed_fields=len(findings), source_count=len(sources), import_type=export.import_type, processed_files=export.processed_files, adapter_version=export.adapter_version),
        threat_profile=threat_profile, risk_explanation=factors,
        graph=_build_graph(sorted_findings, actions), quality=_quality(export, sorted_findings),
        completeness=_completeness(export), model_version=MODEL_VERSION,
    )


def risk_model_description() -> dict[str, object]:
    return {"model_version": MODEL_VERSION, "category_weights": CATEGORY_WEIGHTS, "visibility_multipliers": VISIBILITY_MULTIPLIERS, "threat_profile_multipliers": THREAT_PROFILE_MULTIPLIERS, "explanation": "Each field starts with a sensitivity score. Visibility, recipients, and enabled permissions adjust the field score. Category averages are personalized by the selected threat profile and combined with published weights."}
