# Security policy

## Prototype status

DigiMirror is a hackathon prototype, not a hosted security product. Do not use production credentials or upload a real export to an untrusted deployment.

## Implemented safeguards

- Raw personal values are discarded during import; only derived exposure metadata is returned or retained.
- ZIP archives are checked for traversal, encryption, member count, expanded size, individual-entry size, and compression-ratio abuse.
- Request size is limited, responses are non-cacheable, CORS is allowlisted, and defensive browser headers are returned.
- Account identifiers are HMAC-derived before persistence.
- The token-vault interface encrypts values at rest. OAuth authorization uses state, PKCE S256, short expiry, and exact production redirect matching.
- Privacy receipts are signed with Ed25519 and verification requires the DigiMirror public key derived from the configured signing secret.
- Canary aliases are encrypted at rest; exact matching occurs in memory and plaintext aliases are not listed after creation.
- GPC checks allow only public HTTPS targets on port 443, resolve and reject non-global addresses, limit redirects/response size, and do not treat missing declarations as non-compliance.
- Local document inspection runs in the browser. OCR engine/language assets may be fetched, but selected file bytes are not posted to the DigiMirror API.
- Derived data has age and per-account count limits and can be deleted through the Trust Centre/API.

## Production requirements

Before a public deployment, add authenticated user sessions, authorization checks on every account route, CSRF protection for cookie sessions, managed KMS/HSM keys, TLS termination, a managed database, encrypted backups, audit logging, rate limiting, malware scanning, dependency/SAST/DAST gates, observability with personal-data redaction, and independent penetration/privacy review.

Replace all development secrets. A deployment must refuse startup when a development key is detected.

Use an independent `DIGIMIRROR_RECEIPT_SIGNING_KEY`, publish its corresponding public key through a trusted channel, pin OCR assets to an approved origin, and add DNS-rebinding protection at the outbound proxy for production GPC checks.

## Reporting

For this local prototype, report security issues privately to the project owner and include the affected endpoint, reproduction steps, and impact. Do not include real personal data in a report.
