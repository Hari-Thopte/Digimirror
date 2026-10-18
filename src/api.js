const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export function getAuthToken() {
  return localStorage.getItem("digimirror_token");
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem("digimirror_token", token);
  } else {
    localStorage.removeItem("digimirror_token");
  }
}

async function apiRequest(path, options = {}) {
  let response;
  const token = getAuthToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: "application/json",
        ...authHeaders,
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error(
      "The privacy service is offline. Start the FastAPI backend and try again.",
    );
  }

  if (response.status === 204) return null;
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new Error(payload?.detail || `Request failed with status ${response.status}`);
  }
  return payload;
}

export function loginUser(email, password) {
  return apiRequest("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function signupUser(data) {
  return apiRequest("/api/v1/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function getAuthMe() {
  return apiRequest("/api/v1/auth/me");
}

export function createLinkedAccount(data) {
  return apiRequest("/api/v1/auth/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteLinkedAccount(accountId) {
  return apiRequest(`/api/v1/auth/accounts/${encodeURIComponent(accountId)}`, {
    method: "DELETE",
  });
}

export function importPrivacyExport(file, threatProfile = "everyday") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("threat_profile", threatProfile);
  return apiRequest("/api/v1/scan/import", { method: "POST", body: formData });
}

export function scanSensitiveFile(file, previousFile = null, accountId = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (previousFile) formData.append("previous_file", previousFile);
  if (accountId) formData.append("account_id", accountId);
  return apiRequest("/api/v1/scan/sensitive", { method: "POST", body: formData });
}

export function getAuditLog(accountId) {
  return apiRequest(`/api/v1/trust/${encodeURIComponent(accountId)}/audit`);
}

export function getPrivacyPlaybooks() {
  return apiRequest("/api/v1/playbooks");
}

export function createRiskProof(accountId, threshold) {
  const formData = new FormData();
  formData.append("threshold", String(threshold));
  return apiRequest(`/api/v1/trust/${encodeURIComponent(accountId)}/risk-proof`, { method: "POST", body: formData });
}

export function verifyRiskProof(proof) {
  return apiRequest("/api/v1/trust/risk-proof/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proof),
  });
}

export function createAnonymousAccount(threatProfile = "everyday") {
  const formData = new FormData();
  formData.append("threat_profile", threatProfile);
  return apiRequest("/api/v1/accounts", { method: "POST", body: formData });
}

export function saveWatcherSnapshot(accountId, scan) {
  return apiRequest("/api/v1/watcher/snapshots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_id: accountId, scan }),
  });
}

export function getWatcherStatus(accountId) {
  return apiRequest(`/api/v1/watcher/${encodeURIComponent(accountId)}`);
}

export function recordConsent(accountId, purpose, dataCategories, granted = true) {
  return apiRequest("/api/v1/trust/consents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_id: accountId,
      purpose,
      data_categories: dataCategories,
      granted,
    }),
  });
}

export function getConsents(accountId) {
  return apiRequest(`/api/v1/trust/consents/${encodeURIComponent(accountId)}`);
}

export function submitFindingFeedback(accountId, findingKey, verdict) {
  return apiRequest("/api/v1/quality/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_id: accountId,
      finding_key: findingKey,
      verdict,
    }),
  });
}

export function getQualityMetrics(accountId) {
  return apiRequest(`/api/v1/quality/${encodeURIComponent(accountId)}`);
}

export function getTrustSummary(accountId) {
  return apiRequest(`/api/v1/trust/${encodeURIComponent(accountId)}`);
}

export function deleteAccountData(accountId) {
  return apiRequest(`/api/v1/trust/${encodeURIComponent(accountId)}`, {
    method: "DELETE",
  });
}

export function getConnectors() {
  return apiRequest("/api/v1/connectors");
}

export function getPrivacyTimeline(accountId) {
  return apiRequest(`/api/v1/timeline/${encodeURIComponent(accountId)}`);
}

export function createPrivacyReceipt(accountId) {
  return apiRequest(`/api/v1/receipts/${encodeURIComponent(accountId)}`, { method: "POST" });
}

export function getPrivacyReceipts(accountId) {
  return apiRequest(`/api/v1/receipts/${encodeURIComponent(accountId)}`);
}

export function verifyPrivacyReceipt(receipt) {
  return apiRequest("/api/v1/receipts/verification/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(receipt),
  });
}

export function createCanaryMarker(accountId, service, aliasType = "email") {
  return apiRequest("/api/v1/canaries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account_id: accountId, service, alias_type: aliasType }),
  });
}

export function getCanaryMarkers(accountId) {
  return apiRequest(`/api/v1/canaries/${encodeURIComponent(accountId)}`);
}

export function detectCanaryMarkers(accountId, file) {
  const formData = new FormData();
  formData.append("account_id", accountId);
  formData.append("file", file);
  return apiRequest("/api/v1/canaries/detect", { method: "POST", body: formData });
}

export function checkGpcSupport(url) {
  return apiRequest("/api/v1/gpc/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
}

export function scanWebLeakage({ urls, email, phone }) {
  return apiRequest("/api/v1/leak/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls, email: email || null, phone: phone || null }),
  });
}

/**
 * Check an email address against the HIBP v3 breach & paste databases.
 * Requires HIBP_API_KEY set in the backend .env file.
 */
export function scanEmailBreach(email) {
  return apiRequest("/api/v1/breach/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

/**
 * Locally validate a phone number and return carrier, country, line-type,
 * and risk flags. No external API — 100% processed on the backend.
 * @param {string} phone  - Raw phone string (e.g. "+919876543210" or "9876543210")
 * @param {string} region - ISO 3166-1 alpha-2 default region code (e.g. "IN", "US")
 */
export function analyzePhoneNumber(phone, region = "IN") {
  return apiRequest("/api/v1/breach/phone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, default_region: region }),
  });
}

/**
 * OSINT digital footprint scan — probe 8 major platforms for account presence
 * via registration-response pattern analysis. No login attempted.
 */
export function scanDigitalFootprint(email) {
  return apiRequest("/api/v1/breach/footprint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}
