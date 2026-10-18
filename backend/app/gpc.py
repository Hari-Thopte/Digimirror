from __future__ import annotations

import asyncio
import ipaddress
import json
import socket
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

import httpx

from .models import GpcCheckResult


MAX_GPC_RESPONSE_BYTES = 512 * 1024


async def _safe_https_url(value: str, *, support_path: bool = False) -> tuple[str, str]:
    candidate = value.strip()
    if "://" not in candidate:
        candidate = f"https://{candidate}"
    parsed = urlparse(candidate)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Enter a public HTTPS website")
    if parsed.port not in (None, 443):
        raise ValueError("Only the standard HTTPS port is supported")
    hostname = parsed.hostname.casefold().rstrip(".")
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("Local and private network targets are blocked")
    try:
        addresses = await asyncio.get_running_loop().getaddrinfo(
            hostname, 443, type=socket.SOCK_STREAM
        )
    except socket.gaierror as exc:
        raise ValueError("The website hostname could not be resolved") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise ValueError("Local and private network targets are blocked")
    url = f"https://{hostname}"
    if support_path:
        url += "/.well-known/gpc.json"
    else:
        url = candidate
    return url, hostname


async def check_gpc_support(value: str) -> GpcCheckResult:
    target, hostname = await _safe_https_url(value, support_path=True)
    status_code: int | None = None
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(8.0, connect=4.0),
        headers={"Sec-GPC": "1", "Accept": "application/json", "User-Agent": "DigiMirror-GPC-Inspector/0.2"},
        follow_redirects=False,
    ) as client:
        for _ in range(3):
            response = await client.get(target)
            status_code = response.status_code
            if response.is_redirect and response.headers.get("location"):
                redirected = urljoin(target, response.headers["location"])
                target, _ = await _safe_https_url(redirected)
                continue
            break
        else:
            raise ValueError("The GPC support resource redirected too many times")

    content_type = response.headers.get("content-type", "").casefold()
    if len(response.content) > MAX_GPC_RESPONSE_BYTES:
        raise ValueError("The GPC support resource is unexpectedly large")
    found = response.status_code == 200 and "application/json" in content_type
    data: dict[str, object] = {}
    if found:
        try:
            parsed = json.loads(response.content)
            data = parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            found = False
    declares = found and data.get("gpc") is True
    if declares:
        evidence = f"The origin publishes gpc=true at /.well-known/gpc.json (lastUpdate: {data.get('lastUpdate', 'not stated')})."
    elif found and data.get("gpc") is False:
        evidence = "The origin publishes gpc=false in its GPC support resource."
    elif found:
        evidence = "A JSON support resource exists, but it does not contain a valid boolean gpc declaration."
    else:
        evidence = "No valid application/json GPC support resource was found; support is unknown, not necessarily absent."
    return GpcCheckResult(
        url=f"https://{hostname}",
        hostname=hostname,
        support_resource_found=found,
        declares_gpc_support=declares,
        status_code=status_code,
        evidence=evidence,
        checked_at=datetime.now(timezone.utc).isoformat(),
    )
