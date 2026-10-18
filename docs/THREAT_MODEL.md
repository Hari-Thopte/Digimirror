# Threat model

## Assets and trust boundaries

The highest-risk asset is the user-selected privacy export while it is in process memory. Derived findings, monitoring history, consent records, OAuth state/verifiers, and future provider tokens are secondary assets.

Trust boundaries exist between the browser and API, the multipart parser and adapters, archive entries and the process, the API and SQLite, and DigiMirror and any future identity/provider service.

## Primary threats and controls

| Threat | Implemented control | Residual risk / production action |
| --- | --- | --- |
| Raw-value leakage | Schema allowlists, structural extraction, no raw values in responses or database | Add automated privacy regression tests and log redaction review |
| ZIP Slip / decompression bomb | Path, encryption, count, expanded-size, entry-size, and ratio checks | Isolate parsers with CPU/memory quotas and malware scanning |
| Cross-account data access | Stored account IDs are HMAC-derived | Add real authentication and per-object authorization before multi-user hosting |
| OAuth interception/replay | State, PKCE S256, short expiry, exact redirect allowlist, encrypted token vault | Implement and test callback/token rotation only after provider approval |
| Stored-data compromise | Derived-only storage, encrypted tokens, limited retention, deletion endpoint | Use managed database encryption, KMS keys, backups, and key rotation |
| Misleading privacy claims | Confidence, limitations, evidence sources, user feedback, and “not a confirmed breach” labels | Calibrate adapters against versioned export fixtures and publish accuracy |
| Browser/API abuse | Request limit, CORS allowlist, CSP, frame denial, no-store, nosniff | Add WAF/rate limits, authenticated quotas, and security monitoring |

The implementation follows the direction of [NIST's Privacy Framework](https://www.nist.gov/privacy-framework), [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), and the OAuth security practices in [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html). It has not been independently certified against them.
