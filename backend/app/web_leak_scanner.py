"""web_leak_scanner.py - privacy-safe public web scraper for data-leak signals.

Checks a supplied list of public HTTPS URLs for the presence of:
- A given email address
- A given phone number (multiple normalised forms)
- Image/photo exposure signals (og:image, img srcs, CDN patterns)

Design decisions
----------------
* Only public HTTPS URLs are accepted; private/LAN hosts are rejected.
* No raw personal values are stored or returned; only derived signals are kept.
* The response stores only match counts, page metadata, and risk labels.
* Relies solely on httpx (already in requirements) plus the stdlib.
"""

from __future__ import annotations

import asyncio
import ipaddress
import re
import socket
import unicodedata
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import urlparse

import httpx

MAX_PAGE_BYTES = 512 * 1024
REQUEST_TIMEOUT = httpx.Timeout(10.0, connect=5.0)
MAX_URLS = 10
USER_AGENT = "DigiMirror-LeakScanner/0.1 (privacy-safety research)"

_PHONE_STRIP_RE = re.compile(r"[\s\-\.\(\)\+]")

_PHONE_CONTEXT_RE = re.compile(
    r"(?:(?:\+|00)\d{1,3}[\s\-\.]?)?\(?\d{3,5}\)?[\s\-\.]?\d{3,4}[\s\-\.]?\d{2,4}(?:\s*(?:ext|x|#)\s*\d{1,6})?",
    re.IGNORECASE,
)

_OG_IMAGE_RE = re.compile(
    r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_OG_IMAGE_CONTENT_FIRST = re.compile(
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
    re.IGNORECASE,
)
_TWITTER_IMAGE_RE = re.compile(
    r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)

_IMG_SRC_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)

_PROFILE_HINT_RE = re.compile(
    r"(avatar|profile|photo|headshot|portrait|user|member|account|face)",
    re.IGNORECASE,
)

_EMAIL_ROUGH_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]{1,64}@[a-zA-Z0-9.\-]{1,253}\.[a-zA-Z]{2,10}",
)


async def _resolve_and_guard(hostname: str) -> None:
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(
            hostname, 443, type=socket.SOCK_STREAM
        )
    except socket.gaierror as exc:
        raise ValueError(f"Hostname could not be resolved: {hostname}") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global:
            raise ValueError(f"Private/local network targets are blocked: {hostname}")


def _validate_https_url(raw: str) -> str:
    raw = raw.strip()
    if "://" not in raw:
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    if parsed.scheme != "https":
        raise ValueError(f"Only HTTPS URLs are accepted: {raw}")
    if not parsed.hostname:
        raise ValueError(f"URL has no hostname: {raw}")
    if parsed.username or parsed.password:
        raise ValueError("URLs with credentials are not accepted")
    if parsed.port not in (None, 443):
        raise ValueError("Only the standard HTTPS port (443) is supported")
    hostname = parsed.hostname.casefold().rstrip(".")
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("Local targets are not allowed")
    return raw


def _normalise_phone(raw: str) -> str:
    raw = unicodedata.normalize("NFKC", raw)
    return _PHONE_STRIP_RE.sub("", raw)


def _extract_emails(html: str) -> list[str]:
    return list(dict.fromkeys(_EMAIL_ROUGH_RE.findall(html)))


def _extract_phones(html: str) -> list[str]:
    return list(dict.fromkeys(m.group(0).strip() for m in _PHONE_CONTEXT_RE.finditer(html)))


def _extract_og_images(html: str) -> list[str]:
    images: list[str] = []
    for pattern in (_OG_IMAGE_RE, _OG_IMAGE_CONTENT_FIRST, _TWITTER_IMAGE_RE):
        images.extend(pattern.findall(html))
    return list(dict.fromkeys(images))


def _extract_profile_images(html: str) -> list[str]:
    results: list[str] = []
    for match in _IMG_SRC_RE.finditer(html):
        src = match.group(1)
        start = max(0, match.start() - 60)
        end = min(len(html), match.end() + 60)
        context = html[start:end]
        if _PROFILE_HINT_RE.search(context) or _PROFILE_HINT_RE.search(src):
            results.append(src)
    return list(dict.fromkeys(results))


def _email_found(html: str, email_lower: str) -> bool:
    for found in _extract_emails(html):
        if found.lower() == email_lower:
            return True
    return False


def _phone_found(html: str, normalised_digits: str) -> bool:
    for raw in _extract_phones(html):
        candidate_digits = _normalise_phone(raw)
        if candidate_digits == normalised_digits:
            return True
        if len(normalised_digits) >= 7 and candidate_digits.endswith(normalised_digits):
            return True
        if len(normalised_digits) >= 7 and normalised_digits.endswith(candidate_digits) and len(candidate_digits) >= 7:
            return True
    return False


class PageLeakResult:
    def __init__(
        self,
        url: str,
        status_code: int | None,
        reachable: bool,
        email_found: bool,
        phone_found: bool,
        og_images: list[str],
        profile_images: list[str],
        page_title: str,
        error: str | None,
    ):
        self.url = url
        self.status_code = status_code
        self.reachable = reachable
        self.email_found = email_found
        self.phone_found = phone_found
        self.og_images = og_images[:5]
        self.profile_images = profile_images[:5]
        self.photo_signal_found = bool(og_images or profile_images)
        self.page_title = page_title
        self.error = error

    @property
    def risk_level(self) -> Literal["high", "medium", "none"]:
        hits = sum([self.email_found, self.phone_found, self.photo_signal_found])
        if hits >= 2:
            return "high"
        if hits == 1:
            return "medium"
        return "none"

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "status_code": self.status_code,
            "reachable": self.reachable,
            "email_found": self.email_found,
            "phone_found": self.phone_found,
            "photo_signal_found": self.photo_signal_found,
            "og_images": self.og_images,
            "profile_images": self.profile_images,
            "page_title": self.page_title,
            "risk_level": self.risk_level,
            "error": self.error,
        }


async def _scrape_one(
    client: httpx.AsyncClient,
    url: str,
    email_lower: str | None,
    normalised_phone: str | None,
) -> PageLeakResult:
    try:
        response = await client.get(url)
        status_code = response.status_code
        html = response.text

        title_match = re.search(r"<title[^>]*>([^<]{1,200})</title>", html, re.IGNORECASE)
        page_title = title_match.group(1).strip() if title_match else url

        email_hit = _email_found(html, email_lower) if email_lower else False
        phone_hit = _phone_found(html, normalised_phone) if normalised_phone else False
        og_images = _extract_og_images(html)
        profile_images = _extract_profile_images(html)

        return PageLeakResult(
            url=url,
            status_code=status_code,
            reachable=True,
            email_found=email_hit,
            phone_found=phone_hit,
            og_images=og_images,
            profile_images=profile_images,
            page_title=page_title,
            error=None,
        )
    except httpx.HTTPError as exc:
        return PageLeakResult(
            url=url,
            status_code=None,
            reachable=False,
            email_found=False,
            phone_found=False,
            og_images=[],
            profile_images=[],
            page_title=url,
            error=str(exc)[:200],
        )


async def run_leak_scan(
    urls: list[str],
    email: str | None = None,
    phone: str | None = None,
) -> dict:
    """Scrape each URL and return a privacy-safe leak-signal report."""
    if len(urls) > MAX_URLS:
        raise ValueError(f"A maximum of {MAX_URLS} URLs may be scanned at once")

    cleaned_urls: list[str] = []
    for raw_url in urls:
        validated = _validate_https_url(raw_url)
        hostname = urlparse(validated).hostname or ""
        await _resolve_and_guard(hostname)
        cleaned_urls.append(validated)

    email_lower = email.strip().lower() if email else None
    normalised_phone = _normalise_phone(phone) if phone else None

    async with httpx.AsyncClient(
        timeout=REQUEST_TIMEOUT,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,*/*"},
        follow_redirects=True,
        max_redirects=3,
        limits=httpx.Limits(max_connections=5),
    ) as client:
        tasks = [_scrape_one(client, url, email_lower, normalised_phone) for url in cleaned_urls]
        page_results: list[PageLeakResult] = await asyncio.gather(*tasks)

    pages_with_email = sum(1 for p in page_results if p.email_found)
    pages_with_phone = sum(1 for p in page_results if p.phone_found)
    pages_with_photo = sum(1 for p in page_results if p.photo_signal_found)
    high_risk_pages = sum(1 for p in page_results if p.risk_level == "high")
    medium_risk_pages = sum(1 for p in page_results if p.risk_level == "medium")

    overall_risk: Literal["high", "medium", "low", "clean"] = "clean"
    if high_risk_pages > 0:
        overall_risk = "high"
    elif medium_risk_pages > 0:
        overall_risk = "medium"
    elif pages_with_email or pages_with_phone or pages_with_photo:
        overall_risk = "low"

    return {
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "urls_scanned": len(cleaned_urls),
        "email_searched": email_lower is not None,
        "phone_searched": normalised_phone is not None,
        "overall_risk": overall_risk,
        "pages_with_email_match": pages_with_email,
        "pages_with_phone_match": pages_with_phone,
        "pages_with_photo_signal": pages_with_photo,
        "high_risk_pages": high_risk_pages,
        "medium_risk_pages": medium_risk_pages,
        "raw_values_stored": False,
        "pages": [p.to_dict() for p in page_results],
    }
