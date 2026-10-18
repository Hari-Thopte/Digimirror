from __future__ import annotations

import io
import re
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import PurePosixPath
from typing import Callable, Iterable

from .models import SensitiveAnalysis, SensitiveDiff, SensitiveFinding, SensitiveScanResponse

MAX_SCAN_BYTES = 25 * 1024 * 1024
MAX_ZIP_ENTRIES = 500
MAX_ZIP_EXPANDED_BYTES = 50 * 1024 * 1024
MAX_MEMBER_BYTES = 5 * 1024 * 1024

EMAIL_RE = re.compile(r"\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b", re.I)
PHONE_RE = re.compile(r"(?<!\w)(?:\+?\d[\d .()\-]{7,}\d)(?!\w)")
SECRET_PATTERNS = (
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("GitHub token", re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b")),
    ("JWT token", re.compile(r"\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\b")),
    ("Private key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("Credential assignment", re.compile(r"(?i)(?:password|passwd|secret|api[_-]?key|access[_-]?token)[\"']?\s*[:=]\s*[\"']?[^\s\"']{8,}")),
)
COORDINATE_RE = re.compile(r"(?<!\d)[-+]?(?:[1-8]?\d(?:\.\d{3,})?|90(?:\.0+)?)\s*[,;]\s*[-+]?(?:1[0-7]\d(?:\.\d{3,})?|180(?:\.0+)?|[1-9]?\d(?:\.\d{3,})?)(?!\d)")
DATE_RE = re.compile(r"\b(?:20\d{2})[-/](?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12]\d|3[01])\b")
USER_AGENT_RE = re.compile(r"(?:Mozilla/5\.0|AppleWebKit|Chrome/|Firefox/|Safari/|Edg/|Version/)", re.I)
RESOLUTION_RE = re.compile(r"\b(?:[1-9]\d{2,4})\s*[x×]\s*(?:[1-9]\d{2,4})\b")
CARD_RE = re.compile(r"(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)")
IBAN_RE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b")
PIXEL_RE = re.compile(r"<img[^>]+(?:width=[\"']?1|height=[\"']?1|tracking|pixel)", re.I)
SCOPE_RE = re.compile(r"(?:scope|scopes|permissions?)[\"']?\s*[:=]\s*[\"']?([^\"'\n]+)", re.I)


def _service_from_source(source: str) -> str:
    lower = source.casefold()
    for name in ("google", "instagram", "facebook", "meta", "spotify", "amazon", "commerce", "microsoft", "apple"):
        if name in lower:
            return "meta" if name in {"instagram", "facebook", "meta"} else name
    return "unknown"


def _finding(kind: str, label: str, severity: str, count: int, confidence: int, source: str, category: str, details: list[str] | None = None, example: str = "[redacted]") -> SensitiveFinding:
    return SensitiveFinding(type=kind, label=label, severity=severity, count=count, confidence=confidence, example=example, source=source, category=category, details=details or [])


def _redacted_example(kind: str, value: str) -> str:
    if kind == "email":
        local, _, domain = value.partition("@")
        return f"{local[:1]}***@{domain}"
    if kind == "phone":
        digits = re.sub(r"\D", "", value)
        return f"•••{digits[-3:]}" if len(digits) >= 3 else "••••"
    return "[redacted]"


def _valid_phone(value: str) -> bool:
    digits = re.sub(r"\D", "", value)
    return 7 <= len(digits) <= 15 and len(set(digits)) > 1


Detector = Callable[[str, str], list[SensitiveFinding]]
DETECTORS: dict[str, Detector] = {}


def register_detector(name: str) -> Callable[[Detector], Detector]:
    def decorator(detector: Detector) -> Detector:
        DETECTORS[name] = detector
        return detector
    return decorator


@register_detector("built_in_metadata")
def _core_detector(text: str, source: str) -> list[SensitiveFinding]:
    findings: list[SensitiveFinding] = []
    emails = list(EMAIL_RE.finditer(text))
    if emails:
        findings.append(_finding("email", "Email addresses", "high", len(emails), 96, source, "identity", example=_redacted_example("email", emails[0].group())))
    phones = [match for match in PHONE_RE.finditer(text) if _valid_phone(match.group())]
    if phones:
        findings.append(_finding("phone", "Phone numbers", "high", len(phones), 88, source, "identity", example=_redacted_example("phone", phones[0].group())))
    for label, pattern in SECRET_PATTERNS:
        matches = list(pattern.finditer(text))
        if matches:
            findings.append(_finding("secret", label, "high", len(matches), 90, source, "credentials"))
    coordinates = COORDINATE_RE.findall(text)
    if coordinates or any(token in source.casefold() for token in ("timeline", "location", "gps", "latitude", "longitude")):
        findings.append(_finding("location", "Location and GPS data", "high", max(1, len(coordinates)), 84 if coordinates else 72, source, "location", ["Coordinates and location-history metadata detected"]))
    user_agents = USER_AGENT_RE.findall(text)
    resolutions = RESOLUTION_RE.findall(text)
    extensions = re.findall(r"(?:extension|chrome-extension|addon)[\s/_:\"'=\-]*[a-z0-9_-]{4,}", text, re.I)
    if user_agents or resolutions or extensions or any(token in source.casefold() for token in ("browserhistory", "device", "autofill")):
        details = []
        if user_agents: details.append("User-Agent strings")
        if resolutions: details.append("screen resolutions")
        if extensions: details.append("browser extension identifiers")
        findings.append(_finding("device", "Device and browser fingerprint signals", "medium", max(1, len(user_agents) + len(resolutions) + len(extensions)), 82, source, "device", details))
    cards = [match for match in CARD_RE.finditer(text) if len(re.sub(r"\D", "", match.group())) in {13, 14, 15, 16, 19}]
    ibans = IBAN_RE.findall(text)
    merchants = re.findall(r"(?i)\b(?:merchant|seller|payee|vendor)\s*[:=]\s*[\"']?([\w .&-]{3,60})", text)
    if cards or ibans or merchants or any(token in source.casefold() for token in ("payment", "transaction", "orderhistory")):
        details = ([f"card ending {re.sub(r'\D', '', cards[0].group())[-4:]}" ] if cards else [])
        if ibans: details.append("bank account identifier")
        if merchants: details.append("transaction merchant names")
        findings.append(_finding("financial", "Financial and payment data", "high", max(1, len(cards) + len(ibans) + len(merchants)), 86, source, "financial", details))
    contacts = re.findall(r"(?i)(?:contact|addressbook|phonebook|vcard|contacts)[\w ./_-]*", source + " " + text)
    if contacts:
        findings.append(_finding("contacts", "Shared contact graph", "high", max(1, len(contacts)), 80, source, "social", ["Contact records or address-book metadata"]))
    scopes = SCOPE_RE.findall(text)
    dangerous = [scope for scope in re.split(r"[ ,]+", " ".join(scopes).lower()) if any(token in scope for token in ("contacts", "location", "drive", "mail", "calendar", "offline", "background"))]
    if scopes or any(token in source.casefold() for token in ("oauth", "permission", "scope")):
        findings.append(_finding("permission", "OAuth and app permissions", "high" if len(dangerous) >= 2 else "medium", max(1, len(dangerous) or len(scopes)), 84, source, "permissions", ["Dangerous scopes: " + ", ".join(sorted(set(dangerous)))] if dangerous else ["Permission metadata detected"]))
    pixels = PIXEL_RE.findall(text)
    cookies = re.findall(r"(?i)\b(?:cookie|set-cookie|_ga|_gid|fbp|gclid|utm_[a-z]+)\b", text)
    if pixels or cookies or source.casefold().endswith(".har"):
        findings.append(_finding("tracking", "Cookies and tracking pixels", "medium", max(1, len(pixels) + len(cookies)), 82, source, "tracking", ["Tracking cookies or pixel markers"]))
    biometric_terms = re.findall(r"(?i)\b(?:voiceprint|voice_print|fingerprint[_ -]?template|biometric[_ -]?(?:template|reference)|face[_ -]?embedding)\b", text)
    if biometric_terms:
        findings.append(_finding("biometric", "Biometric template references", "high", len(biometric_terms), 86, source, "biometric", ["Biometric reference detected; template value discarded"]))
    return findings


def _text_findings(text: str, source: str) -> list[SensitiveFinding]:
    findings: list[SensitiveFinding] = []
    for detector in DETECTORS.values():
        findings.extend(detector(text, source))
    return findings


def _safe_members(content: bytes) -> Iterable[tuple[str, bytes]]:
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise ValueError("The uploaded archive is not valid") from exc
    infos = [info for info in archive.infolist() if not info.is_dir()]
    if len(infos) > MAX_ZIP_ENTRIES:
        raise ValueError("Archive contains too many files")
    expanded = 0
    with archive:
        for info in infos:
            path = PurePosixPath(info.filename)
            if path.is_absolute() or ".." in path.parts:
                raise ValueError("Archive contains an unsafe path")
            if info.flag_bits & 0x1:
                raise ValueError("Encrypted archive members are not supported")
            expanded += info.file_size
            if expanded > MAX_ZIP_EXPANDED_BYTES or info.file_size > MAX_MEMBER_BYTES:
                continue
            if path.suffix.casefold() in {".json", ".csv", ".txt", ".md", ".html", ".xml", ".vcf", ".log", ".png", ".jpg", ".jpeg", ".webp", ".bmp"}:
                yield info.filename, archive.read(info)


def _face_count(content: bytes) -> tuple[int, int]:
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ImportError:
        return 0, 0
    image = cv2.imdecode(np.frombuffer(content, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
    if image is None:
        return 0, 0
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(image, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    return len(faces), 78 if len(faces) else 0


def _analysis_for(findings: list[SensitiveFinding], identifiers: dict[str, set[str]], texts: list[str], previous: SensitiveScanResponse | None = None) -> SensitiveAnalysis:
    services = sorted({service for values in identifiers.values() if len(values) > 1 for service in values if service != "unknown"})
    correlation_multiplier = min(1.35, 1 + max(0, len(services) - 1) * 0.08)
    dates = []
    for text in texts:
        for value in DATE_RE.findall(text):
            try: dates.append(datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc))
            except ValueError: pass
    age = max(0, (datetime.now(timezone.utc) - max(dates)).days) if dates else None
    age_adjustment = max(0.65, min(1.1, 1.1 - ((age or 0) / 3650))) if age is not None else 1.0
    scopes = [item for finding in findings if finding.type == "permission" for item in finding.details]
    drift: list[str] = []
    if previous:
        before = {detail for item in previous.findings if item.type == "permission" for detail in item.details}
        drift = [f"New permission signal: {item}" for item in scopes if item not in before]
    categories = {finding.category for finding in findings}
    minimization = max(0, min(100, 100 - len(findings) * 8 - len(categories) * 3))
    reconstruction = []
    if "identity" in categories and "social" in categories: reconstruction.append("An attacker could connect stable identity and contact channels.")
    if "location" in categories and "device" in categories: reconstruction.append("Movement patterns could be linked to a recurring device.")
    if "financial" in categories and "identity" in categories: reconstruction.append("Financial activity could be tied to an account holder.")
    if "credentials" in categories: reconstruction.append("Credential material could enable account takeover attempts.")
    delta = []
    if previous:
        before = {(item.type, item.label): item.count for item in previous.findings}
        after = {(item.type, item.label): item.count for item in findings}
        for key, count in after.items():
            difference = count - before.get(key, 0)
            if difference: delta.append(f"{key[1]} {'increased' if difference > 0 else 'decreased'} by {abs(difference)}")
        for key, count in before.items():
            if key not in after: delta.append(f"{key[1]} removed ({count})")
    raw_score = min(100, sum(12 if item.severity == "high" else 7 for item in findings))
    forecast = max(0, round(raw_score * correlation_multiplier * age_adjustment))
    tracking_count = sum(item.count for item in findings if item.type in {"tracking", "device", "location", "permission"})
    tracking_intensity = min(100, tracking_count * 14)
    broker_map = {
        "identity": "identity-resolution brokers",
        "location": "location and mobility brokers",
        "financial": "financial and purchase-data brokers",
        "social": "people-search and social-graph brokers",
        "behavioral": "advertising data brokers",
    }
    broker_surface = sorted({broker_map[category] for category in categories if category in broker_map})
    quasi = len(categories) + (1 if "device" in categories else 0) + (1 if "social" in categories else 0)
    reidentification = min(100, quasi * 16 + (20 if services else 0))
    shadow = ["Inferred interests or profiles detected." for item in findings if item.type in {"tracking", "location"}]
    theater = ["A permission is present alongside retained or inferred data; disabling it may not delete historical collection." for item in findings if item.type == "permission" and any(word in " ".join(item.details).lower() for word in ("offline", "background", "contacts"))]
    return SensitiveAnalysis(correlated_services=services, correlation_multiplier=correlation_multiplier, exposure_age_days=age, age_adjustment=age_adjustment, permission_drift=drift, minimization_score=minimization, adversary_reconstruction=reconstruction, forecast_score=forecast, delta_summary=delta, behavioral_tracking_intensity=tracking_intensity, data_broker_surface=broker_surface, reidentification_risk=reidentification, shadow_profile_signals=sorted(set(shadow)), consent_theater_signals=sorted(set(theater)))


def _scan_entries(filename: str, sources: Iterable[tuple[str, bytes]], notes: list[str], previous: SensitiveScanResponse | None = None) -> SensitiveScanResponse:
    suffix = PurePosixPath(filename).suffix.casefold()
    findings_by_key: dict[tuple[str, str], SensitiveFinding] = {}
    identifiers: dict[str, set[str]] = defaultdict(set)
    texts: list[str] = []
    files_scanned = 0
    for source, raw in sources:
        files_scanned += 1
        member_suffix = PurePosixPath(source).suffix.casefold()
        if member_suffix in {".png", ".jpg", ".jpeg", ".webp", ".bmp"}:
            faces, confidence = _face_count(raw)
            if faces:
                key = ("face", "Face images")
                if key in findings_by_key:
                    findings_by_key[key].count += faces
                else:
                    findings_by_key[key] = _finding("face", "Face images", "high", faces, confidence, source, "biometric", ["Face pixels discarded"] , "[image discarded]")
            continue
        text = raw.decode("utf-8-sig", errors="ignore")
        texts.append(text)
        service = _service_from_source(source)
        for match in EMAIL_RE.finditer(text): identifiers["email:" + match.group().casefold()].add(service)
        for match in PHONE_RE.finditer(text):
            if _valid_phone(match.group()): identifiers["phone:" + re.sub(r"\D", "", match.group())].add(service)
        for finding in _text_findings(text, source):
            key = (finding.type, finding.label)
            if key in findings_by_key:
                findings_by_key[key].count += finding.count
            else:
                findings_by_key[key] = finding
    if suffix in {".pdf", ".docx"} and not notes:
        notes.append("Extracted text was processed in memory and never persisted.")
    findings = list(findings_by_key.values())
    analysis = _analysis_for(findings, identifiers, texts, previous)
    diff = None
    if previous:
        before = {(item.type, item.label): item for item in previous.findings}
        after = {(item.type, item.label): item for item in findings}
        diff = SensitiveDiff(
            added=[key[1] for key in after.keys() - before.keys()],
            removed=[key[1] for key in before.keys() - after.keys()],
            changed=[key[1] for key in after.keys() & before.keys() if after[key].count != before[key].count],
            risk_change=(analysis.forecast_score or 0) - (previous.analysis.forecast_score or 0),
        )
    return SensitiveScanResponse(file_name=PurePosixPath(filename).name, findings=findings, files_scanned=files_scanned, notes=notes, analysis=analysis, diff=diff)


def _safe_stream_members(stream: object) -> Iterable[tuple[str, bytes]]:
    # ZipFile reads the central directory, but each member payload is read and released one at a time.
    archive = zipfile.ZipFile(stream)  # type: ignore[arg-type]
    infos = [info for info in archive.infolist() if not info.is_dir()]
    if len(infos) > MAX_ZIP_ENTRIES:
        archive.close()
        raise ValueError("Archive contains too many files")
    expanded = 0
    try:
        for info in infos:
            path = PurePosixPath(info.filename)
            if path.is_absolute() or ".." in path.parts:
                raise ValueError("Archive contains an unsafe path")
            if info.flag_bits & 0x1:
                raise ValueError("Encrypted archive members are not supported")
            expanded += info.file_size
            if expanded > MAX_ZIP_EXPANDED_BYTES or info.file_size > MAX_MEMBER_BYTES:
                continue
            if path.suffix.casefold() in {".json", ".csv", ".txt", ".md", ".html", ".xml", ".vcf", ".log", ".png", ".jpg", ".jpeg", ".webp", ".bmp"}:
                yield info.filename, archive.read(info)
    finally:
        archive.close()


def scan_sensitive_stream(filename: str, stream: object, previous: SensitiveScanResponse | None = None) -> SensitiveScanResponse:
    if PurePosixPath(filename).suffix.casefold() != ".zip":
        raise ValueError("Streaming mode currently supports ZIP exports only")
    return _scan_entries(filename, _safe_stream_members(stream), ["ZIP entries were processed sequentially; member payloads were released after each detector pass."], previous)


def scan_sensitive_file(filename: str, content: bytes, previous: SensitiveScanResponse | None = None) -> SensitiveScanResponse:
    if len(content) > MAX_SCAN_BYTES:
        raise ValueError("Sensitive scan exceeds the 25 MB limit")
    suffix = PurePosixPath(filename).suffix.casefold()
    notes: list[str] = []
    if suffix == ".zip":
        sources = _safe_members(content)
    elif suffix in {".json", ".csv", ".txt", ".md", ".html", ".xml", ".vcf", ".log"}:
        sources = [(PurePosixPath(filename).name, content)]
    elif suffix in {".png", ".jpg", ".jpeg", ".webp", ".bmp"}:
        faces, confidence = _face_count(content)
        if faces:
            notes.append("Face pixels were processed in memory and discarded immediately.")
            return SensitiveScanResponse(file_name=PurePosixPath(filename).name, findings=[SensitiveFinding(type="face", label="Face images", severity="high", count=faces, confidence=confidence, example="[image discarded]", source="Image pixels")], files_scanned=1, notes=notes)
        notes.append("No face was reported. OpenCV is optional; install it for local image face detection.")
        return SensitiveScanResponse(file_name=PurePosixPath(filename).name, findings=[], files_scanned=1, notes=notes)
    elif suffix == ".docx":
        try:
            sources = _safe_members(content)
        except ValueError:
            sources = []
        notes.append("DOCX text was inspected from its XML parts without storing the document.")
    elif suffix == ".pdf":
        try:
            from pypdf import PdfReader  # type: ignore
            reader = PdfReader(io.BytesIO(content))
            sources = [(f"page-{index + 1}", (page.extract_text() or "").encode("utf-8", "ignore")) for index, page in enumerate(reader.pages[:50])]
        except Exception:
            sources = []
            notes.append("Install pypdf to enable backend PDF text extraction; the browser Local Scanner remains available.")
    else:
        raise ValueError("Supported types are ZIP, JSON, CSV, TXT, images, PDF, and DOCX")

    return _scan_entries(filename, sources, notes, previous)
