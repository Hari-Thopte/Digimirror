# Deployment guide

## Recommended topology

Deploy the built Vite frontend on a static host and the FastAPI service behind TLS on a container platform. Set `VITE_API_BASE_URL` to the public API origin and allow only the exact frontend origin with `DIGIMIRROR_ALLOWED_ORIGINS`.

## API container

```powershell
docker build -f backend/Dockerfile -t digimirror-api .
docker run --rm -p 8000:8000 --env-file .env digimirror-api
```

Persist `/app/backend/data` only for a single-instance demo. For production, replace SQLite with a managed relational database and use migrations, connection pooling, encrypted backups, and tested restore procedures.

## Release checklist

1. Generate separate high-entropy account-HMAC, token-encryption, and receipt-signing secrets in a managed secret store.
2. Configure exact CORS origins and OAuth redirects; never use wildcards.
3. Add identity, session management, and object-level authorization before accepting multiple users.
4. Terminate TLS, add rate limits and upload quotas, and keep API responses out of caches.
5. Add KMS-backed token encryption, key rotation, audit events, redacted monitoring, and alerting.
6. Run unit/build checks, dependency scanning, SAST, DAST, and a privacy regression suite.
7. Complete provider app verification before enabling OAuth and test denial/revocation paths.
8. Publish retention/deletion terms and complete an independent security and privacy review.

For the Innovation Lab, self-host and pin OCR/PDF/DOCX worker assets where possible. Route outbound GPC inspections through a restricted egress proxy that repeats DNS/IP validation at connection time and enforces response/time limits.

The current SQLite implementation is appropriate for the local prototype, not a horizontally scaled production deployment.
