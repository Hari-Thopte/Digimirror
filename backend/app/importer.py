from __future__ import annotations

import csv
import io
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from pathlib import PurePosixPath
from typing import Any

from fastapi import UploadFile
from pydantic import ValidationError

from .models import PrivacyExport, PrivacyRecord


MAX_TEXT_UPLOAD_BYTES = 2 * 1024 * 1024
MAX_ZIP_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_ZIP_ENTRIES = 500
MAX_ZIP_UNCOMPRESSED_BYTES = 60 * 1024 * 1024
MAX_ZIP_ENTRY_BYTES = 12 * 1024 * 1024
MAX_PARSED_MEMBER_BYTES = 5 * 1024 * 1024
MAX_COMPRESSION_RATIO = 120
MAX_CSV_ROWS = 1000
ALLOWED_SUFFIXES = {".json", ".csv", ".zip"}
TAKEOUT_ADAPTER_VERSION = "google-takeout-v1"

FIELD_ALIASES = {
    "phone": "phone_number",
    "mobile": "phone_number",
    "mobile_number": "phone_number",
    "telephone": "phone_number",
    "email": "email_address",
    "email_id": "email_address",
    "mail": "email_address",
    "location": "precise_location",
    "gps_location": "precise_location",
    "address": "home_address",
    "shipping_address": "home_address",
    "orders": "purchase_history",
    "purchases": "purchase_history",
    "browsing": "browsing_interests",
    "interests": "browsing_interests",
    "listening": "listening_activity",
    "device": "device_identifier",
    "device_id": "device_identifier",
    "payment": "saved_payment_method",
    "saved_card": "saved_payment_method",
}

EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
PHONE_PATTERN = re.compile(r"(?<!\w)(?:\+?\d[\d .()\-]{7,}\d)(?!\w)")
COORDINATE_PATTERN = re.compile(r"[-+]?\d{1,3}\.\d{3,}\s*,\s*[-+]?\d{1,3}\.\d{3,}")
URL_PATTERN = re.compile(r"https?://\S+", re.IGNORECASE)


class PrivacyImportError(ValueError):
    def __init__(self, message: str, status_code: int = 422) -> None:
        super().__init__(message)
        self.status_code = status_code


def normalize_field_name(value: str) -> str:
    if EMAIL_PATTERN.search(value):
        return "email_address"
    if PHONE_PATTERN.search(value):
        return "phone_number"
    if COORDINATE_PATTERN.search(value):
        return "precise_location"
    if URL_PATTERN.search(value):
        return "browsing_interests"
    normalized = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    normalized = FIELD_ALIASES.get(normalized, normalized)
    return normalized or "other_personal_info"


def _sanitize_metadata(value: str, fallback: str) -> str:
    sanitized = URL_PATTERN.sub("[redacted URL]", value)
    sanitized = EMAIL_PATTERN.sub("[redacted email]", sanitized)
    sanitized = COORDINATE_PATTERN.sub("[redacted coordinates]", sanitized)
    sanitized = PHONE_PATTERN.sub("[redacted phone]", sanitized)
    sanitized = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", sanitized).strip()
    return sanitized or fallback


def _validate_payload(payload: Any) -> PrivacyExport:
    if isinstance(payload, list):
        payload = {"export_version": 1, "items": payload}
    elif isinstance(payload, dict) and "items" not in payload:
        if isinstance(payload.get("records"), list):
            payload = {**payload, "items": payload["records"]}

    try:
        export = PrivacyExport.model_validate(payload)
    except ValidationError as exc:
        first_error = exc.errors(include_url=False)[0]
        location = ".".join(str(part) for part in first_error.get("loc", []))
        detail = first_error.get("msg", "invalid export")
        raise PrivacyImportError(f"Invalid privacy export at {location}: {detail}") from exc

    normalized_items = []
    for item in export.items:
        normalized_items.append(
            item.model_copy(
                update={
                    "field": normalize_field_name(item.field),
                    "source": _sanitize_metadata(item.source, "Imported source"),
                    "action": _sanitize_metadata(item.action, "Imported from the account privacy export"),
                    "recipients": [
                        _sanitize_metadata(recipient, "Imported recipient")
                        for recipient in item.recipients
                    ],
                    "evidence_file": _sanitize_metadata(item.evidence_file, "Imported evidence") if item.evidence_file else None,
                }
            )
        )
    return export.model_copy(update={"items": normalized_items})


def parse_json_export(text: str) -> PrivacyExport:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise PrivacyImportError(
            f"Invalid JSON near line {exc.lineno}, column {exc.colno}"
        ) from exc
    return _validate_payload(payload)


def parse_csv_export(text: str) -> PrivacyExport:
    try:
        reader = csv.DictReader(io.StringIO(text, newline=""))
        headers = {header.strip().lower() for header in (reader.fieldnames or []) if header}
        required = {"field", "source", "visibility"}
        missing = sorted(required - headers)
        if missing:
            raise PrivacyImportError(
                f"CSV is missing required columns: {', '.join(missing)}"
            )

        records: list[PrivacyRecord] = []
        for index, row in enumerate(reader, start=2):
            if len(records) >= MAX_CSV_ROWS:
                raise PrivacyImportError(f"CSV cannot contain more than {MAX_CSV_ROWS} rows")
            normalized_row = {
                str(key).strip().lower(): value
                for key, value in row.items()
                if key is not None
            }
            if not any((value or "").strip() for value in normalized_row.values()):
                continue
            try:
                records.append(PrivacyRecord.model_validate(normalized_row))
            except ValidationError as exc:
                detail = exc.errors(include_url=False)[0].get("msg", "invalid row")
                raise PrivacyImportError(f"Invalid CSV row {index}: {detail}") from exc
    except csv.Error as exc:
        raise PrivacyImportError(f"Invalid CSV: {exc}") from exc

    return _validate_payload({"export_version": 1, "items": records})


def _validate_zip_member(info: zipfile.ZipInfo) -> PurePosixPath:
    normalized_name = info.filename.replace("\\", "/")
    path = PurePosixPath(normalized_name)
    if path.is_absolute() or ".." in path.parts:
        raise PrivacyImportError("Takeout archive contains an unsafe file path", 415)
    if info.flag_bits & 0x1:
        raise PrivacyImportError("Encrypted ZIP entries are not supported", 415)
    if info.file_size > MAX_ZIP_ENTRY_BYTES:
        raise PrivacyImportError("Takeout archive contains an oversized entry", 413)
    if info.file_size and info.compress_size:
        ratio = info.file_size / info.compress_size
        if ratio > MAX_COMPRESSION_RATIO:
            raise PrivacyImportError("Takeout archive has an unsafe compression ratio", 413)
    return path


def _load_json_member(
    archive: zipfile.ZipFile, info: zipfile.ZipInfo
) -> Any | None:
    if info.file_size > MAX_PARSED_MEMBER_BYTES:
        return None
    try:
        return json.loads(archive.read(info).decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError, RuntimeError):
        return None


def _collect_json_keys(payload: Any, limit: int = 5000) -> set[str]:
    keys: set[str] = set()
    stack = [payload]
    visited = 0
    while stack and visited < limit:
        current = stack.pop()
        visited += 1
        if isinstance(current, dict):
            for key, value in current.items():
                keys.add(str(key).casefold().replace(" ", "_"))
                if isinstance(value, (dict, list)):
                    stack.append(value)
        elif isinstance(current, list):
            stack.extend(item for item in current[:1000] if isinstance(item, (dict, list)))
    return keys


def _latest_chrome_timestamp(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    history = payload.get("Browser History") or payload.get("browser_history")
    if not isinstance(history, list):
        return None
    timestamps = [
        item.get("time_usec")
        for item in history
        if isinstance(item, dict) and isinstance(item.get("time_usec"), (int, float))
    ]
    if not timestamps:
        return None
    try:
        return datetime.fromtimestamp(
            max(timestamps) / 1_000_000,
            tz=timezone.utc,
        ).isoformat()
    except (OverflowError, OSError, ValueError):
        return None


def parse_supported_export_zip(content: bytes) -> PrivacyExport:
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise PrivacyImportError("The uploaded ZIP is not a valid archive", 415) from exc

    records: list[PrivacyRecord] = []
    seen: set[tuple[str, str]] = set()
    processed_files = 0
    providers: set[str] = set()

    def add_record(
        *,
        field: str,
        source: str,
        visibility: str,
        action: str,
        recipients: list[str],
        permission_status: str,
        evidence_file: str,
        observed_at: str | None = None,
    ) -> None:
        key = (field, source)
        if key in seen:
            return
        seen.add(key)
        records.append(
            PrivacyRecord(
                field=field,
                source=source,
                visibility=visibility,
                action=action,
                recipients=recipients,
                permission_status=permission_status,
                evidence_file=evidence_file,
                observed_at=observed_at,
            )
        )

    with archive:
        infos = [info for info in archive.infolist() if not info.is_dir()]
        if len(infos) > MAX_ZIP_ENTRIES:
            raise PrivacyImportError(
                f"Takeout archive cannot contain more than {MAX_ZIP_ENTRIES} files",
                413,
            )

        total_uncompressed = 0
        validated: list[tuple[zipfile.ZipInfo, PurePosixPath]] = []
        for info in infos:
            path = _validate_zip_member(info)
            total_uncompressed += info.file_size
            if total_uncompressed > MAX_ZIP_UNCOMPRESSED_BYTES:
                raise PrivacyImportError(
                    "Takeout archive expands beyond the 60 MB processing limit",
                    413,
                )
            validated.append((info, path))

        for info, path in validated:
            lower_path = "/".join(path.parts).casefold()
            suffix = path.suffix.casefold()
            if suffix not in {".json", ".csv", ".html", ".vcf"}:
                continue

            payload = _load_json_member(archive, info) if suffix == ".json" else None
            keys = _collect_json_keys(payload) if payload is not None else set()
            recognized = False

            if "chrome" in lower_path and (
                "browserhistory" in lower_path
                or "browser_history" in keys
                or lower_path.endswith("/history.json")
            ):
                add_record(
                    field="browsing_interests",
                    source="Google Chrome browsing history",
                    visibility="stored",
                    action="Browsed while Chrome history or sync was enabled",
                    recipients=["Google Chrome history", "Chrome Sync (if enabled)"],
                    permission_status="enabled",
                    evidence_file="Chrome/BrowserHistory.json",
                    observed_at=_latest_chrome_timestamp(payload),
                )
                recognized = True

            if "chrome" in lower_path and (
                "autofill" in lower_path
                or "addresses" in lower_path
                or "autofill_profile" in keys
                or "contact_info" in keys
            ):
                evidence = "Chrome/Autofill.json"
                if not keys or any("email" in key for key in keys):
                    add_record(
                        field="email_address",
                        source="Google Chrome Autofill",
                        visibility="stored",
                        action="Saved contact details to Chrome Autofill",
                        recipients=["Chrome Autofill", "Chrome Sync (if enabled)"],
                        permission_status="enabled",
                        evidence_file=evidence,
                    )
                if not keys or any("phone" in key or "mobile" in key for key in keys):
                    add_record(
                        field="phone_number",
                        source="Google Chrome Autofill",
                        visibility="stored",
                        action="Saved contact details to Chrome Autofill",
                        recipients=["Chrome Autofill", "Chrome Sync (if enabled)"],
                        permission_status="enabled",
                        evidence_file=evidence,
                    )
                if not keys or any("address" in key for key in keys):
                    add_record(
                        field="home_address",
                        source="Google Chrome Autofill",
                        visibility="stored",
                        action="Saved an address to Chrome Autofill",
                        recipients=["Chrome Autofill", "Chrome Sync (if enabled)"],
                        permission_status="enabled",
                        evidence_file=evidence,
                    )
                recognized = True

            if (
                "location history" in lower_path
                or "location_history" in lower_path
                or ("timeline" in lower_path and "records" in lower_path)
            ):
                add_record(
                    field="precise_location",
                    source="Google Maps Timeline",
                    visibility="stored",
                    action="Kept Timeline or Location History enabled",
                    recipients=["Google Maps Timeline", "Google account activity"],
                    permission_status="enabled",
                    evidence_file="Location History/Records.json",
                )
                recognized = True

            if "maps" in lower_path and {"geometry", "coordinates"}.intersection(keys):
                add_record(
                    field="precise_location",
                    source="Google Maps saved places",
                    visibility="stored",
                    action="Saved, pinned, or contributed a place in Google Maps",
                    recipients=["Google Maps account data"],
                    permission_status="unknown",
                    evidence_file="Maps/Saved places.json",
                )
                recognized = True

            if "youtube" in lower_path and (
                "watch-history" in lower_path or "/history/" in lower_path
            ):
                add_record(
                    field="browsing_interests",
                    source="YouTube watch history",
                    visibility="inferred",
                    action="Watched videos while YouTube history was enabled",
                    recipients=["YouTube recommendation models", "Google account activity"],
                    permission_status="enabled",
                    evidence_file="YouTube/history/watch-history",
                )
                if "music" in lower_path:
                    add_record(
                        field="listening_activity",
                        source="YouTube Music history",
                        visibility="inferred",
                        action="Listened while YouTube Music history was enabled",
                        recipients=["YouTube Music recommendation models"],
                        permission_status="enabled",
                        evidence_file="YouTube Music/history",
                    )
                recognized = True

            if "my activity" in lower_path and "search" in lower_path:
                add_record(
                    field="browsing_interests",
                    source="Google Search activity",
                    visibility="inferred",
                    action="Searched while Web & App Activity was enabled",
                    recipients=["Google account activity", "Google personalization"],
                    permission_status="enabled",
                    evidence_file="My Activity/Search",
                )
                recognized = True

            if "takeout/contacts" in lower_path and suffix in {".csv", ".vcf", ".json"}:
                add_record(
                    field="email_address",
                    source="Google Contacts",
                    visibility="stored",
                    action="Saved and synced contact information",
                    recipients=["Google Contacts", "Synced devices"],
                    permission_status="enabled",
                    evidence_file="Contacts/export",
                )
                add_record(
                    field="phone_number",
                    source="Google Contacts",
                    visibility="stored",
                    action="Saved and synced contact information",
                    recipients=["Google Contacts", "Synced devices"],
                    permission_status="enabled",
                    evidence_file="Contacts/export",
                )
                recognized = True

            if "google pay" in lower_path or "googlepay" in lower_path:
                if "transaction" in lower_path or "purchase" in lower_path:
                    add_record(
                        field="purchase_history",
                        source="Google Pay activity",
                        visibility="stored",
                        action="Completed purchases using Google Pay",
                        recipients=["Google Pay account activity"],
                        permission_status="unknown",
                        evidence_file="Google Pay/transactions",
                    )
                    recognized = True
                if "payment" in lower_path or "card" in lower_path:
                    add_record(
                        field="saved_payment_method",
                        source="Google Pay payment methods",
                        visibility="stored",
                        action="Saved a payment method to the Google account",
                        recipients=["Google Payments profile"],
                        permission_status="unknown",
                        evidence_file="Google Pay/payment methods",
                    )
                    recognized = True

            meta_hint = any(
                token in lower_path
                for token in (
                    "instagram",
                    "facebook",
                    "personal_information/",
                    "your_instagram_activity/",
                    "ads_information/",
                )
            )
            if meta_hint and any(
                token in lower_path
                for token in ("profile_information", "personal_information", "account_information")
            ):
                if not keys or any("email" in key for key in keys):
                    add_record(
                        field="email_address",
                        source="Meta account profile",
                        visibility="stored",
                        action="Added an email address to the account profile",
                        recipients=["Meta account systems", "Connected Meta profiles"],
                        permission_status="unknown",
                        evidence_file="Meta/profile_information.json",
                    )
                if not keys or any("phone" in key or "mobile" in key for key in keys):
                    add_record(
                        field="phone_number",
                        source="Meta account profile",
                        visibility="stored",
                        action="Added a phone number to the account profile",
                        recipients=["Meta account systems", "Contact discovery if enabled"],
                        permission_status="unknown",
                        evidence_file="Meta/profile_information.json",
                    )
                recognized = True
                providers.add("meta")

            if meta_hint and any(token in lower_path for token in ("synced_contacts", "uploaded_contacts", "contact_syncing")):
                add_record(
                    field="phone_number",
                    source="Instagram or Facebook contact syncing",
                    visibility="shared",
                    action="Enabled contact uploading or contact discovery",
                    recipients=["Meta contact matching", "People who already have the number"],
                    permission_status="enabled",
                    evidence_file="Meta/synced_contacts.json",
                )
                add_record(
                    field="email_address",
                    source="Instagram or Facebook contact syncing",
                    visibility="shared",
                    action="Enabled contact uploading or contact discovery",
                    recipients=["Meta contact matching"],
                    permission_status="enabled",
                    evidence_file="Meta/synced_contacts.json",
                )
                recognized = True
                providers.add("meta")

            if meta_hint and "location" in lower_path:
                add_record(
                    field="precise_location",
                    source="Meta location activity",
                    visibility="stored",
                    action="Used location-enabled features or attached locations to activity",
                    recipients=["Meta account activity", "Location personalization"],
                    permission_status="unknown",
                    evidence_file="Meta/location_information.json",
                )
                recognized = True
                providers.add("meta")

            if meta_hint and any(token in lower_path for token in ("ads_information", "ads_interests", "your_topics", "off_meta")):
                add_record(
                    field="browsing_interests",
                    source="Meta advertising profile",
                    visibility="inferred",
                    action="Interacted with content or allowed activity-based ad personalization",
                    recipients=["Meta advertising systems", "Advertiser audience segments"],
                    permission_status="enabled",
                    evidence_file="Meta/ads_information.json",
                )
                recognized = True
                providers.add("meta")

            filename_key = path.name.casefold().replace(" ", "_")
            spotify_hint = "spotify" in lower_path or any(
                token in filename_key
                for token in ("streaming_history", "streaminghistory", "endsong", "searchqueries", "yourlibrary", "userdata", "identity")
            )
            if spotify_hint and any(token in filename_key for token in ("streaming", "endsong", "yourlibrary")):
                add_record(
                    field="listening_activity",
                    source="Spotify listening history",
                    visibility="inferred",
                    action="Listened while streaming history and personalization were enabled",
                    recipients=["Spotify recommendation models", "Audience measurement"],
                    permission_status="enabled",
                    evidence_file="Spotify/StreamingHistory.json",
                )
                recognized = True
                providers.add("spotify")

            if spotify_hint and "search" in filename_key:
                add_record(
                    field="browsing_interests",
                    source="Spotify search history",
                    visibility="inferred",
                    action="Searched while account activity was retained",
                    recipients=["Spotify personalization"],
                    permission_status="enabled",
                    evidence_file="Spotify/SearchQueries.json",
                )
                recognized = True
                providers.add("spotify")

            if spotify_hint and any(token in filename_key for token in ("userdata", "identity")):
                add_record(
                    field="email_address",
                    source="Spotify account profile",
                    visibility="stored",
                    action="Created and maintained a Spotify account",
                    recipients=["Spotify account systems"],
                    permission_status="unknown",
                    evidence_file="Spotify/Identity.json",
                )
                recognized = True
                providers.add("spotify")

            commerce_hint = "amazon" in lower_path or any(
                token in filename_key
                for token in ("orderhistory", "order_history", "retail.orders", "digital-orders", "shipping_address", "payment_method")
            )
            if commerce_hint and any(token in filename_key for token in ("order", "purchase", "transaction")):
                add_record(
                    field="purchase_history",
                    source="Commerce order history",
                    visibility="stored",
                    action="Placed orders while account history retention was enabled",
                    recipients=["Commerce account systems", "Fulfillment and seller systems"],
                    permission_status="unknown",
                    evidence_file="Commerce/OrderHistory.csv",
                )
                recognized = True
                providers.add("commerce")

            if commerce_hint and "address" in filename_key:
                add_record(
                    field="home_address",
                    source="Commerce saved addresses",
                    visibility="shared",
                    action="Saved or used an address for fulfillment",
                    recipients=["Commerce fulfillment", "Delivery partners"],
                    permission_status="unknown",
                    evidence_file="Commerce/Addresses.csv",
                )
                recognized = True
                providers.add("commerce")

            if commerce_hint and any(token in filename_key for token in ("payment", "wallet", "card")):
                add_record(
                    field="saved_payment_method",
                    source="Commerce payment profile",
                    visibility="stored",
                    action="Saved a payment method for checkout",
                    recipients=["Commerce payments profile", "Payment processors"],
                    permission_status="unknown",
                    evidence_file="Commerce/PaymentMethods.csv",
                )
                recognized = True
                providers.add("commerce")

            if recognized and not meta_hint and not spotify_hint and not commerce_hint:
                providers.add("google")

            if recognized:
                processed_files += 1

    if not records:
        raise PrivacyImportError(
            "No supported Google, Instagram/Facebook, Spotify, or commerce export data was found in this archive"
        )

    import_type = (
        "multi_platform"
        if len(providers) > 1
        else {
            "google": "google_takeout",
            "meta": "instagram_export",
            "spotify": "spotify_export",
            "commerce": "commerce_export",
        }[next(iter(providers))]
    )

    return PrivacyExport(
        export_version=1,
        items=records,
        import_type=import_type,
        processed_files=processed_files,
        adapter_version=(TAKEOUT_ADAPTER_VERSION if import_type == "google_takeout" else "unified-export-v1"),
    )


def extract_searchable_fragments(content: bytes, suffix: str) -> list[str]:
    """Extract text in memory for exact canary matching without returning file contents."""
    if suffix != ".zip":
        try:
            return [content.decode("utf-8-sig")]
        except UnicodeDecodeError as exc:
            raise PrivacyImportError("Canary scans require UTF-8 text or a supported ZIP archive", 415) from exc
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as exc:
        raise PrivacyImportError("The uploaded ZIP is not a valid archive", 415) from exc
    fragments: list[str] = []
    with archive:
        infos = [info for info in archive.infolist() if not info.is_dir()]
        if len(infos) > MAX_ZIP_ENTRIES:
            raise PrivacyImportError("Archive contains too many files", 413)
        total_uncompressed = 0
        for info in infos:
            path = _validate_zip_member(info)
            total_uncompressed += info.file_size
            if total_uncompressed > MAX_ZIP_UNCOMPRESSED_BYTES:
                raise PrivacyImportError("Archive expands beyond the processing limit", 413)
            if path.suffix.casefold() not in {".json", ".csv", ".html", ".txt", ".vcf"}:
                continue
            if info.file_size > MAX_PARSED_MEMBER_BYTES:
                continue
            try:
                fragments.append(archive.read(info).decode("utf-8-sig"))
            except (UnicodeDecodeError, RuntimeError):
                continue
    return fragments


async def import_privacy_file(upload: UploadFile) -> PrivacyExport:
    filename = Path(upload.filename or "").name
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise PrivacyImportError(
            "Only .json, .csv, and Google Takeout .zip exports are accepted",
            415,
        )

    max_bytes = MAX_ZIP_UPLOAD_BYTES if suffix == ".zip" else MAX_TEXT_UPLOAD_BYTES
    content = await upload.read(max_bytes + 1)
    await upload.close()
    if len(content) > max_bytes:
        limit = "25 MB" if suffix == ".zip" else "2 MB"
        raise PrivacyImportError(f"Privacy export exceeds the {limit} upload limit", 413)
    if not content:
        raise PrivacyImportError("Privacy export is empty")
    if suffix != ".zip" and b"\x00" in content:
        raise PrivacyImportError("Binary files are not accepted", 415)

    if suffix == ".zip":
        return parse_supported_export_zip(content)

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise PrivacyImportError("Privacy export must use UTF-8 encoding", 415) from exc

    return parse_json_export(text) if suffix == ".json" else parse_csv_export(text)
