import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  CreditCard,
  Database,
  Download,
  Eye,
  FileSearch,
  FileText,
  Fingerprint,
  FlaskConical,
  Globe2,
  History,
  Home,
  Image as ImageIcon,
  Info,
  KeyRound,
  LockKeyhole,
  Mail,
  MapPin,
  Network,
  Pause,
  Play,
  RadioTower,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Trophy,
  Upload,
  UserSearch,
  UsersRound,
  Zap,
} from "lucide-react";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  checkGpcSupport,
  createCanaryMarker,
  detectCanaryMarkers,
  getCanaryMarkers,
  getPrivacyReceipts,
  getPrivacyTimeline,
  recordConsent,
  scanSensitiveFile,
  scanWebLeakage,
} from "./api.js";
import "./innovation.css";

const labFeatures = [
  { id: "simulator", label: "MirrorLab", detail: "What-if privacy controls", icon: FlaskConical },
  { id: "adversary", label: "Threat lens", detail: "Profile & adversary perspectives", icon: UserSearch },
  { id: "canary", label: "Leak canary", detail: "Trace reuse to a source", icon: KeyRound },
  { id: "scanner", label: "Local scanner", detail: "Documents, images, EXIF", icon: FileSearch },
  { id: "sensitive", label: "Sensitive scan", detail: "Faces, secrets, PII", icon: ShieldAlert },
  { id: "gpc", label: "GPC agent", detail: "Check opt-out support", icon: RadioTower },
  { id: "completeness", label: "Export inspector", detail: "Find coverage gaps", icon: ClipboardCheck },
  { id: "challenge", label: "Challenge mode", detail: "Levels and achievements", icon: Trophy },
  { id: "family", label: "Family mirror", detail: "Household safety view", icon: UsersRound },
  { id: "webleak", label: "Web Leak Scanner", detail: "Email, phone & photo on the web", icon: Globe2 },
];

const adversaries = {
  scammer: {
    label: "Scammer",
    icon: Smartphone,
    fields: ["phone_number", "email_address", "purchase_history", "home_address"],
    goal: "Contact you convincingly and impersonate a service you use.",
    inferences: {
      phone_number: "A direct contact channel",
      email_address: "An account identifier for phishing",
      purchase_history: "Brands or orders to make a message believable",
      home_address: "A location detail for social engineering",
    },
  },
  stalker: {
    label: "Stalker",
    icon: MapPin,
    fields: ["precise_location", "home_address", "phone_number", "device_identifier"],
    goal: "Reconstruct where you live, travel, or can be contacted.",
    inferences: {
      precise_location: "Movement patterns and frequently visited places",
      home_address: "A likely home base",
      phone_number: "A direct contact and discovery identifier",
      device_identifier: "A recurring device signal",
    },
  },
  advertiser: {
    label: "Advertiser",
    icon: Eye,
    fields: ["browsing_interests", "purchase_history", "listening_activity", "precise_location"],
    goal: "Build audience segments and predict what may influence you.",
    inferences: {
      browsing_interests: "Topics and commercial intent",
      purchase_history: "Likely spending categories",
      listening_activity: "Mood or preference signals",
      precise_location: "Location-based audience segments",
    },
  },
  identity: {
    label: "Identity thief",
    icon: Fingerprint,
    fields: ["email_address", "phone_number", "home_address", "saved_payment_method", "device_identifier"],
    goal: "Combine stable identifiers to attempt account recovery or impersonation.",
    inferences: {
      email_address: "A login and recovery identifier",
      phone_number: "A recovery and verification channel",
      home_address: "An identity-verification attribute",
      saved_payment_method: "Evidence that financial details are retained",
      device_identifier: "A device-linked identity signal",
    },
  },
};

const fieldLabels = {
  phone_number: "Phone number",
  email_address: "Email address",
  precise_location: "Precise location",
  home_address: "Home address",
  purchase_history: "Purchase history",
  saved_payment_method: "Saved payment method",
  browsing_interests: "Browsing interests",
  listening_activity: "Listening activity",
  device_identifier: "Device identifier",
};

const simulationLabels = {
  phone_number: "Hide phone number and disable contact discovery",
  email_address: "Limit email sharing and revoke unused connections",
  precise_location: "Pause location history and background access",
  home_address: "Remove saved household addresses",
  purchase_history: "Disable purchase-based personalization",
  saved_payment_method: "Remove unused saved payment methods",
  browsing_interests: "Pause activity and ad personalization",
  listening_activity: "Pause listening personalization",
  device_identifier: "Limit device tracking and reset ad ID",
};

function downloadJson(filename, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function EmptyFeature({ title, copy, onOpenScanner }) {
  return (
    <div className="lab-empty">
      <ScanLine size={35} />
      <h3>{title}</h3>
      <p>{copy}</p>
      <button type="button" className="lab-primary" onClick={onOpenScanner}>Import a privacy export <ArrowRight size={16} /></button>
    </div>
  );
}

export default function InnovationLab({
  account,
  scanResult,
  scanComparison,
  watcherStatus,
  qualityMetrics,
  accounts,
  scanResultsByAccount,
  onOpenScanner,
  onNotify,
  onConsentRecorded,
}) {
  const [activeFeature, setActiveFeature] = useState("simulator");
  const [timeline, setTimeline] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [canaries, setCanaries] = useState([]);
  const [achievements, setAchievements] = useState({});
  const activeDefinition = labFeatures.find((feature) => feature.id === activeFeature);
  const ActiveFeatureIcon = activeDefinition.icon;

  useEffect(() => {
    try {
      setAchievements(JSON.parse(localStorage.getItem(`digimirror-lab-${account.id}`) || "{}"));
    } catch {
      setAchievements({});
    }
    Promise.allSettled([
      getPrivacyTimeline(account.id),
      getPrivacyReceipts(account.id),
      getCanaryMarkers(account.id),
    ]).then(([history, savedReceipts, markers]) => {
      if (history.status === "fulfilled") setTimeline(history.value);
      if (savedReceipts.status === "fulfilled") setReceipts(savedReceipts.value);
      if (markers.status === "fulfilled") setCanaries(markers.value);
    });
  }, [account.id, watcherStatus?.scan_count]);

  const markAchievement = (id) => {
    setAchievements((current) => {
      if (current[id]) return current;
      const next = { ...current, [id]: new Date().toISOString() };
      localStorage.setItem(`digimirror-lab-${account.id}`, JSON.stringify(next));
      return next;
    });
  };

  const notify = (message) => onNotify?.(message);

  return (
    <div className="page-stack innovation-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Experimental privacy intelligence</p>
          <h1>Innovation Lab</h1>
          <p className="page-description">Ten connected tools that turn your privacy evidence into simulations, threat perspectives, leak detection and household safeguards. Timeline replay and signed cryptographic receipts are integrated into <strong>History & alerts</strong>.</p>
        </div>
        <div className="lab-live-pill"><Sparkles size={16} /> 10 capabilities live</div>
      </div>

      <section className="lab-shell">
        <nav className="lab-feature-nav" aria-label="Innovation Lab features">
          {labFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <button type="button" className={activeFeature === feature.id ? "active" : ""} onClick={() => setActiveFeature(feature.id)} key={feature.id}>
                <span><Icon size={18} /></span>
                <span><strong>{feature.label}</strong><small>{feature.detail}</small></span>
                <ChevronRight size={16} />
              </button>
            );
          })}
        </nav>

        <div className="lab-workbench">
          <header className="lab-workbench-header">
            <div><p>{activeDefinition.detail}</p><h2>{activeDefinition.label}</h2></div>
            <span><ActiveFeatureIcon size={19} /> Privacy-safe experiment</span>
          </header>

          {activeFeature === "simulator" ? <MirrorLab scanResult={scanResult} onOpenScanner={onOpenScanner} /> : null}
          {activeFeature === "adversary" ? <AdversaryView scanResult={scanResult} onOpenScanner={onOpenScanner} /> : null}
          {activeFeature === "canary" ? <LeakCanary account={account} canaries={canaries} setCanaries={setCanaries} markAchievement={markAchievement} notify={notify} /> : null}
          {activeFeature === "scanner" ? <LocalDocumentScanner markAchievement={markAchievement} /> : null}
          {activeFeature === "sensitive" ? <SensitiveScanner account={account} /> : null}
          {activeFeature === "gpc" ? <GpcAgent scanResult={scanResult} markAchievement={markAchievement} /> : null}
          {activeFeature === "completeness" ? <CompletenessInspector scanResult={scanResult} onOpenScanner={onOpenScanner} /> : null}
          {activeFeature === "challenge" ? <ChallengeMode scanResult={scanResult} watcherStatus={watcherStatus} qualityMetrics={qualityMetrics} receipts={receipts} canaries={canaries} achievements={achievements} /> : null}
          {activeFeature === "family" ? (
            <FamilySafetyMirror
              currentAccount={account}
              accounts={accounts}
              scanResultsByAccount={scanResultsByAccount}
              activeScan={scanResult}
              markAchievement={markAchievement}
              onOpenScanner={onOpenScanner}
              notify={notify}
              onConsentRecorded={onConsentRecorded}
            />
          ) : null}
          {activeFeature === "webleak" ? <WebLeakScanner /> : null}
        </div>
      </section>
    </div>
  );
}

function MirrorLab({ scanResult, onOpenScanner }) {
  const [selected, setSelected] = useState([]);
  if (!scanResult) {
    return <EmptyFeature title="MirrorLab needs a reflection" copy="Import an export to simulate real fixes against your evidence graph." onOpenScanner={onOpenScanner} />;
  }
  const selectedActions = scanResult.actions.filter((action) => selected.includes(action.id));
  const selectedFields = new Set(selectedActions.map((action) => action.verification_field_key));
  const affectedFindings = scanResult.findings.filter((finding) => selectedFields.has(finding.field_key));
  const totalReduction = selectedActions.reduce((sum, action) => sum + action.estimated_reduction, 0);
  const projectedScore = Math.max(0, scanResult.overall_score - totalReduction);
  const recipients = [...new Set(affectedFindings.flatMap((finding) => finding.destination.split(",").map((value) => value.trim()).filter(Boolean)))];
  const removedDataLabels = new Set(affectedFindings.map((finding) => finding.field));
  const removedNodeIds = new Set(
    (scanResult.graph?.nodes || [])
      .filter((node) => (node.type === "data" && removedDataLabels.has(node.label)) || (node.type === "recipient" && recipients.includes(node.label)))
      .map((node) => node.id),
  );
  const removedEdges = (scanResult.graph?.edges || []).filter((edge) => removedNodeIds.has(edge.source) || removedNodeIds.has(edge.target)).length;

  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return (
    <div className="lab-feature-body">
      <div className="lab-callout"><Info size={16} /><span><strong>Projection, not a completed fix.</strong> MirrorLab uses each action’s published score reduction and graph relationship to preview the result.</span></div>
      <section className="simulator-stage">
        <div className="sim-score-panel">
          <p>Projected exposure</p>
          <div className="sim-score-comparison">
            <span><small>Now</small><strong>{scanResult.overall_score}</strong></span>
            <ArrowRight size={22} />
            <span className="projected"><small>After</small><strong>{projectedScore}</strong></span>
          </div>
          <div className="sim-delta"><ShieldCheck size={17} /> {totalReduction ? `${totalReduction}-point potential reduction` : "Choose controls to begin"}</div>
          <div className="sim-impact-grid">
            <div><strong>{affectedFindings.length}</strong><span>findings affected</span></div>
            <div><strong>{removedEdges}</strong><span>graph links removed</span></div>
            <div><strong>{recipients.length}</strong><span>recipients reduced</span></div>
          </div>
        </div>
        <div className="sim-graph-preview">
          <div className="sim-person">You</div>
          <ArrowRight size={18} />
          <div className={`sim-node ${affectedFindings.length ? "fading" : ""}`}>{affectedFindings.length ? `${affectedFindings.length} selected data fields` : "Personal data"}</div>
          <ArrowRight size={18} />
          <div className={`sim-node recipients ${recipients.length ? "fading" : ""}`}>{recipients.length ? `${recipients.length} recipient groups` : "Recipients"}</div>
          {recipients.length ? <div className="sim-recipient-list">{recipients.slice(0, 5).map((recipient) => <span key={recipient}>{recipient}</span>)}</div> : null}
        </div>
      </section>

      <div className="lab-section-title"><div><p>What-if controls</p><h3>Preview several fixes together</h3></div><button type="button" onClick={() => setSelected(selected.length === scanResult.actions.length ? [] : scanResult.actions.map((action) => action.id))}>{selected.length === scanResult.actions.length ? "Reset" : "Select all"}</button></div>
      <div className="sim-control-list">
        {scanResult.actions.map((action) => {
          const active = selected.includes(action.id);
          return (
            <button type="button" className={active ? "active" : ""} onClick={() => toggle(action.id)} key={action.id}>
              <span className="sim-switch"><i /></span>
              <span><strong>{simulationLabels[action.verification_field_key] || action.title}</strong><small>{action.source}</small></span>
              <span>−{action.estimated_reduction}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const threatProfileMeta = {
  everyday:            { label: "Everyday",            detail: "Balanced baseline — general privacy posture for most people." },
  public_figure:       { label: "Public figure",       detail: "Elevated identity and reach exposure; public-profile risks weighted higher." },
  frequent_traveler:   { label: "Frequent traveler",   detail: "Location and device signals carry extra weight." },
  financially_sensitive: { label: "Financially sensitive", detail: "Payment, address, and identity fields are amplified." },
  family:              { label: "Family",              detail: "Household safety focus — contact and address fields weighted for shared risk." },
};

function AdversaryView({ scanResult, onOpenScanner }) {
  const [lens, setLens] = useState("scammer");
  if (!scanResult) {
    return <EmptyFeature title="No evidence to model yet" copy="Import a privacy export and DigiMirror will build evidence-bounded threat perspectives." onOpenScanner={onOpenScanner} />;
  }
  const adversary = adversaries[lens];
  const AdversaryIcon = adversary.icon;
  const matched = adversary.fields
    .map((field) => scanResult.findings.find((finding) => finding.field_key === field))
    .filter(Boolean);
  const coverage = Math.round(matched.length / adversary.fields.length * 100);
  const strength = matched.length ? Math.round(matched.reduce((sum, finding) => sum + finding.score, 0) / matched.length * (0.55 + coverage / 220)) : 0;

  const activeProfile = threatProfileMeta[scanResult.threat_profile] || threatProfileMeta.everyday;

  return (
    <div className="lab-feature-body">
      <div className="lab-callout" style={{ marginBottom: "0.25rem" }}>
        <UserSearch size={16} />
        <span><strong>Scan profile: {activeProfile.label}.</strong> {activeProfile.detail} The adversary view below is bounded to evidence present in this import.</span>
      </div>

      <div className="adversary-tabs">
        {Object.entries(adversaries).map(([id, item]) => {
          const Icon = item.icon;
          return <button type="button" className={lens === id ? "active" : ""} onClick={() => setLens(id)} key={id}><Icon size={18} /> {item.label}</button>;
        })}
      </div>
      <section className="adversary-hero">
        <div className="adversary-avatar"><AdversaryIcon size={29} /></div>
        <div><p>Selected perspective</p><h3>{adversary.label}</h3><span>{adversary.goal}</span></div>
        <div className={`adversary-strength ${strength >= 70 ? "high" : strength >= 40 ? "medium" : "low"}`}><strong>{strength}</strong><span>reconstruction strength</span></div>
      </section>
      <div className="adversary-chain">
        {matched.length ? matched.map((finding, index) => (
          <div className="adversary-signal" key={finding.id}>
            <span>{index + 1}</span>
            <div><strong>{finding.field}</strong><small>{finding.origin}</small><p>{adversary.inferences[finding.field_key]}</p></div>
            <em>{finding.confidence} confidence</em>
          </div>
        )) : <div className="adversary-clear"><ShieldCheck size={28} /><strong>No matching signals found</strong><span>This export does not contain the fields this perspective relies on.</span></div>}
      </div>
      <div className="adversary-boundary"><LockKeyhole size={17} /><span>DigiMirror only displays inferences supported by fields present in your import. It does not invent missing facts or claim an attack occurred.</span></div>
    </div>
  );
}

function LeakCanary({ account, canaries, setCanaries, markAchievement, notify }) {
  const [service, setService] = useState("Instagram");
  const [aliasType, setAliasType] = useState("email");
  const [createdAlias, setCreatedAlias] = useState("");
  const [detectFile, setDetectFile] = useState(null);
  const [detection, setDetection] = useState(null);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      const marker = await createCanaryMarker(account.id, service, aliasType);
      setCreatedAlias(marker.alias);
      setCanaries((current) => [{ ...marker, alias: null }, ...current]);
      markAchievement("canary");
      notify("New encrypted leak marker created");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  };
  const detect = async () => {
    if (!detectFile) return;
    setBusy(true);
    try {
      const result = await detectCanaryMarkers(account.id, detectFile);
      setDetection(result);
      setCanaries(await getCanaryMarkers(account.id));
      notify(result.detected.length ? "Canary marker detected in the selected export" : "No canary markers detected");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="lab-feature-body">
      <div className="canary-banner"><KeyRound size={25} /><div><strong>Traceable without storing the marker in plaintext</strong><span>DigiMirror encrypts each marker, checks selected exports in memory, and reports which assigned service’s marker resurfaced.</span></div></div>
      <section className="canary-create">
        <div><p>Create a marker</p><h3>Assign a unique alias to one service</h3></div>
        <label><span>Service</span><input value={service} maxLength={80} onChange={(event) => setService(event.target.value)} placeholder="e.g. Instagram" /></label>
        <label><span>Marker type</span><select value={aliasType} onChange={(event) => setAliasType(event.target.value)}><option value="email">Email marker</option><option value="username">Username marker</option></select></label>
        <button type="button" className="lab-primary" disabled={!service.trim() || busy} onClick={create}>Generate marker <Zap size={16} /></button>
      </section>
      {createdAlias ? (
        <div className="canary-reveal"><div><span>Shown once—copy it now</span><code>{createdAlias}</code></div><div className="canary-reveal-actions"><button type="button" onClick={() => navigator.clipboard.writeText(createdAlias)}><Copy size={16} /> Copy</button><button type="button" onClick={() => downloadJson("canary-demo-export.json", { profile: { contact_marker: createdAlias }, note: "Fictional DigiMirror canary demo" })}><Download size={16} /> Demo export</button></div></div>
      ) : null}
      <div className="lab-callout"><Info size={16} /><span>Prototype markers use the reserved <code>.invalid</code> domain and are not mailboxes. Place the marker in a demo service profile/export; a production deployment would connect an owned forwarding domain.</span></div>

      <section className="canary-detect">
        <div><p>Leak-lineage check</p><h3>Check an export for your markers</h3><span>JSON, CSV, TXT or ZIP · processed in memory</span></div>
        <label className={detectFile ? "selected" : ""}><input type="file" accept=".json,.csv,.txt,.zip" onChange={(event) => setDetectFile(event.target.files?.[0] || null)} /><Upload size={18} /> {detectFile?.name || "Choose export"}</label>
        <button type="button" className="lab-secondary" disabled={!detectFile || busy || !canaries.length} onClick={detect}>{busy ? "Checking…" : "Run lineage check"}</button>
      </section>
      {detection ? <div className={`canary-result ${detection.detected.length ? "found" : "clear"}`}>{detection.detected.length ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}<div><strong>{detection.detected.length ? `${detection.detected.length} marker${detection.detected.length > 1 ? "s" : ""} found` : "No marker found"}</strong><span>{detection.detected.length ? `Likely source assignment: ${detection.detected.map((item) => item.service).join(", ")}` : `${detection.checked_markers} stored markers checked.`}</span></div></div> : null}
      <div className="lab-section-title"><div><p>Marker vault</p><h3>{canaries.length} active assignments</h3></div></div>
      <div className="canary-list">
        {canaries.length ? canaries.map((marker) => <div key={marker.id}><span className={marker.detection_count ? "detected" : ""}><KeyRound size={17} /></span><div><strong>{marker.service}</strong><small>{marker.masked_alias}</small></div><em>{marker.detection_count ? `${marker.detection_count} detection${marker.detection_count > 1 ? "s" : ""}` : "Not detected"}</em></div>) : <p className="lab-inline-empty">No markers created yet.</p>}
      </div>
    </div>
  );
}

const piiPatterns = [
  { id: "email", label: "Email addresses", severity: "high", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { id: "phone", label: "Phone numbers", severity: "high", pattern: /(?<!\w)(?:\+?\d[\d .()\-]{7,}\d)(?!\w)/g },
  { id: "address", label: "Possible street addresses", severity: "high", pattern: /\b\d{1,5}\s+[A-Z0-9][A-Z0-9 .'-]{2,45}\s(?:street|st|road|rd|avenue|ave|lane|ln|nagar|colony|layout|main|cross)\b/gi },
  { id: "gps", label: "GPS coordinates", severity: "high", pattern: /[-+]?\d{1,3}\.\d{3,}\s*,\s*[-+]?\d{1,3}\.\d{3,}/g },
  { id: "pan", label: "Possible PAN identifiers", severity: "high", pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g },
  { id: "aadhaar", label: "Possible Aadhaar identifiers", severity: "high", pattern: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g },
  { id: "url", label: "Profile or tracking URLs", severity: "medium", pattern: /https?:\/\/[^\s<>"]+/gi },
];

function maskPii(value, type) {
  if (type === "email") {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 1)}***@${domain}`;
  }
  if (type === "url") {
    try { return `${new URL(value).hostname}/…`; } catch { return "URL detected"; }
  }
  const compact = value.replace(/\s/g, "");
  return compact.length > 5 ? `${compact.slice(0, 2)}•••${compact.slice(-3)}` : "••••";
}

function inspectText(text) {
  return piiPatterns.flatMap((definition) => {
    const matches = [...text.matchAll(definition.pattern)].map((match) => match[0]);
    const unique = [...new Set(matches)];
    return unique.length ? [{ type: definition.id, label: definition.label, severity: definition.severity, count: matches.length, example: maskPii(unique[0], definition.id), source: "Document text" }] : [];
  });
}

async function extractPdfText(file, setProgress) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  const limit = Math.min(pdf.numPages, 50);
  for (let number = 1; number <= limit; number += 1) {
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || "").join(" "));
    setProgress(Math.round(number / limit * 90));
  }
  return { text: pages.join("\n"), notes: pdf.numPages > limit ? [`Only the first ${limit} of ${pdf.numPages} PDF pages were inspected.`] : [] };
}

async function inspectLocalDocument(file, setProgress) {
  if (file.size > 25 * 1024 * 1024) throw new Error("Choose a file smaller than 25 MB");
  const lower = file.name.toLowerCase();
  let text = "";
  let notes = [];
  const metadata = [];
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    ({ text, notes } = await extractPdfText(file, setProgress));
  } else if (lower.endsWith(".docx")) {
    setProgress(30);
    const mammothModule = await import("mammoth");
    const mammoth = mammothModule.default || mammothModule;
    const extracted = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = extracted.value;
    notes = extracted.messages.length ? ["The DOCX parser reported formatting elements that were not text-scanned."] : [];
    setProgress(90);
  } else if (file.type.startsWith("image/")) {
    setProgress(8);
    const exifr = await import("exifr");
    const [gps, camera] = await Promise.all([
      exifr.gps(file).catch(() => null),
      exifr.parse(file, ["Model", "Make", "DateTimeOriginal"]).catch(() => null),
    ]);
    if (gps?.latitude !== undefined && gps?.longitude !== undefined) metadata.push({ type: "exif_gps", label: "Embedded photo GPS", severity: "high", count: 1, example: `${gps.latitude.toFixed(2)}…, ${gps.longitude.toFixed(2)}…`, source: "EXIF metadata" });
    if (camera?.Model || camera?.Make) metadata.push({ type: "camera", label: "Camera/device metadata", severity: "medium", count: 1, example: `${camera.Make || ""} ${camera.Model || ""}`.trim(), source: "EXIF metadata" });
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, { logger: (message) => { if (message.status === "recognizing text") setProgress(15 + Math.round((message.progress || 0) * 75)); } });
    try {
      const recognized = await worker.recognize(file);
      text = recognized.data.text || "";
    } finally {
      await worker.terminate();
    }
    notes.push("OCR runs in a browser worker. The first image scan may download the language model, but the image is not uploaded to DigiMirror.");
  } else {
    setProgress(65);
    text = await file.text();
  }
  setProgress(100);
  const findings = [...metadata, ...inspectText(text)];
  return { findings, notes, charactersInspected: text.length, fileName: file.name, processedLocally: true };
}

function LocalDocumentScanner({ markAchievement }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const scan = async () => {
    if (!file) return;
    setScanning(true); setError(""); setResult(null); setProgress(1);
    try {
      const value = await inspectLocalDocument(file, setProgress);
      setResult(value);
      markAchievement("local_scanner");
    } catch (scanError) {
      setError(scanError.message || "This file could not be inspected locally");
    } finally {
      setScanning(false);
    }
  };
  return (
    <div className="lab-feature-body">
      <div className="local-promise"><LockKeyhole size={27} /><div><strong>Your file never goes to the DigiMirror API</strong><span>PDF/DOCX text extraction, image OCR, EXIF inspection and pattern matching execute in this browser tab.</span></div><span>On-device</span></div>
      <label className={`local-drop ${file ? "selected" : ""}`}>
        <input type="file" accept=".pdf,.docx,.txt,.md,.csv,.json,image/*" onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); }} />
        {file?.type.startsWith("image/") ? <ImageIcon size={31} /> : <FileText size={31} />}
        <strong>{file?.name || "Choose a resume, document, screenshot or photo"}</strong>
        <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "PDF · DOCX · text · images · up to 25 MB"}</span>
      </label>
      {scanning ? <div className="local-progress"><div><span style={{ width: `${progress}%` }} /></div><p>{progress < 15 ? "Reading local metadata…" : progress < 95 ? "Inspecting text without uploading…" : "Preparing redacted results…"}<strong>{progress}%</strong></p></div> : null}
      {error ? <div className="lab-error"><AlertTriangle size={17} /> {error}</div> : null}
      <button type="button" className="lab-primary local-scan-button" disabled={!file || scanning} onClick={scan}><ScanLine size={17} /> {scanning ? "Scanning locally…" : "Scan this file locally"}</button>
      {result ? (
        <section className="local-results">
          <header><div><p>Local inspection complete</p><h3>{result.findings.reduce((sum, item) => sum + item.count, 0)} possible exposures found</h3></div><span><ShieldCheck size={16} /> No upload</span></header>
          <div className="local-finding-list">
            {result.findings.length ? result.findings.map((finding) => <div key={`${finding.type}-${finding.source}`}><span className={finding.severity}>{finding.severity === "high" ? <ShieldAlert size={18} /> : <Eye size={18} />}</span><div><strong>{finding.label}</strong><small>{finding.source} · redacted example: {finding.example}</small></div><em>{finding.count}</em></div>) : <div className="local-clear"><ShieldCheck size={28} /><strong>No supported PII patterns found</strong><span>This is not a guarantee that the document contains no sensitive information.</span></div>}
          </div>
          {result.notes.map((note) => <p className="local-note" key={note}><Info size={14} /> {note}</p>)}
        </section>
      ) : null}
    </div>
  );
}

function SensitiveScanner({ account }) {
  const [file, setFile] = useState(null);
  const [previousFile, setPreviousFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const scan = async () => {
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      setResult(await scanSensitiveFile(file, previousFile, account.id));
    } catch (scanError) {
      setError(scanError.message || "The sensitive scan could not be completed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lab-feature-body">
      <div className="local-promise"><ShieldCheck size={27} /><div><strong>Derived findings only</strong><span>Faces, secrets, emails and phone numbers are detected in memory. Raw values, images and embeddings are discarded.</span></div><span>Privacy-safe</span></div>
      <label className={`local-drop ${file ? "selected" : ""}`}>
        <input type="file" accept=".zip,.json,.csv,.txt,.pdf,.docx,image/*" onChange={(event) => { setFile(event.target.files?.[0] || null); setResult(null); }} />
        {file?.type.startsWith("image/") ? <ImageIcon size={31} /> : <FileSearch size={31} />}
        <strong>{file?.name || "Choose an export, document or image"}</strong>
        <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "ZIP · JSON · CSV · PDF · DOCX · images · up to 25 MB"}</span>
      </label>
      <label className={`local-drop ${previousFile ? "selected" : ""}`} style={{ minHeight: 90 }}>
        <input type="file" accept=".zip,.json,.csv,.txt,.pdf,.docx,image/*" onChange={(event) => setPreviousFile(event.target.files?.[0] || null)} />
        <History size={24} />
        <strong>{previousFile?.name || "Optional: choose an older export for drift comparison"}</strong>
        <span>Compare permission changes and exact finding deltas</span>
      </label>
      {error ? <div className="lab-error"><AlertTriangle size={17} /> {error}</div> : null}
      <button type="button" className="lab-primary local-scan-button" disabled={!file || busy} onClick={scan}><ScanLine size={17} /> {busy ? "Scanning in memory…" : "Run sensitive scan"}</button>
      {result ? (
        <section className="local-results">
          <header><div><p>Scan complete</p><h3>{result.findings.reduce((sum, item) => sum + item.count, 0)} possible exposures found</h3></div><span><ShieldCheck size={16} /> No raw values stored</span></header>
          <div className="local-finding-list">
            {result.findings.length ? result.findings.map((finding) => <div key={`${finding.type}-${finding.label}`}><span className={finding.severity}>{finding.type === "face" ? <Eye size={18} /> : <ShieldAlert size={18} />}</span><div><strong>{finding.label}</strong><small>{finding.source} · redacted example: {finding.example} · {finding.confidence}% confidence</small></div><em>{finding.count}</em></div>) : <div className="local-clear"><ShieldCheck size={28} /><strong>No supported sensitive patterns found</strong><span>This is not a guarantee that the file contains no sensitive information.</span></div>}
          </div>
          {result.notes.map((note) => <p className="local-note" key={note}><Info size={14} /> {note}</p>)}
          {result.analysis ? <p className="local-note"><Info size={14} /> {result.analysis.correlated_services.length ? `Cross-service correlation: ${result.analysis.correlated_services.join(", ")}. ` : "No repeated identifier was correlated across services. "}{result.analysis.permission_drift.length ? result.analysis.permission_drift.join(" ") : "Permission drift is unchanged."} Minimization score: {result.analysis.minimization_score}%.</p> : null}
        </section>
      ) : null}
    </div>
  );
}

function GpcAgent({ scanResult, markAchievement }) {
  const [url, setUrl] = useState("globalprivacycontrol.org");
  const [checks, setChecks] = useState([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const browserSignal = typeof navigator.globalPrivacyControl === "boolean" ? navigator.globalPrivacyControl : null;
  const check = async () => {
    setChecking(true); setError("");
    try {
      const result = await checkGpcSupport(url);
      setChecks((current) => [result, ...current.filter((item) => item.hostname !== result.hostname)]);
      markAchievement("gpc_check");
    } catch (checkError) {
      setError(checkError.message);
    } finally {
      setChecking(false);
    }
  };
  const advertiserEdges = scanResult?.findings.filter((finding) => ["browsing_interests", "purchase_history", "listening_activity", "precise_location"].includes(finding.field_key)).length || 0;
  return (
    <div className="lab-feature-body">
      <section className="gpc-status-grid">
        <div className={browserSignal === true ? "on" : "off"}><RadioTower size={23} /><span><small>Your browser signal</small><strong>{browserSignal === true ? "GPC is on" : browserSignal === false ? "GPC is off" : "Not exposed"}</strong></span></div>
        <div><Network size={23} /><span><small>Potential graph impact</small><strong>{advertiserEdges} ad-related signals</strong></span></div>
        <div><Globe2 size={23} /><span><small>Origins inspected</small><strong>{checks.length}</strong></span></div>
      </section>
      <div className="lab-callout"><Info size={16} /><span>DigiMirror checks the W3C-defined <code>/.well-known/gpc.json</code> support resource and sends <code>Sec-GPC: 1</code>. A missing resource means support is unknown—not proof of non-compliance.</span></div>
      <section className="gpc-checker">
        <div><p>Website support check</p><h3>Does an origin declare GPC support?</h3></div>
        <label><Globe2 size={17} /><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="example.com" onKeyDown={(event) => event.key === "Enter" && check()} /></label>
        <button type="button" className="lab-primary" disabled={!url.trim() || checking} onClick={check}>{checking ? "Checking…" : "Check support"} <ArrowRight size={16} /></button>
      </section>
      {error ? <div className="lab-error"><AlertTriangle size={17} /> {error}</div> : null}
      <div className="gpc-results">
        {checks.map((result) => <article className={result.declares_gpc_support ? "supports" : "unknown"} key={result.hostname}><span>{result.declares_gpc_support ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}</span><div><strong>{result.hostname}</strong><small>{result.evidence}</small></div><em>{result.declares_gpc_support ? "Declares support" : result.support_resource_found ? "Does not declare" : "Unknown"}</em></article>)}
        {!checks.length ? <p className="lab-inline-empty">No website origins inspected in this session.</p> : null}
      </div>
      {checks[0] ? <div className="gpc-graph"><span>You</span><ArrowRight size={16} /><span>Sec-GPC: 1</span><ArrowRight size={16} /><span>{checks[0].hostname}</span><ArrowRight size={16} /><span className={checks[0].declares_gpc_support ? "protected" : "unknown"}>{checks[0].declares_gpc_support ? "Declared support" : "Unknown handling"}</span></div> : null}
    </div>
  );
}

function CompletenessInspector({ scanResult, onOpenScanner }) {
  if (!scanResult) {
    return <EmptyFeature title="Import an export to inspect it" copy="The completeness inspector compares observed signal groups with the adapter’s expected export surface." onOpenScanner={onOpenScanner} />;
  }
  const completeness = scanResult.completeness || {
    score: scanResult.quality?.coverage_score || 0,
    observed_signals: scanResult.findings.map((finding) => finding.field),
    missing_signals: [],
    recommendation: scanResult.quality?.limitations?.[0],
  };
  return (
    <div className="lab-feature-body">
      <section className="completeness-hero">
        <div className="completeness-ring" style={{ "--coverage": `${completeness.score * 3.6}deg` }}><span><strong>{completeness.score}%</strong><small>coverage</small></span></div>
        <div><p>{scanResult.summary.import_type.replaceAll("_", " ")} adapter</p><h3>{completeness.missing_signals.length ? `${completeness.missing_signals.length} expected signal groups were not found` : "Expected signal groups were found"}</h3><span>{completeness.recommendation}</span></div>
        <button type="button" className="lab-secondary" onClick={onOpenScanner}><Upload size={16} /> Import a broader export</button>
      </section>
      <div className="completeness-columns">
        <section><header><CheckCircle2 size={18} /><div><p>Observed</p><h3>{completeness.observed_signals.length} signal groups</h3></div></header>{completeness.observed_signals.map((signal) => <span className="observed" key={signal}><Check size={14} /> {signal}</span>)}</section>
        <section><header><AlertTriangle size={18} /><div><p>Missing or not recognized</p><h3>{completeness.missing_signals.length} coverage gaps</h3></div></header>{completeness.missing_signals.length ? completeness.missing_signals.map((signal) => <span className="missing" key={signal}><Upload size={14} /> {signal}</span>) : <div className="completeness-clear"><ShieldCheck size={24} /> No expected signal groups missing</div>}</section>
      </div>
      <div className="lab-callout"><Info size={16} /><span>“Missing” means the adapter did not observe that supported signal group. It does not prove the service holds no such data.</span></div>
    </div>
  );
}

function ChallengeMode({ scanResult, watcherStatus, qualityMetrics, receipts, canaries, achievements }) {
  const tasks = [
    { id: "baseline", label: "Create your first privacy baseline", points: 100, complete: (watcherStatus?.scan_count || 0) >= 1 },
    { id: "rescan", label: "Complete a before-and-after rescan", points: 150, complete: (watcherStatus?.scan_count || 0) >= 2 },
    { id: "verified", label: "Verify at least one privacy fix", points: 200, complete: (qualityMetrics?.total_verified_fixes || 0) > 0 },
    { id: "feedback", label: "Rate an exposure finding", points: 75, complete: (qualityMetrics?.finding_feedback_count || 0) > 0 },
    { id: "receipt", label: "Download a signed cryptographic proof (History)", points: 100, complete: receipts.length > 0 || Boolean(achievements.receipt) },
    { id: "canary", label: "Deploy a leak canary marker", points: 100, complete: canaries.length > 0 || Boolean(achievements.canary) },
    { id: "local_scanner", label: "Run an on-device document scan", points: 100, complete: Boolean(achievements.local_scanner) },
    { id: "gpc", label: "Inspect a website’s GPC declaration", points: 75, complete: Boolean(achievements.gpc_check) },
    { id: "coverage", label: "Reach 80% export completeness", points: 100, complete: (scanResult?.completeness?.score || 0) >= 80 },
    { id: "family", label: "Review the Family Safety Mirror", points: 75, complete: Boolean(achievements.family_review) },
  ];
  const points = tasks.filter((task) => task.complete).reduce((sum, task) => sum + task.points, 0);
  const completed = tasks.filter((task) => task.complete).length;
  const level = points >= 900 ? 5 : points >= 650 ? 4 : points >= 400 ? 3 : points >= 200 ? 2 : 1;
  const levelFloor = [0, 0, 200, 400, 650, 900][level];
  const nextLevel = [0, 200, 400, 650, 900, 1100][level];
  const levelProgress = level === 5 ? 100 : Math.round((points - levelFloor) / (nextLevel - levelFloor) * 100);
  const activityDays = new Set([
    ...(watcherStatus?.events || []).map((event) => event.created_at.slice(0, 10)),
    ...Object.values(achievements).map((date) => String(date).slice(0, 10)),
  ]);
  let streak = 0;
  const cursor = new Date();
  while (activityDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  const badges = [
    { label: "Reflection starter", icon: ScanLine, earned: tasks[0].complete },
    { label: "Change verifier", icon: BadgeCheck, earned: tasks[2].complete },
    { label: "Canary keeper", icon: KeyRound, earned: tasks[5].complete },
    { label: "Local guardian", icon: LockKeyhole, earned: tasks[6].complete },
    { label: "Privacy champion", icon: Trophy, earned: level >= 5 },
  ];
  return (
    <div className="lab-feature-body">
      <section className="challenge-hero">
        <div className="level-orb"><span>Level</span><strong>{level}</strong></div>
        <div className="level-copy"><p>{level >= 5 ? "Privacy Champion" : level >= 4 ? "Exposure Defender" : level >= 3 ? "Evidence Explorer" : level >= 2 ? "Privacy Builder" : "Mirror Starter"}</p><h3>{points} privacy XP</h3><div><span style={{ width: `${levelProgress}%` }} /></div><small>{level === 5 ? "Maximum prototype level reached" : `${nextLevel - points} XP to level ${level + 1}`}</small></div>
        <div className="challenge-total"><strong>{completed}/{tasks.length}</strong><span>challenges</span><small><Zap size={12} /> {streak}-day streak</small></div>
      </section>
      <div className="challenge-grid">
        {tasks.map((task) => <article className={task.complete ? "complete" : ""} key={task.id}><span>{task.complete ? <Check size={17} /> : <Target size={17} />}</span><div><strong>{task.label}</strong><small>{task.complete ? "Completed" : "Next privacy move"}</small></div><em>+{task.points} XP</em></article>)}
      </div>
      <div className="lab-section-title"><div><p>Trophy cabinet</p><h3>Achievement badges</h3></div></div>
      <div className="badge-cabinet">{badges.map((badge) => { const Icon = badge.icon; return <div className={badge.earned ? "earned" : "locked"} key={badge.label}><span><Icon size={21} /></span><strong>{badge.label}</strong><small>{badge.earned ? "Earned" : "Locked"}</small></div>; })}</div>
    </div>
  );
}

const FIELD_LABELS = {
  precise_location: "Precise GPS & movement patterns",
  home_address: "Home / residential address",
  phone_number: "Phone number",
  email_address: "Primary email address",
  device_identifier: "Hardware & advertising device ID",
};

function FamilySafetyMirror({
  currentAccount,
  accounts,
  scanResultsByAccount,
  activeScan,
  markAchievement,
  onOpenScanner,
  notify,
  onConsentRecorded,
}) {
  const [consentDate, setConsentDate] = useState(() => {
    return localStorage.getItem(`digimirror-family-consent-${currentAccount.id}`);
  });
  const [ackAwareness, setAckAwareness] = useState(false);
  const [ackDerivedOnly, setAckDerivedOnly] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  // B: Active Scan Gate - accounts that have active scan baseline
  const activeScannedAccounts = accounts.filter(
    (acc) => Boolean(scanResultsByAccount[acc.id]) || (acc.id === currentAccount.id && Boolean(activeScan))
  );

  const available = accounts
    .map((account) => ({
      account,
      scan: scanResultsByAccount[account.id] || (account.id === currentAccount.id ? activeScan : null),
    }))
    .filter((item) => item.scan);

  const [protectedId, setProtectedId] = useState(available[0]?.account.id || currentAccount.id);

  if (!available.length && !activeScan) {
    return (
      <EmptyFeature
        title="No household reflections yet"
        copy="Import exports for one or more DigiMirror accounts to build the household safety view."
        onOpenScanner={onOpenScanner}
      />
    );
  }

  // Handler for Consent Confirmation (C)
  const handleConfirmConsent = async () => {
    setSavingConsent(true);
    try {
      const record = await recordConsent(
        currentAccount.id,
        "Household cross-account safety comparison with explicit member awareness",
        ["derived findings", "risk scores", "signal categories"],
      );
      const timestamp = new Date().toISOString();
      localStorage.setItem(`digimirror-family-consent-${currentAccount.id}`, timestamp);
      setConsentDate(timestamp);
      onConsentRecorded?.(record);
      notify?.("Household safety consent recorded and logged in Trust Centre");
    } catch (err) {
      notify?.(err.message || "Failed to record consent");
    } finally {
      setSavingConsent(false);
    }
  };

  // If consent has not been recorded yet, show the Consent Gate (C)
  if (!consentDate) {
    return (
      <div className="lab-feature-body">
        <div className="family-consent-gate">
          <div className="family-consent-card">
            <div className="family-consent-header">
              <div className="family-consent-badge"><LockKeyhole size={22} /></div>
              <div>
                <h2>Household Safety Authorization Gate</h2>
                <p className="family-consent-lead">Ensuring transparent consent for cross-account signals</p>
              </div>
            </div>

            <div className="family-consent-answers">
              <div className="consent-qa">
                <strong>Who agreed to this?</strong>
                <p>This verification confirms you have communicated with family members whose accounts are registered in DigiMirror before cross-referencing safety signals.</p>
              </div>
              <div className="consent-qa">
                <strong>What is compared?</strong>
                <p>Only high-level <em>derived categories</em> (e.g. “home address category exists”, “phone discovery active”). <em>No raw personal values, phone numbers, or passwords are ever compared or combined.</em></p>
              </div>
            </div>

            <div className="family-consent-checks">
              <label className="consent-check-row">
                <input
                  type="checkbox"
                  checked={ackAwareness}
                  onChange={(e) => setAckAwareness(e.target.checked)}
                />
                <span>I confirm that household members whose profiles appear here are aware and agreed to cross-account safety posture review.</span>
              </label>
              <label className="consent-check-row">
                <input
                  type="checkbox"
                  checked={ackDerivedOnly}
                  onChange={(e) => setAckDerivedOnly(e.target.checked)}
                />
                <span>I acknowledge that comparisons only use derived metadata categories, with an audit log stored in the Trust Centre.</span>
              </label>
            </div>

            <button
              type="button"
              className="lab-primary consent-confirm-btn"
              disabled={!ackAwareness || !ackDerivedOnly || savingConsent}
              onClick={handleConfirmConsent}
            >
              {savingConsent ? "Recording consent…" : "Confirm & Enter Household Mirror"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const entries = available.length ? available : [{ account: currentAccount, scan: activeScan }];
  const protectedEntry = entries.find((item) => item.account.id === protectedId) || entries[0];
  const highSensitivity = new Set(["precise_location", "home_address", "phone_number", "email_address", "device_identifier"]);
  const householdFindings = entries.flatMap(({ account, scan }) =>
    scan.findings.filter((finding) => highSensitivity.has(finding.field_key)).map((finding) => ({ ...finding, accountLabel: account.label }))
  );
  const byField = householdFindings.reduce((map, finding) => {
    map[finding.field_key] = [...(map[finding.field_key] || []), finding];
    return map;
  }, {});
  const sharedSignals = Object.entries(byField).filter(([, findings]) => new Set(findings.map((finding) => finding.accountLabel)).size > 1);
  const protectedFindings = protectedEntry.scan.findings.filter((finding) => highSensitivity.has(finding.field_key));
  const familyScore = Math.round(entries.reduce((sum, item) => sum + item.scan.overall_score, 0) / entries.length);

  return (
    <div className="lab-feature-body">
      <section className="family-hero">
        <div className="family-score"><UsersRound size={27} /><strong>{familyScore}</strong><span>household exposure</span></div>
        <div>
          <p>Household safety posture</p>
          <h3>{entries.length} member reflection{entries.length > 1 ? "s" : ""} active</h3>
          <span>{householdFindings.length} sensitive identity, location and shared-device signals reviewed without combining raw values.</span>
          <div className="family-audit-notice">
            <ShieldCheck size={13} />
            <span>Consent logged & verified ({new Date(consentDate).toLocaleDateString()})</span>
          </div>
        </div>
        <button
          type="button"
          className="lab-secondary"
          onClick={() => {
            markAchievement("family_review");
            notify?.("Household safety review completed");
          }}
        >
          Mark review complete <Check size={15} />
        </button>
      </section>

      {/* A: Architectural clarity / Explainer notice */}
      <div className="family-privacy-callout">
        <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong>Architectural privacy guarantee:</strong>
          <span>
            DigiMirror correlates only <em>derived signal categories</em> (e.g., location precision, contact discovery, shared advertising identifiers). <strong>No raw personal values</strong> (phone numbers, physical addresses, real names, or account passwords) are ever read, stored, or cross-referenced across family members.
          </span>
        </div>
      </div>

      <div className="family-member-tabs">
        {entries.map(({ account }) => (
          <button
            type="button"
            className={protectedEntry.account.id === account.id ? "active" : ""}
            onClick={() => setProtectedId(account.id)}
            key={account.id}
          >
            <span>{account.initials}</span>
            <div><strong>{account.name}</strong><small>{account.label}</small></div>
          </button>
        ))}
      </div>

      <section className="family-focus">
        <header>
          <div>
            <p>Protected member focus</p>
            <h3>{protectedEntry.account.name} · {protectedEntry.account.label}</h3>
          </div>
          <span>{protectedEntry.scan.threat_profile?.replaceAll("_", " ") || "standard"} profile</span>
        </header>
        <div className="family-risk-grid">
          {protectedFindings.length ? (
            protectedFindings.map((finding) => (
              <article key={finding.id}>
                <span className={finding.severity}>
                  {finding.field_key === "precise_location" || finding.field_key === "home_address" ? (
                    <MapPin size={18} />
                  ) : finding.field_key === "phone_number" ? (
                    <Smartphone size={18} />
                  ) : finding.field_key === "email_address" ? (
                    <Mail size={18} />
                  ) : (
                    <Database size={18} />
                  )}
                </span>
                <div>
                  <strong>{finding.field}</strong>
                  <small>{finding.origin} → {finding.visible_to}</small>
                </div>
                <em>{finding.score}</em>
              </article>
            ))
          ) : (
            <div className="family-clear"><ShieldCheck size={28} /> No supported household-safety signals in this export.</div>
          )}
        </div>
      </section>

      {/* B: Active scan gate for multi-member correlation */}
      <div className="family-shared">
        <div className="lab-section-title">
          <div>
            <p>Cross-account linkability</p>
            <h3>
              {activeScannedAccounts.length < 2
                ? "Multi-member comparison requires scans"
                : `${sharedSignals.length} repeated sensitive signal types`}
            </h3>
          </div>
        </div>

        {activeScannedAccounts.length < 2 ? (
          <div className="family-gate-warning">
            <strong>Active scan baseline gate:</strong>
            <span>
              Cross-account correlation requires at least 2 family members with independently imported scans. Currently only <strong>{activeScannedAccounts.length}</strong> member ({activeScannedAccounts[0]?.name || currentAccount.name}) has an active scan baseline.
            </span>
            <div className="family-member-status-list">
              {accounts.map((acc) => {
                const isReady = acc.id === currentAccount.id || Boolean(scanResultsByAccount[acc.id]);
                return (
                  <span key={acc.id} className={`family-member-status-pill ${isReady ? "ready" : "waiting"}`}>
                    <Check size={12} /> {acc.name}: {isReady ? "Scan baseline ready" : "Awaiting export import"}
                  </span>
                );
              })}
            </div>
          </div>
        ) : sharedSignals.length ? (
          sharedSignals.map(([field, findings]) => (
            <div key={field}>
              <Network size={18} />
              <span>
                <strong>{FIELD_LABELS[field] || field}</strong>
                <small>Appears across {new Set(findings.map((finding) => finding.accountLabel)).size} member reflections</small>
              </span>
              <em>{[...new Set(findings.map((finding) => finding.accountLabel))].join(" + ")}</em>
            </div>
          ))
        ) : (
          <p className="lab-inline-empty">No repeated sensitive field types across the available account reflections.</p>
        )}
      </div>

      <div className="family-actions">
        <h3>Family-first safeguards</h3>
        <div>
          <span><Home size={17} /> Remove old saved household addresses</span>
          <span><MapPin size={17} /> Restrict background location for protected members</span>
          <span><Smartphone size={17} /> Review contact discovery across shared devices</span>
          <span><CreditCard size={17} /> Separate payment profiles and family purchases</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Web Leak Scanner
// ---------------------------------------------------------------------------

const RISK_COLORS = { high: "#ef4444", medium: "#f59e0b", none: "#22c55e", clean: "#22c55e", low: "#a3a3a3" };
const RISK_LABELS = { high: "High risk", medium: "Medium risk", none: "Clean", clean: "All clean", low: "Low signal" };

function WebLeakScanner() {
  const [urls, setUrls] = useState([""]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const addUrl = () => setUrls((u) => u.length < 10 ? [...u, ""] : u);
  const removeUrl = (idx) => setUrls((u) => u.filter((_, i) => i !== idx));
  const updateUrl = (idx, val) => setUrls((u) => u.map((v, i) => (i === idx ? val : v)));

  const handleScan = async () => {
    const cleaned = urls.map((u) => u.trim()).filter(Boolean);
    if (!cleaned.length) { setError("Add at least one URL to scan."); return; }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const data = await scanWebLeakage({ urls: cleaned, email: email.trim(), phone: phone.trim() });
      setResult(data);
    } catch (err) {
      setError(err.message || "Scan failed. Check the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const overallColor = result ? RISK_COLORS[result.overall_risk] : null;

  return (
    <div className="lab-feature-body">
      <div className="lab-callout">
        <Info size={16} />
        <span><strong>Privacy-safe scraping.</strong> Raw values are never stored. The scanner checks public HTTPS pages only. Private/LAN addresses are blocked.</span>
      </div>

      {/* Input form */}
      <section style={{ display: "flex", flexDirection: "column", gap: "1.4rem", marginBottom: "1.6rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <label style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.65 }}>
            URLs to scan <span style={{ opacity: 0.5 }}>(up to 10, public HTTPS only)</span>
          </label>
          {urls.map((u, idx) => (
            <div key={idx} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                id={`webleak-url-${idx}`}
                type="url"
                placeholder="https://example.com/profile/johndoe"
                value={u}
                onChange={(e) => updateUrl(idx, e.target.value)}
                style={{
                  flex: 1,
                  background: "var(--surface-2, rgba(255,255,255,0.06))",
                  border: "1px solid var(--border, rgba(255,255,255,0.1))",
                  borderRadius: "8px",
                  padding: "0.55rem 0.9rem",
                  color: "inherit",
                  fontSize: "0.9rem",
                }}
              />
              {urls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrl(idx)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "0.3rem" }}
                  aria-label="Remove URL"
                >✕</button>
              )}
            </div>
          ))}
          {urls.length < 10 && (
            <button type="button" onClick={addUrl} style={{ alignSelf: "flex-start", background: "none", border: "1px dashed var(--border, rgba(255,255,255,0.18))", borderRadius: "7px", color: "inherit", padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.82rem", opacity: 0.65 }}>
              + Add another URL
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label htmlFor="webleak-email" style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.65, display: "block", marginBottom: "0.4rem" }}>
              Email to search for <span style={{ opacity: 0.5 }}>(optional)</span>
            </label>
            <input
              id="webleak-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                background: "var(--surface-2, rgba(255,255,255,0.06))",
                border: "1px solid var(--border, rgba(255,255,255,0.1))",
                borderRadius: "8px",
                padding: "0.55rem 0.9rem",
                color: "inherit",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label htmlFor="webleak-phone" style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.65, display: "block", marginBottom: "0.4rem" }}>
              Phone number <span style={{ opacity: 0.5 }}>(optional)</span>
            </label>
            <input
              id="webleak-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: "100%",
                background: "var(--surface-2, rgba(255,255,255,0.06))",
                border: "1px solid var(--border, rgba(255,255,255,0.1))",
                borderRadius: "8px",
                padding: "0.55rem 0.9rem",
                color: "inherit",
                fontSize: "0.9rem",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <button
          id="webleak-scan-btn"
          type="button"
          className="lab-primary"
          onClick={handleScan}
          disabled={loading}
          style={{ alignSelf: "flex-start" }}
        >
          {loading ? <><Zap size={16} /> Scanning…</> : <><Globe2 size={16} /> Scan for leaks</>}
        </button>
      </section>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: "10px", padding: "0.8rem 1rem", marginBottom: "1rem" }}>
          <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: "0.88rem" }}>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <section style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          {/* Overall summary card */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1.2rem", alignItems: "center", background: "var(--surface-2, rgba(255,255,255,0.05))", borderRadius: "14px", padding: "1.2rem 1.4rem", border: `1.5px solid ${overallColor}40` }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${overallColor}20`, border: `2.5px solid ${overallColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {result.overall_risk === "clean" ? <ShieldCheck size={30} style={{ color: overallColor }} /> : <ShieldAlert size={30} style={{ color: overallColor }} />}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.07em", opacity: 0.55 }}>Overall leak risk</p>
              <h3 style={{ margin: "0.15rem 0 0.5rem", fontSize: "1.4rem", color: overallColor }}>{RISK_LABELS[result.overall_risk]}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
                <span style={{ fontSize: "0.82rem", opacity: 0.75 }}><strong>{result.urls_scanned}</strong> page{result.urls_scanned !== 1 ? "s" : ""} scanned</span>
                {result.email_searched && <span style={{ fontSize: "0.82rem", color: result.pages_with_email_match ? "#ef4444" : "#22c55e" }}><Mail size={13} style={{ verticalAlign: "middle" }} /> Email: {result.pages_with_email_match} match{result.pages_with_email_match !== 1 ? "es" : ""}</span>}
                {result.phone_searched && <span style={{ fontSize: "0.82rem", color: result.pages_with_phone_match ? "#ef4444" : "#22c55e" }}><Smartphone size={13} style={{ verticalAlign: "middle" }} /> Phone: {result.pages_with_phone_match} match{result.pages_with_phone_match !== 1 ? "es" : ""}</span>}
                <span style={{ fontSize: "0.82rem", color: result.pages_with_photo_signal ? "#f59e0b" : "#22c55e" }}><ImageIcon size={13} style={{ verticalAlign: "middle" }} /> Photo signals: {result.pages_with_photo_signal}</span>
              </div>
            </div>
          </div>

          {/* Per-page results */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {result.pages.map((page, idx) => {
              const pageColor = RISK_COLORS[page.risk_level];
              return (
                <div key={idx} style={{ background: "var(--surface-2, rgba(255,255,255,0.04))", border: `1px solid ${pageColor}30`, borderRadius: "12px", padding: "1rem 1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.6rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.url}</p>
                      <strong style={{ fontSize: "0.95rem", display: "block", marginTop: "0.15rem" }}>{page.page_title !== page.url ? page.page_title : <span style={{ opacity: 0.5 }}>No title found</span>}</strong>
                    </div>
                    <span style={{ flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "20px", background: `${pageColor}18`, color: pageColor, border: `1px solid ${pageColor}40` }}>
                      {RISK_LABELS[page.risk_level]}
                    </span>
                  </div>

                  {!page.reachable && (
                    <div style={{ fontSize: "0.82rem", opacity: 0.55, display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <AlertTriangle size={13} /> Unreachable{page.error ? `: ${page.error}` : ""}
                    </div>
                  )}

                  {page.reachable && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem" }}>
                      <span style={{ fontSize: "0.78rem", padding: "0.18rem 0.55rem", borderRadius: "6px", background: page.email_found ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.1)", color: page.email_found ? "#ef4444" : "#22c55e", border: `1px solid ${page.email_found ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.25)"}` }}>
                        <Mail size={11} style={{ verticalAlign: "middle" }} /> {page.email_found ? "Email exposed" : "Email not found"}
                      </span>
                      <span style={{ fontSize: "0.78rem", padding: "0.18rem 0.55rem", borderRadius: "6px", background: page.phone_found ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.1)", color: page.phone_found ? "#ef4444" : "#22c55e", border: `1px solid ${page.phone_found ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.25)"}` }}>
                        <Smartphone size={11} style={{ verticalAlign: "middle" }} /> {page.phone_found ? "Phone exposed" : "Phone not found"}
                      </span>
                      <span style={{ fontSize: "0.78rem", padding: "0.18rem 0.55rem", borderRadius: "6px", background: page.photo_signal_found ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.1)", color: page.photo_signal_found ? "#f59e0b" : "#22c55e", border: `1px solid ${page.photo_signal_found ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.25)"}` }}>
                        <ImageIcon size={11} style={{ verticalAlign: "middle" }} /> {page.photo_signal_found ? `${(page.og_images.length + page.profile_images.length)} photo signal(s)` : "No photo signals"}
                      </span>
                      {page.status_code && (
                        <span style={{ fontSize: "0.78rem", padding: "0.18rem 0.55rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", opacity: 0.5 }}>HTTP {page.status_code}</span>
                      )}
                    </div>
                  )}

                  {/* Show image URLs if any */}
                  {(page.og_images.length > 0 || page.profile_images.length > 0) && (
                    <div style={{ marginTop: "0.7rem", fontSize: "0.78rem", opacity: 0.7 }}>
                      <p style={{ margin: "0 0 0.3rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.7rem" }}>Detected photo URLs</p>
                      {[...page.og_images, ...page.profile_images].map((imgUrl, imgIdx) => (
                        <div key={imgIdx} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "0.75rem", opacity: 0.6 }}>
                          {imgUrl}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: "0.78rem", opacity: 0.45, margin: "0.2rem 0 0" }}>
            Scanned at {new Date(result.scanned_at).toLocaleString()} · Raw values were not stored or transmitted to DigiMirror servers.
          </p>
        </section>
      )}
    </div>
  );
}

