from __future__ import annotations

import base64
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse

from .models import (
    ConnectorAuthorizationRequest,
    ConnectorAuthorizationResponse,
    ConnectorManifest,
)
from .store import save_oauth_state


CONNECTORS = {
    "google": {
        "name": "Google Data Portability",
        "mode": "oauth",
        "client_id_env": "DIGIMIRROR_GOOGLE_CLIENT_ID",
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "scopes": [
            "https://www.googleapis.com/auth/dataportability.chrome.history",
        ],
        "requires_provider_approval": True,
        "help": "https://developers.google.com/data-portability",
    },
    "instagram": {
        "name": "Instagram export",
        "mode": "export",
        "scopes": [],
        "requires_provider_approval": False,
        "help": "https://www.facebook.com/help/181231772500920/",
    },
    "spotify": {
        "name": "Spotify export",
        "mode": "export",
        "scopes": [],
        "requires_provider_approval": False,
        "help": "https://support.spotify.com/article/data-rights-and-privacy-settings/",
    },
    "commerce": {
        "name": "Commerce export",
        "mode": "export",
        "scopes": [],
        "requires_provider_approval": False,
        "help": None,
    },
}


def connector_manifests() -> list[ConnectorManifest]:
    manifests: list[ConnectorManifest] = []
    for connector_id, config in CONNECTORS.items():
        configured = config["mode"] == "export" or bool(
            os.getenv(config.get("client_id_env", ""))
        )
        manifests.append(
            ConnectorManifest(
                id=connector_id,
                name=config["name"],
                mode=config["mode"],
                configured=configured,
                requires_provider_approval=config["requires_provider_approval"],
                scopes=config["scopes"],
                export_help_url=config["help"],
                authorization_url=config.get("authorize_url"),
            )
        )
    return manifests


def _redirect_allowed(redirect_uri: str) -> bool:
    explicit = {
        value.strip()
        for value in os.getenv("DIGIMIRROR_OAUTH_REDIRECT_URIS", "").split(",")
        if value.strip()
    }
    if explicit:
        return redirect_uri in explicit
    parsed = urlparse(redirect_uri)
    return parsed.scheme == "http" and parsed.hostname in {"127.0.0.1", "localhost"}


def begin_authorization(
    provider: str,
    request: ConnectorAuthorizationRequest,
) -> ConnectorAuthorizationResponse:
    config = CONNECTORS.get(provider)
    if not config:
        raise ValueError("Unknown connector")
    if config["mode"] != "oauth":
        raise ValueError("This connector uses privacy-export import rather than OAuth")
    client_id = os.getenv(config["client_id_env"])
    if not client_id:
        raise RuntimeError(
            f"{config['name']} is not configured. Provider credentials and approval are required."
        )
    if not _redirect_allowed(request.redirect_uri):
        raise ValueError("Redirect URI is not allowlisted")

    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode("ascii")).digest()
    ).rstrip(b"=").decode("ascii")
    state = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    save_oauth_state(
        request.account_id,
        provider,
        state,
        verifier,
        request.redirect_uri,
        expires_at.isoformat(),
    )
    params = {
        "client_id": client_id,
        "redirect_uri": request.redirect_uri,
        "response_type": "code",
        "scope": " ".join(config["scopes"]),
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "access_type": "offline",
        "prompt": "consent",
    }
    return ConnectorAuthorizationResponse(
        provider=provider,
        authorization_url=f"{config['authorize_url']}?{urlencode(params)}",
        expires_in=600,
    )
