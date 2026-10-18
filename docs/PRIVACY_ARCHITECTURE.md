# Privacy architecture

```text
User-selected export
        │
        ▼
In-memory validation ── reject unsafe type/size/archive
        │
        ▼
Adapter normalization ── discard raw values
        │
        ├──► Explainable score + exposure trail + privacy graph
        │
        └──► Derived snapshot store (HMAC account key, rolling retention)
                         │
                         ├──► Watcher comparisons
                         ├──► Consent and quality metrics
                         └──► Export/delete controls
```

## Data minimization

Adapters turn source records into metadata such as field type, source, visibility, permission state, evidence file, recipient class, and confidence. They do not copy URLs, coordinates, names, phone numbers, email addresses, payment details, search text, or activity contents into the response or persistent store.

## Retention and user control

Derived snapshots expire after 90 days by default and are capped at 50 per account. Both values are configurable. The Trust Centre shows retained counts, provides a derived JSON report, records import purpose/categories, and permanently deletes the account's derived state.

## Innovation Lab boundaries

MirrorLab and Adversary View are projections over derived findings; they never claim that a simulated fix occurred or an adversary actually accessed data. Time Machine reads the existing derived snapshot history. Receipt payloads contain a score, model/import metadata, verified counts, a field-score fingerprint, and no account identifier or raw personal value.

Canary aliases are encrypted at rest and only revealed when created. Matching occurs against a user-selected export in memory. The Local Document Scanner does not call the backend: PDF/DOCX extraction, OCR, EXIF parsing, redaction, and pattern matching occur in the browser. GPC checks fetch only the standard public support resource after rejecting non-HTTPS, non-standard ports, credentials, and private/reserved network targets.

## Honest connector boundary

Export adapters are functional today. Google Data Portability authorization is scaffolding only: it is unavailable without a real client ID, approved scope, and approved redirect URI. DigiMirror does not simulate a successful provider connection.
