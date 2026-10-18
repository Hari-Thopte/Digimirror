# DigiMirror

DigiMirror turns privacy exports into an explainable map of what personal data exists, which action or permission exposed it, where it travelled, and what the user can do next. It is a React + FastAPI hackathon prototype with a privacy-first architecture.

## What is implemented

- Evidence-backed exposure trails: origin → action/permission → recipient.
- Explainable 0–100 scoring with five threat profiles and per-finding contributions.
- Import adapters for normalized JSON/CSV, Google Takeout, Instagram, Spotify, and commerce/Amazon-style ZIP exports.
- Guided, multi-step fixes with official settings links.
- Closed-loop verification: a fix stays pending until a later import proves the field disappeared or its score decreased.
- A privacy graph joining people, data fields, sources, actions, recipients, and fixes.
- Persistent Watcher snapshots, score-change events, resolved/new fields, and verified-fix counts.
- A Trust Centre with consent history, connector readiness, derived-data export, retention visibility, and two-step deletion.
- User feedback and transparent quality metrics.
- Upload hardening, security headers, HMAC account identifiers, encrypted token-vault scaffolding, OAuth state + PKCE, exact redirect allowlisting, and configurable CORS.

Raw personal values are discarded. Persistent storage contains derived metadata only.

## Innovation Lab

The **Innovation lab** workspace adds ten integrated capabilities:

1. **MirrorLab** previews score, graph-link, finding, and recipient changes before a user applies settings.
2. **Adversary View** limits scammer, stalker, advertiser, and identity-theft perspectives to evidence present in the import.
3. **Privacy Time Machine** replays persistent snapshots and highlights new, resolved, and changed signals.
4. **Proof-of-Privacy Receipts** use Ed25519 signatures over a derived-only evidence fingerprint and can be downloaded or verified.
5. **Leak Canary** creates encrypted service-specific demo aliases and scans selected exports in memory to trace reuse.
6. **Local Document Scanner** extracts PDF/DOCX text, performs image OCR, and inspects EXIF metadata in the browser.
7. **GPC Privacy Agent** checks the W3C `/.well-known/gpc.json` declaration with SSRF-resistant public-HTTPS validation.
8. **Export Completeness Inspector** explains observed and missing signal groups per adapter.
9. **Privacy Challenge Mode** adds XP, levels, streaks, challenges, badges, and verified-progress rewards.
10. **Family Safety Mirror** compares derived location, address, contact, and device signal types across local account reflections.

Canary aliases use the reserved `.invalid` domain and are demonstration markers, not functioning inboxes. Image OCR executes in a browser worker; its engine/language assets may be downloaded on first use, but the selected image is not sent to the DigiMirror API.

## Run locally

```powershell
npm install
python -m pip install -r backend\requirements.txt
Copy-Item .env.example .env
```

Terminal 1:

```powershell
npm run dev:backend
```

Terminal 2:

```powershell
npm run dev
```

Open `http://127.0.0.1:5173`. API documentation is at `http://127.0.0.1:8000/docs`.

## Judge demo

1. Choose **New scan → Import export**.
2. Select a threat profile.
3. Import `sample-data/google-takeout-before.zip`.
4. Open **Exposure map** to show evidence trails, confidence, feedback, and the privacy graph.
5. Open **Privacy plan**, complete a guided fix, and observe **Awaiting rescan**.
6. Import `sample-data/google-takeout-after.zip` to verify the improvement.
7. Open **Watcher** for persistent change history and **Trust centre** for consent, connectors, export, and deletion.
8. Open **Innovation lab** to replay the timeline, simulate fixes, generate a signed receipt, download a canary demo export, and inspect it for lineage.

The other ready-to-use samples are:

- `sample-data/instagram-export.zip`
- `sample-data/spotify-export.zip`
- `sample-data/commerce-export.zip`
- `sample-data/privacy-export.json`
- `sample-data/privacy-export.csv`

All sample values are fictional.

## Adapter behavior

The adapters retain only structural evidence such as “browser history entries exist” or “a saved address is present.” URLs, coordinates, contact values, payment details, search text, listening history, and identity values are not returned or persisted.

Upload limits are 2 MB for normalized JSON/CSV and 25 MB for ZIP files. ZIP handling rejects traversal paths, encrypted members, excessive entry counts, oversized expanded data or individual entries, and unsafe compression ratios.

Official export entry points: [Google Takeout](https://support.google.com/accounts/answer/3024190), [Instagram information export](https://www.facebook.com/help/181231772500920/), and [Google Data Portability API](https://developers.google.com/data-portability).

## Normalized import schema

JSON accepts an `items` array; CSV uses the same names as columns.

| Field | Required | Values |
| --- | --- | --- |
| `field` | Yes | Normalized key such as `phone_number`, `email_address`, `precise_location`, or `home_address` |
| `source` | Yes | Service/system where data originated |
| `visibility` | Yes | `public`, `shared`, `stored`, `inferred`, or `protected` |
| `action` | No | Action or permission associated with the exposure |
| `recipients` | No | JSON list or semicolon-separated CSV value |
| `permission_status` | No | `enabled`, `disabled`, or `unknown` |

Unknown properties, including a raw `value`, are discarded during validation.

## Checks

```powershell
python -m pytest backend\tests -q
npm run build
```

## Engineering documentation

- [Threat model](docs/THREAT_MODEL.md)
- [Privacy architecture](docs/PRIVACY_ARCHITECTURE.md)
- [Risk model](docs/RISK_MODEL.md)
- [Deployment guide](docs/DEPLOYMENT.md)
- [Security policy](SECURITY.md)

Live OAuth is intentionally not faked. Google authorization becomes available only after supplying a real client ID, an approved redirect URI, and provider approval for the requested portability scope. Export imports remain fully usable without OAuth.
