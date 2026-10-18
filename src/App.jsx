import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BellRing,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  Download,
  Eye,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  Globe2,
  History,
  Info,
  Instagram,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogIn,
  LogOut,
  Network,
  Mail,
  MapPin,
  Menu,
  Moon,
  Music2,
  Pause,
  Play,
  Plus,
  Radar,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  Shield,
  ShieldCheck,
  ShieldQuestion,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  User,
  UserPlus,
  UserRoundCog,
  X,
  Zap,
} from "lucide-react";
import {
  createLinkedAccount,
  createPrivacyReceipt,
  deleteAccountData,
  deleteLinkedAccount,
  getAuthMe,
  getAuthToken,
  getConnectors,
  getConsents,
  getPrivacyTimeline,
  getQualityMetrics,
  getTrustSummary,
  getWatcherStatus,
  importPrivacyExport,
  loginUser,
  recordConsent,
  saveWatcherSnapshot,
  setAuthToken,
  signupUser,
  submitFindingFeedback,
} from "./api.js";
import InnovationLab from "./InnovationLab.jsx";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "exposure", label: "Exposure map", icon: Radar },
  { id: "plan", label: "Privacy plan", icon: ListChecks },
  { id: "watcher", label: "History", icon: History, badge: 3 },
  { id: "lab", label: "Innovation lab", icon: Sparkles, badge: "NEW" },
  { id: "trust", label: "Trust centre", icon: ShieldQuestion },
];

const DEFAULT_ACCOUNTS = [
  {
    id: "harshika-personal",
    name: "Harshika",
    label: "Personal account",
    initials: "HS",
    baseRisk: 72,
    services: 4,
    exposedFields: 22,
  },
  {
    id: "harshika-work",
    name: "Harshika",
    label: "Work account",
    initials: "HT",
    baseRisk: 48,
    services: 3,
    exposedFields: 14,
  },
  {
    id: "ishan-demo",
    name: "Ishan",
    label: "Team demo account",
    initials: "IS",
    baseRisk: 64,
    services: 4,
    exposedFields: 19,
  },
];

const categories = [
  {
    name: "Identity",
    score: 82,
    finding: "6 exposed fields",
    icon: Fingerprint,
    tone: "rose",
  },
  {
    name: "Behavioral",
    score: 74,
    finding: "4 trackers active",
    icon: Activity,
    tone: "amber",
  },
  {
    name: "Location",
    score: 61,
    finding: "2 apps always on",
    icon: MapPin,
    tone: "violet",
  },
  {
    name: "Financial",
    score: 39,
    finding: "1 saved card",
    icon: LockKeyhole,
    tone: "mint",
  },
];

const platforms = [
  {
    name: "Google",
    detail: "Mail, profile, location",
    fields: 8,
    icon: Globe2,
    tone: "blue",
  },
  {
    name: "Instagram",
    detail: "Profile, activity, interests",
    fields: 6,
    icon: Instagram,
    tone: "pink",
  },
  {
    name: "ShopCart",
    detail: "Address, orders, payments",
    fields: 5,
    icon: ShoppingBag,
    tone: "orange",
  },
  {
    name: "Soundwave",
    detail: "Listening habits, devices",
    fields: 3,
    icon: Music2,
    tone: "green",
  },
];

const privacyActions = [
  {
    id: "profile-phone",
    title: "Hide your phone number",
    source: "Instagram",
    description: "Your mobile number is visible to people outside your network.",
    impact: "High impact",
    reduction: 7,
    icon: Smartphone,
  },
  {
    id: "location-history",
    title: "Pause location history",
    source: "Google",
    description: "Background location creates a detailed timeline of places you visit.",
    impact: "High impact",
    reduction: 6,
    icon: MapPin,
  },
  {
    id: "ad-personalization",
    title: "Limit ad personalization",
    source: "Across 3 services",
    description: "Reduce behavioral profiling built from searches, clicks, and interests.",
    impact: "Medium impact",
    reduction: 4,
    icon: Eye,
  },
  {
    id: "saved-payment",
    title: "Remove an unused saved card",
    source: "ShopCart",
    description: "A card last used 11 months ago is still stored in your account.",
    impact: "Medium impact",
    reduction: 3,
    icon: LockKeyhole,
  },
];

const scanSteps = [
  "Checking connected account permissions",
  "Mapping exposed identity fields",
  "Reviewing location and activity settings",
  "Building your private risk model",
];

const threatProfiles = [
  { id: "everyday", label: "Everyday", detail: "Balanced baseline" },
  { id: "public_figure", label: "Public figure", detail: "Identity and reach" },
  { id: "frequent_traveler", label: "Frequent traveler", detail: "Location and devices" },
  { id: "financially_sensitive", label: "Financially sensitive", detail: "Payments and identity" },
  { id: "family", label: "Family", detail: "Household safety" },
];

const exposureTrails = [
  {
    id: "phone-number",
    field: "Phone number",
    classification: "Public exposure",
    severity: "high",
    icon: Smartphone,
    serviceOrder: 1,
    origin: "Instagram profile + phone contacts",
    action: "Turned on “Sync contacts” during account setup",
    destination: "People who already have your number and Instagram’s contact-matching system",
    visibleTo: "Contacts + matching system",
    evidence: "Contact discovery is enabled and the profile’s phone visibility is set to public in this sample account.",
    fix: "Disable contact syncing and hide the phone field from profile visitors.",
  },
  {
    id: "precise-location",
    field: "Precise location",
    classification: "Third-party sharing",
    severity: "high",
    icon: MapPin,
    serviceOrder: 0,
    origin: "Phone GPS + Google Maps timeline",
    action: "Selected “Allow all the time” for location access",
    destination: "Google account activity, location history, and location-based ad personalization",
    visibleTo: "Google activity + ads",
    evidence: "Background location and timeline history are enabled in the sample permissions snapshot.",
    fix: "Change location access to “While using” and pause timeline history.",
  },
  {
    id: "email-address",
    field: "Email address",
    classification: "Account sharing",
    severity: "medium",
    icon: Mail,
    serviceOrder: 0,
    origin: "Google account",
    action: "Used “Continue with Google” to create connected accounts",
    destination: "ShopCart and Soundwave account profiles plus their transactional email providers",
    visibleTo: "Connected apps + email providers",
    evidence: "The same email identifier appears across multiple sample account exports.",
    fix: "Use email aliases for non-essential services and revoke unused sign-in connections.",
  },
  {
    id: "home-address",
    field: "Home address",
    classification: "Operational sharing",
    severity: "high",
    icon: MapPin,
    serviceOrder: 2,
    origin: "ShopCart saved addresses",
    action: "Saved the address as the default delivery location",
    destination: "ShopCart fulfillment systems, the selected seller, and delivery partners",
    visibleTo: "Seller + courier network",
    evidence: "A full address remains stored as the default even when no order is active.",
    fix: "Delete unused saved addresses and enter delivery details only when needed.",
  },
  {
    id: "purchase-history",
    field: "Purchase history",
    classification: "Behavioral profiling",
    severity: "medium",
    icon: ShoppingBag,
    serviceOrder: 2,
    origin: "ShopCart orders and product views",
    action: "Left personalized recommendations and ad measurement enabled",
    destination: "ShopCart recommendation models and advertising measurement partners",
    visibleTo: "Recommendation + ad systems",
    evidence: "The sample privacy settings permit order activity to personalize recommendations.",
    fix: "Turn off personalized recommendations and optional advertising measurement.",
  },
  {
    id: "browsing-interests",
    field: "Browsing interests",
    classification: "Inferred data",
    severity: "medium",
    icon: Activity,
    serviceOrder: 2,
    origin: "Product searches, clicks, and optional cookies",
    action: "Accepted optional analytics and advertising cookies",
    destination: "Analytics providers and advertising audience segments",
    visibleTo: "Analytics + ad partners",
    evidence: "Optional cookies are enabled and multiple interest categories were inferred in the sample scan.",
    fix: "Reject optional cookies and clear the existing advertising profile.",
  },
  {
    id: "listening-activity",
    field: "Listening activity",
    classification: "Behavioral profiling",
    severity: "low",
    icon: Music2,
    serviceOrder: 3,
    origin: "Soundwave playback history",
    action: "Kept listening history and personalized discovery enabled",
    destination: "Soundwave recommendation models and audience measurement",
    visibleTo: "Recommendation system",
    evidence: "Playback history is retained and used for personalization in the sample account.",
    fix: "Clear listening history periodically or pause personalization.",
  },
];

const fieldIcons = {
  phone_number: Smartphone,
  email_address: Mail,
  precise_location: MapPin,
  home_address: MapPin,
  purchase_history: ShoppingBag,
  saved_payment_method: LockKeyhole,
  browsing_interests: Activity,
  listening_activity: Music2,
  device_identifier: Fingerprint,
};

function compareScanResults(previous, current) {
  if (!previous || !current) return null;

  const keyFor = (finding) => `${finding.field_key}|${finding.origin}`;
  const previousFindings = new Map(
    previous.findings.map((finding) => [keyFor(finding), finding]),
  );
  const currentFindings = new Map(
    current.findings.map((finding) => [keyFor(finding), finding]),
  );

  const resolved = [...previousFindings.entries()]
    .filter(([key]) => !currentFindings.has(key))
    .map(([, finding]) => finding.field);
  const added = [...currentFindings.entries()]
    .filter(([key]) => !previousFindings.has(key))
    .map(([, finding]) => finding.field);
  const reduced = [...currentFindings.entries()]
    .filter(([key, finding]) => {
      const before = previousFindings.get(key);
      return before && finding.score < before.score;
    })
    .map(([, finding]) => finding.field);

  return {
    scoreChange: previous.overall_score - current.overall_score,
    previousScore: previous.overall_score,
    currentScore: current.overall_score,
    resolved,
    added,
    reduced,
    verifiedFixes: resolved.length + reduced.length,
  };
}

function SplashScreen({ fading, onFinish }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("INITIALIZING REFLECTION ENGINE...");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onFinish]);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2100;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 30) {
        setStatusText("INITIALIZING REFLECTION ENGINE...");
      } else if (pct < 65) {
        setStatusText("CALIBRATING ADVERSARY LENSES...");
      } else if (pct < 95) {
        setStatusText("SYNCHRONIZING PRIVACY VAULT...");
      } else {
        setStatusText("NEURAL MATRIX READY");
      }

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(onFinish, 250);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      className={`splash-overlay ${fading ? "splash-fading" : ""}`}
      role="dialog"
      aria-label="Loading DigiMirror"
    >
      <div className="splash-grid-bg" />

      <button
        type="button"
        className="splash-skip-btn"
        onClick={onFinish}
        title="Skip intro animation"
      >
        Skip <span className="splash-esc-key">ESC</span>
      </button>

      <div className="splash-container">
        {/* Holographic Radar Rings */}
        <div className="splash-radar-wrap">
          <div className="splash-radar-ring ring-1" />
          <div className="splash-radar-ring ring-2" />
          <div className="splash-radar-ring ring-3" />
        </div>

        {/* Center Shield with Laser Scanner */}
        <div className="splash-shield-box">
          <div className="splash-shield-glow" />
          <div className="splash-shield-inner">
            <img
              src="/shield-transparent.png"
              alt="DigiMirror Shield"
              className="splash-shield-img"
            />
            <div className="splash-laser-sweep" />
          </div>
        </div>

        {/* Brand Lockup */}
        <div className="splash-brand-block">
          <h1 className="splash-title">
            DIGI<span className="splash-title-accent">MIRROR</span>
          </h1>
          <p className="splash-tagline">PRIVACY, REFLECTED.</p>
        </div>

        {/* Progress & Telemetry */}
        <div className="splash-telemetry">
          <div className="splash-meter">
            <div className="splash-meter-fill" style={{ width: `${progress}%` }} />
            <div className="splash-meter-glow" style={{ left: `${progress}%` }} />
          </div>

          <div className="splash-status-row">
            <div className="splash-status-indicator">
              <span className="splash-status-dot" />
              <span className="splash-status-text">{statusText}</span>
            </div>
            <span className="splash-pct">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("digimirror-theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.className = theme === "dark" ? "dark-theme" : "light-theme";
    localStorage.setItem("digimirror-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setToast(`Switched to ${nextTheme === "dark" ? "dark green" : "light"} theme`);
  };

  const handleFinishSplash = () => {
    setSplashFading(true);
    setTimeout(() => {
      setShowSplash(false);
    }, 450);
  };

  const [currentUser, setCurrentUser] = useState(null);
  const [accounts, setAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem("digimirror-accounts");
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_ACCOUNTS;
  });
  const [activeView, setActiveView] = useState("overview");
  const [activeAccountId, setActiveAccountId] = useState(
    () => localStorage.getItem("digimirror-active-account") || DEFAULT_ACCOUNTS[0].id,
  );
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [addAccountModalOpen, setAddAccountModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanError, setScanError] = useState("");
  const [lastScan, setLastScan] = useState("Today, 9:42 AM");
  const [toast, setToast] = useState("");
  const [scanResultsByAccount, setScanResultsByAccount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("digimirror-scan-results") || "{}");
    } catch {
      return {};
    }
  });
  const [scanComparisonsByAccount, setScanComparisonsByAccount] = useState({});
  const [fixStatusesByAccount, setFixStatusesByAccount] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("digimirror-fix-statuses") || "{}");
    } catch {
      return {};
    }
  });
  const [selectedFix, setSelectedFix] = useState(null);
  const [watcherStatus, setWatcherStatus] = useState(null);
  const [privacyTimeline, setPrivacyTimeline] = useState([]);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  const [trustSummary, setTrustSummary] = useState(null);
  const [consentRecords, setConsentRecords] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [completedByAccount, setCompletedByAccount] = useState(() => {
    try {
      const saved = localStorage.getItem("digimirror-actions-by-account");
      if (saved) return JSON.parse(saved);

      const legacy = JSON.parse(localStorage.getItem("digimirror-actions") || "[]");
      return { [accounts[0].id]: legacy };
    } catch {
      return {};
    }
  });

  const activeAccount =
    accounts.find((account) => account.id === activeAccountId) || accounts[0];
  const activeScanResult = scanResultsByAccount[activeAccount.id] || null;
  const activeScanComparison = scanComparisonsByAccount[activeAccount.id] || null;
  const accountSnapshot = {
    ...activeAccount,
    services: activeScanResult?.summary.source_count || activeAccount.services,
    exposedFields:
      activeScanResult?.summary.exposed_fields ?? activeAccount.exposedFields,
    actionCount: activeScanResult?.actions.length ?? privacyActions.length,
    importType: activeScanResult?.summary.import_type || "sample",
  };
  const activePrivacyActions = activeScanResult
    ? activeScanResult.actions.map((action) => ({
        ...action,
        reduction: action.estimated_reduction,
        icon: fieldIcons[action.id.replace("fix-", "")] || ShieldCheck,
      }))
    : privacyActions;
  const completedActions = completedByAccount[activeAccount.id] || [];
  const fixStatuses = fixStatusesByAccount[activeAccount.id] || {};

  useEffect(() => {
    localStorage.setItem(
      "digimirror-actions-by-account",
      JSON.stringify(completedByAccount),
    );
  }, [completedByAccount]);

  useEffect(() => {
    localStorage.setItem("digimirror-active-account", activeAccount.id);
  }, [activeAccount.id]);

  useEffect(() => {
    localStorage.setItem(
      "digimirror-scan-results",
      JSON.stringify(scanResultsByAccount),
    );
  }, [scanResultsByAccount]);

  useEffect(() => {
    localStorage.setItem(
      "digimirror-fix-statuses",
      JSON.stringify(fixStatusesByAccount),
    );
  }, [fixStatusesByAccount]);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      getAuthMe()
        .then((data) => {
          if (data?.user) {
            setCurrentUser(data.user);
            if (data.accounts?.length) {
              setAccounts(data.accounts);
              localStorage.setItem("digimirror-accounts", JSON.stringify(data.accounts));
              setActiveAccountId((curr) =>
                data.accounts.some((a) => a.id === curr) ? curr : data.accounts[0].id
              );
            }
          }
        })
        .catch(() => {
          setAuthToken(null);
        });
    }
  }, []);

  const handleLoginSuccess = (authData) => {
    setAuthToken(authData.token);
    setCurrentUser(authData.user);
    if (authData.accounts?.length) {
      setAccounts(authData.accounts);
      localStorage.setItem("digimirror-accounts", JSON.stringify(authData.accounts));
      setActiveAccountId(authData.accounts[0].id);
    }
    setAuthModalOpen(false);
    setToast(`Welcome back, ${authData.user.name}!`);
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setAccounts(DEFAULT_ACCOUNTS);
    localStorage.setItem("digimirror-accounts", JSON.stringify(DEFAULT_ACCOUNTS));
    setActiveAccountId(DEFAULT_ACCOUNTS[0].id);
    setAccountMenuOpen(false);
    setToast("Signed out. Switched to sample mode.");
  };

  const handleCreateAccount = async ({ name, label, threatProfile }) => {
    if (currentUser) {
      const updatedAccounts = await createLinkedAccount({
        name,
        label,
        threat_profile: threatProfile,
      });
      setAccounts(updatedAccounts);
      localStorage.setItem("digimirror-accounts", JSON.stringify(updatedAccounts));
      const created = updatedAccounts[updatedAccounts.length - 1];
      if (created) setActiveAccountId(created.id);
      setToast(`Created linked profile: ${name}`);
    } else {
      const newId = `acct_${Date.now()}`;
      const initials = name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "AC";
      const newAccount = {
        id: newId,
        name,
        label,
        initials,
        baseRisk: 50,
        services: 3,
        exposedFields: 12,
        threat_profile: threatProfile,
      };
      const next = [...accounts, newAccount];
      setAccounts(next);
      localStorage.setItem("digimirror-accounts", JSON.stringify(next));
      setActiveAccountId(newId);
      setToast(`Added profile: ${name}`);
    }
    setAddAccountModalOpen(false);
  };

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      getWatcherStatus(activeAccount.id),
      getQualityMetrics(activeAccount.id),
      getTrustSummary(activeAccount.id),
      getConsents(activeAccount.id),
      getConnectors(),
      getPrivacyTimeline(activeAccount.id),
    ]).then(([watcher, quality, trust, consents, availableConnectors, timeline]) => {
      if (!active) return;
      if (watcher.status === "fulfilled") setWatcherStatus(watcher.value);
      if (quality.status === "fulfilled") setQualityMetrics(quality.value);
      if (trust.status === "fulfilled") setTrustSummary(trust.value);
      if (consents.status === "fulfilled") setConsentRecords(consents.value);
      if (availableConnectors.status === "fulfilled") setConnectors(availableConnectors.value);
      if (timeline.status === "fulfilled") setPrivacyTimeline(timeline.value);
    });
    return () => {
      active = false;
    };
  }, [activeAccount.id, activeScanResult]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const baseRiskScore = activeScanResult?.overall_score ?? activeAccount.baseRisk;
  const riskScore = baseRiskScore;
  const remainingActions = activePrivacyActions.filter(
    (action) => !completedActions.includes(action.id),
  );
  const resolvedActionCount = activeScanComparison?.resolved?.length || 0;
  const planActionCount = activePrivacyActions.length + resolvedActionCount;
  const planProgress = planActionCount
    ? Math.round(
        ((resolvedActionCount + activePrivacyActions.reduce((total, action) => {
            const status = fixStatuses[action.id];
            return total + (status === "verified" ? 1 : status === "pending_verification" ? 0.5 : 0);
          }, 0)) /
          planActionCount) *
          100,
      )
    : 100;

  const navigate = (view) => {
    setActiveView(view);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openScanner = () => {
    setScanStep(0);
    setScanning(false);
    setScanComplete(false);
    setScanError("");
    setScanOpen(true);
  };

  const startScan = async (file, threatProfile = "everyday") => {
    setScanStep(0);
    setScanComplete(false);
    setScanError("");
    setScanning(true);

    const request = file
      ? importPrivacyExport(file, threatProfile)
          .then((result) => ({ result, error: null }))
          .catch((error) => ({ result: null, error }))
      : Promise.resolve({ result: null, error: null });

    for (let step = 1; step <= scanSteps.length; step += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 620));
      setScanStep(step);
    }

    const { result, error } = await request;
    if (error) {
      setScanning(false);
      setScanStep(0);
      setScanError(error.message);
      return;
    }

    if (result) {
      const comparison = compareScanResults(activeScanResult, result);
      setScanResultsByAccount((current) => ({
        ...current,
        [activeAccount.id]: result,
      }));
      setScanComparisonsByAccount((current) => ({
        ...current,
        [activeAccount.id]: comparison,
      }));
      const resultFields = new Map(
        result.findings.map((finding) => [finding.field_key, finding.score]),
      );
      const previousFields = new Map(
        (activeScanResult?.findings || []).map((finding) => [
          finding.field_key,
          finding.score,
        ]),
      );
      setFixStatusesByAccount((current) => {
        const accountStatuses = { ...(current[activeAccount.id] || {}) };
        for (const action of activePrivacyActions) {
          if (accountStatuses[action.id] !== "pending_verification") continue;
          const fieldKey = action.verification_field_key || action.id.replace("fix-", "");
          const beforeScore = previousFields.get(fieldKey);
          const afterScore = resultFields.get(fieldKey);
          if (afterScore === undefined || (beforeScore !== undefined && afterScore < beforeScore)) {
            accountStatuses[action.id] = "verified";
          }
        }
        return { ...current, [activeAccount.id]: accountStatuses };
      });
      try {
        await saveWatcherSnapshot(activeAccount.id, result);
        const latestWatcher = await getWatcherStatus(activeAccount.id);
        setWatcherStatus(latestWatcher);
        setQualityMetrics(await getQualityMetrics(activeAccount.id));
        if (file) {
          const consent = await recordConsent(
            activeAccount.id,
            "Analyze a user-selected privacy export and retain only derived monitoring history",
            ["exposure metadata", "risk scores", "derived findings"],
          );
          setConsentRecords((current) => [consent, ...current]);
          setTrustSummary(await getTrustSummary(activeAccount.id));
        }
      } catch {
        setToast("Scan completed; monitoring history could not be synchronized");
      }
    }
    setScanning(false);
    setScanComplete(true);
    setLastScan("Just now");
  };

  const completeAction = (id) => {
    if (completedActions.includes(id)) return;
    const action = activePrivacyActions.find((item) => item.id === id);
    setCompletedByAccount((current) => ({
      ...current,
      [activeAccount.id]: [...(current[activeAccount.id] || []), id],
    }));
    setFixStatusesByAccount((current) => ({
      ...current,
      [activeAccount.id]: {
        ...(current[activeAccount.id] || {}),
        [id]: "pending_verification",
      },
    }));
    setSelectedFix(null);
    setToast(`${action.title} is awaiting rescan verification`);
  };

  const clearAccountData = async () => {
    await deleteAccountData(activeAccount.id);
    setScanResultsByAccount((current) => {
      const next = { ...current };
      delete next[activeAccount.id];
      return next;
    });
    setCompletedByAccount((current) => {
      const next = { ...current };
      delete next[activeAccount.id];
      return next;
    });
    setFixStatusesByAccount((current) => {
      const next = { ...current };
      delete next[activeAccount.id];
      return next;
    });
    setWatcherStatus(null);
    setTrustSummary(null);
    setConsentRecords([]);
    localStorage.removeItem(`digimirror-lab-${activeAccount.id}`);
    setToast("Derived history and local privacy state deleted");
  };

  const downloadPrivacyReport = () => {
    if (!activeScanResult) {
      setToast("Run or import a scan before exporting a report");
      return;
    }
    const report = {
      generated_at: new Date().toISOString(),
      account: accountSnapshot.label,
      scan: activeScanResult,
      watcher: watcherStatus,
      quality_metrics: qualityMetrics,
      consent_records: consentRecords,
      privacy_note: "Contains derived metadata only; no raw personal values are stored.",
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `digimirror-${activeAccount.id}-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleFindingFeedback = async (finding, verdict) => {
    await submitFindingFeedback(
      activeAccount.id,
      `${finding.field_key}|${finding.origin}`,
      verdict,
    );
    setQualityMetrics(await getQualityMetrics(activeAccount.id));
    setToast("Finding feedback recorded");
  };

  const switchAccount = (account) => {
    setActiveAccountId(account.id);
    setAccountMenuOpen(false);
    setToast(`Switched to ${account.label.toLowerCase()}`);
  };

  return (
    <>
      {showSplash ? (
        <SplashScreen fading={splashFading} onFinish={handleFinishSplash} />
      ) : null}
      <div className="app-shell">
        <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
          <div
            className="brand-lockup"
            role="button"
            tabIndex={0}
            onClick={() => {
              setShowSplash(true);
              setSplashFading(false);
            }}
            title="Click to replay intro animation"
            style={{ cursor: "pointer" }}
          >
            <img
              src={theme === "dark" ? "/logo-white.png" : "/logo-transparent.png"}
              alt="DigiMirror - Privacy, Reflected"
              className="brand-logo-img"
            />
          </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-eyebrow">Workspace</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${activeView === item.id ? "active" : ""}`}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {item.badge ? <span className="nav-badge">{item.id === "watcher" ? watcherStatus?.events?.length || 0 : item.badge}</span> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-trust-card">
          <div className="trust-icon">
            <LockKeyhole size={17} />
          </div>
          <p className="trust-title">Privacy-safe mode</p>
          <p className="trust-copy">
            Imports are analyzed in memory. Raw personal values are never retained.
          </p>
        </div>

        <div className="account-switcher">
          {accountMenuOpen ? (
            <div className="account-menu" role="menu" aria-label="Available accounts">
              {/* User identity & signin / signout bar */}
              <div className="account-menu-user-bar">
                <div className="account-menu-user-info">
                  <span>{currentUser ? <User size={13} /> : <Zap size={13} />}</span>
                  <div>
                    <strong>{currentUser ? currentUser.name : "Sample Mode"}</strong>
                    <small>{currentUser ? currentUser.email : "Default demo workspace"}</small>
                  </div>
                </div>
                {currentUser ? (
                  <button
                    type="button"
                    className="account-menu-signout-btn"
                    onClick={handleSignOut}
                    title="Sign out of DigiMirror"
                  >
                    <LogOut size={11} /> Out
                  </button>
                ) : (
                  <button
                    type="button"
                    className="account-menu-signin-btn"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                  >
                    Sign in
                  </button>
                )}
              </div>

              <p>Active Profiles ({accounts.length})</p>
              {accounts.map((account) => (
                <button
                  type="button"
                  role="menuitem"
                  className={account.id === activeAccount.id ? "selected" : ""}
                  key={account.id}
                  onClick={() => switchAccount(account)}
                >
                  <span className="profile-avatar">{account.initials}</span>
                  <span className="account-option-copy">
                    <strong>{account.name}</strong>
                    <small>{account.label}</small>
                  </span>
                  {account.id === activeAccount.id ? <Check size={16} /> : null}
                </button>
              ))}

              <button
                type="button"
                className="add-account"
                onClick={() => {
                  setAccountMenuOpen(false);
                  setAddAccountModalOpen(true);
                }}
              >
                <span className="add-account-icon"><Plus size={16} /></span>
                <span className="account-option-copy">
                  <strong>Add account profile</strong>
                  <small>Link personal, work, or family profile</small>
                </span>
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="profile-chip"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onClick={() => setAccountMenuOpen((open) => !open)}
          >
            <span className="profile-avatar">{activeAccount.initials}</span>
            <span className="profile-meta">
              <strong>{activeAccount.name}</strong>
              <span>{activeAccount.label}</span>
            </span>
            <ChevronDown size={18} className={accountMenuOpen ? "chevron-open" : ""} />
          </button>
        </div>
      </aside>

      {mobileNavOpen ? (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <main className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={22} />
          </button>
          <div className="topbar-status">
            <span className="status-dot" />
            Monitoring {watcherStatus?.active ? "is active" : "needs a baseline"}
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark green theme"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="View monitoring alerts"
              onClick={() => navigate("watcher")}
            >
              <BellRing size={19} />
              <span className="notification-dot" />
            </button>
            <button
              type="button"
              className="auth-chip-btn"
              onClick={() => setAuthModalOpen(true)}
              title={currentUser ? `Signed in as ${currentUser.name}` : "Sign in to DigiMirror"}
            >
              <User size={15} />
              <span>{currentUser ? currentUser.name : "Sign in"}</span>
            </button>
            <button type="button" className="scan-button compact" onClick={openScanner}>
              <ScanSearch size={18} />
              New scan
            </button>
          </div>
        </header>

        <div className="page-frame">
          {activeView === "overview" ? (
            <Overview
              account={accountSnapshot}
              scanResult={activeScanResult}
              scanComparison={activeScanComparison}
              riskScore={riskScore}
              lastScan={lastScan}
              remainingActions={remainingActions}
              onOpenScanner={openScanner}
              onNavigate={navigate}
              onStartFix={setSelectedFix}
            />
          ) : null}
          {activeView === "exposure" ? (
            <ExposureMap
              account={accountSnapshot}
              scanResult={activeScanResult}
              onFeedback={handleFindingFeedback}
              onNavigate={navigate}
              onOpenScanner={openScanner}
            />
          ) : null}
          {activeView === "plan" ? (
            <PrivacyPlan
              riskScore={riskScore}
              progress={planProgress}
              completedActions={completedActions}
              actions={activePrivacyActions}
              fixStatuses={fixStatuses}
              scanComparison={activeScanComparison}
              onStartFix={setSelectedFix}
            />
          ) : null}
          {activeView === "watcher" ? (
            <Watcher
              account={accountSnapshot}
              lastScan={lastScan}
              watcherStatus={watcherStatus}
              qualityMetrics={qualityMetrics}
              timeline={privacyTimeline}
              scanComparison={activeScanComparison}
              onNavigate={navigate}
              onOpenScanner={openScanner}
              onNotify={setToast}
            />
          ) : null}
          {activeView === "trust" ? (
            <TrustCentre
              account={accountSnapshot}
              scanResult={activeScanResult}
              trustSummary={trustSummary}
              consentRecords={consentRecords}
              connectors={connectors}
              qualityMetrics={qualityMetrics}
              onDelete={clearAccountData}
              onDownload={downloadPrivacyReport}
              onOpenScanner={openScanner}
            />
          ) : null}
          {activeView === "lab" ? (
            <InnovationLab
              account={accountSnapshot}
              scanResult={activeScanResult}
              scanComparison={activeScanComparison}
              watcherStatus={watcherStatus}
              qualityMetrics={qualityMetrics}
              accounts={accounts}
              scanResultsByAccount={scanResultsByAccount}
              onOpenScanner={openScanner}
              onNotify={setToast}
              onConsentRecorded={(newConsent) => {
                setConsentRecords((current) => [newConsent, ...current]);
                getTrustSummary(activeAccount.id).then(setTrustSummary).catch(() => {});
              }}
            />
          ) : null}
        </div>
      </main>

      {scanOpen ? (
        <ScanModal
          scanning={scanning}
          scanStep={scanStep}
          scanComplete={scanComplete}
          scanError={scanError}
          scanComparison={activeScanComparison}
          account={accountSnapshot}
          riskScore={riskScore}
          onClose={() => !scanning && setScanOpen(false)}
          onStart={startScan}
          onViewResults={() => {
            setScanOpen(false);
            navigate("overview");
            setToast("Fresh privacy snapshot ready");
          }}
        />
      ) : null}

      {selectedFix ? (
        <FixModal
          action={selectedFix}
          status={fixStatuses[selectedFix.id]}
          onClose={() => setSelectedFix(null)}
          onComplete={() => completeAction(selectedFix.id)}
        />
      ) : null}

      {authModalOpen ? (
        <AuthModal
          currentUser={currentUser}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      ) : null}

      {addAccountModalOpen ? (
        <AddAccountModal
          onClose={() => setAddAccountModalOpen(false)}
          onCreated={handleCreateAccount}
        />
      ) : null}

      <div className={`toast ${toast ? "toast-visible" : ""}`} role="status" aria-live="polite">
        <CheckCircle2 size={19} />
        <span>{toast}</span>
      </div>
    </div>
    </>
  );
}

function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions ? <div className="heading-actions">{actions}</div> : null}
    </div>
  );
}

function Overview({
  account,
  scanResult,
  scanComparison,
  riskScore,
  lastScan,
  remainingActions,
  onOpenScanner,
  onNavigate,
  onStartFix,
}) {
  const priority = remainingActions[0];
  const displayedCategories = scanResult
    ? categories.map((category) => {
        const calculated = scanResult.categories.find(
          (item) => item.name.toLowerCase() === category.name.toLowerCase(),
        );
        return calculated
          ? {
              ...category,
              score: calculated.score,
              finding: `${calculated.finding_count} findings`,
            }
          : category;
      })
    : categories;
  const riskState =
    riskScore >= 70
      ? {
          label: "High exposure",
          title: "Your identity needs attention.",
          tone: "high-risk",
        }
      : riskScore >= 50
        ? {
            label: "Moderate exposure",
            title: "A few changes will strengthen this account.",
            tone: "medium-risk",
          }
        : {
            label: "Lower exposure",
            title: "This account is in good shape.",
            tone: "low-risk",
          };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Monday, 17 August"
        title={`Good morning, ${account.name}.`}
        description={`Here’s your latest privacy reflection across ${account.services} connected services in your ${account.label.toLowerCase()}.`}
        actions={
          <button type="button" className="scan-button" onClick={onOpenScanner}>
            <ScanSearch size={19} />
            Run privacy scan
          </button>
        }
      />

      <section className="overview-grid" aria-label="Privacy overview">
        <article className="risk-card">
          <div className="risk-card-topline">
            <span>Overall exposure</span>
            <span className="live-pill"><span /> Live</span>
          </div>
          <div className="risk-body">
            <div className="score-ring" style={{ "--score": `${riskScore * 3.6}deg` }}>
              <div className="score-ring-inner">
                <strong>{riskScore}</strong>
                <span>/ 100</span>
              </div>
            </div>
            <div className="risk-copy">
              <span className={`risk-label ${riskState.tone}`}>{riskState.label}</span>
              <h2>{riskState.title}</h2>
              <p>
                Three priority changes can meaningfully reduce what others can learn about you.
              </p>
              {scanComparison ? (
                <div className={`score-delta ${scanComparison.scoreChange >= 0 ? "improved" : "worse"}`}>
                  {scanComparison.scoreChange >= 0 ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                  <span>
                    {scanComparison.scoreChange === 0
                      ? "No score change on the latest rescan"
                      : scanComparison.scoreChange > 0
                        ? `${scanComparison.scoreChange}-point improvement verified`
                        : `${Math.abs(scanComparison.scoreChange)}-point increase detected`}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="risk-footer">
            <span><RefreshCw size={14} /> Updated {lastScan}</span>
            <button type="button" onClick={() => onNavigate("exposure")}>
              See exposure map <ArrowRight size={15} />
            </button>
          </div>
        </article>

        <article className="card exposure-card">
          <div className="card-header">
            <div>
              <p className="card-kicker">Exposure snapshot</p>
              <h2>What needs attention</h2>
            </div>
            <button type="button" className="text-button" onClick={() => onNavigate("exposure")}>
              Explore <ChevronRight size={16} />
            </button>
          </div>
          <div className="category-list">
            {displayedCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div className="category-row" key={category.name}>
                  <div className={`category-icon ${category.tone}`}><Icon size={18} /></div>
                  <div className="category-info">
                    <div className="category-label">
                      <strong>{category.name}</strong>
                      <span>{category.finding}</span>
                    </div>
                    <div className="meter"><span style={{ width: `${category.score}%` }} /></div>
                  </div>
                  <strong className="category-score">{category.score}</strong>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {scanResult ? (
        <section className="card model-card" aria-label="Risk score explanation">
          <div className="card-header">
            <div>
              <p className="card-kicker">Explainable risk model</p>
              <h2>Why your score is {scanResult.overall_score}</h2>
            </div>
            <span className="profile-pill"><UserRoundCog size={15} /> {scanResult.threat_profile.replaceAll("_", " ")}</span>
          </div>
          <div className="model-layout">
            <div className="model-factors">
              {(scanResult.risk_explanation || []).slice(0, 5).map((factor) => (
                <div className="model-factor" key={`${factor.field_key}-${factor.source}`}>
                  <span>{factor.label}<small>{factor.source}</small></span>
                  <div className="model-factor-bar"><i style={{ width: `${Math.min(100, factor.contribution)}%` }} /></div>
                  <strong>+{factor.contribution}</strong>
                </div>
              ))}
            </div>
            <div className="quality-summary">
              <FileCheck2 size={22} />
              <div><strong>{scanResult.quality?.average_confidence || 0}%</strong><span>evidence confidence</span></div>
              <div><strong>{scanResult.quality?.coverage_score || 0}%</strong><span>adapter coverage</span></div>
              <p>{scanResult.quality?.limitations?.[0] || "Results describe the evidence available in this export."}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="content-grid">
        <article className="card connections-card">
          <div className="card-header">
            <div>
              <p className="card-kicker">Digital reflection</p>
              <h2>Connected services</h2>
            </div>
            <span className="count-pill">{account.services} monitored</span>
          </div>
          <div className="platform-list">
            {platforms.slice(0, account.services).map((platform) => {
              const Icon = platform.icon;
              return (
                <button
                  type="button"
                  className="platform-row"
                  key={platform.name}
                  onClick={() => onNavigate("exposure")}
                >
                  <span className={`platform-icon ${platform.tone}`}><Icon size={20} /></span>
                  <span className="platform-info">
                    <strong>{platform.name}</strong>
                    <small>{platform.detail}</small>
                  </span>
                  <span className="field-count">{platform.fields} fields</span>
                  <ChevronRight size={17} />
                </button>
              );
            })}
          </div>
        </article>

        <article className="card priority-card">
          <div className="priority-visual">
            <Sparkles size={20} />
            <span>Best next step</span>
          </div>
          {priority ? (
            <>
              <div className="priority-content">
                <p className="card-kicker">Privacy prescription</p>
                <h2>{priority.title}</h2>
                <p>{priority.description}</p>
                <div className="impact-line">
                  <span className="impact-pill">{priority.impact}</span>
                  <span>About 2 minutes</span>
                </div>
              </div>
              <button type="button" className="primary-action" onClick={() => onStartFix(priority)}>
                Guide me through it <ArrowRight size={17} />
              </button>
            </>
          ) : (
            <div className="all-clear">
              <CheckCircle2 size={34} />
              <h2>Priority fixes complete</h2>
              <p>Your privacy plan is up to date.</p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

function ExposureMap({ account, scanResult, onFeedback, onNavigate, onOpenScanner }) {
  const [expandedTrailId, setExpandedTrailId] = useState("phone-number");
  const activeTrails = scanResult
    ? scanResult.findings.map((finding) => ({
      id: finding.id,
        fieldKey: finding.field_key,
        field: finding.field,
        classification: finding.classification,
        severity: finding.severity,
        icon: fieldIcons[finding.field_key] || Fingerprint,
        origin: finding.origin,
        action: finding.action,
        destination: finding.destination,
        visibleTo: finding.visible_to,
        evidence: finding.evidence,
        confidence: finding.confidence,
        confidenceScore: finding.confidence_score,
        evidenceSources: finding.evidence_sources,
        observedAt: finding.observed_at,
        fix: finding.fix,
      }))
    : exposureTrails.filter((trail) => trail.serviceOrder < account.services);

  useEffect(() => {
    if (activeTrails.length && !activeTrails.some((trail) => trail.id === expandedTrailId)) {
      setExpandedTrailId(activeTrails[0].id);
    }
  }, [account.id, scanResult]);

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Digital reflection"
        title="See where your data travels."
        description="A unified map of exposed fields across your connected digital life."
        actions={
          <button type="button" className="secondary-button" onClick={onOpenScanner}>
            <RefreshCw size={18} /> Refresh map
          </button>
        }
      />

      <section className="map-layout">
        <article className="card map-card">
          <div className="map-legend">
            <span><i className="legend-dot high" /> High exposure</span>
            <span><i className="legend-dot medium" /> Medium</span>
            <span><i className="legend-dot low" /> Protected</span>
          </div>
          <div className="data-map" aria-label="Connected service exposure map">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="map-center">
              <div className="center-avatar">{account.initials}</div>
              <strong>You</strong>
              <span>{account.exposedFields} exposed fields</span>
            </div>
            <MapNode className="node-google" icon={Globe2} label="Google" meta="8 fields" risk="high" />
            <MapNode className="node-instagram" icon={Instagram} label="Instagram" meta="6 fields" risk="high" />
            <MapNode className="node-shop" icon={ShoppingBag} label="ShopCart" meta="5 fields" risk="medium" />
            <MapNode className="node-sound" icon={Music2} label="Soundwave" meta="3 fields" risk="low" />
            <MapNode className="node-work" icon={BriefcaseBusiness} label="Workboard" meta="Dormant" risk="medium" />
          </div>
        </article>

        <aside className="map-side">
          <article className="card field-card">
            <div className="card-header compact-header">
              <div>
                <p className="card-kicker">Highest exposure</p>
                <h2>Identity details</h2>
              </div>
              <div className="category-icon rose"><Fingerprint size={19} /></div>
            </div>
            <div className="field-list">
              {activeTrails.slice(0, 4).map((trail) => (
                <FieldRow
                  key={trail.id}
                  icon={trail.icon}
                  label={trail.field}
                  count={trail.origin}
                  level={trail.classification.replace(" exposure", "")}
                />
              ))}
            </div>
          </article>
          <article className="map-cta">
            <Shield size={22} />
            <div>
              <strong>Reduce your visible footprint</strong>
              <p>We found four guided changes you can make now.</p>
            </div>
            <button type="button" onClick={() => onNavigate("plan")} aria-label="Open privacy plan">
              <ArrowRight size={18} />
            </button>
          </article>
        </aside>
      </section>

      <section className="card trail-card">
        <div className="trail-heading">
          <div>
            <p className="card-kicker">Exposure trail</p>
            <h2>How each piece of personal data travelled</h2>
            <p>
              Follow the source, the action or permission that triggered it, and who could
              receive or see the information.
            </p>
          </div>
          <div className="demo-trace-note">
            <Info size={16} />
            <span><strong>Demo trace</strong> — simulated findings, not confirmed breaches</span>
          </div>
        </div>

        <div className="trail-list">
          {activeTrails.map((trail) => {
            const Icon = trail.icon;
            const expanded = expandedTrailId === trail.id;
            return (
              <article className={`trail-item ${expanded ? "expanded" : ""}`} key={trail.id}>
                <button
                  type="button"
                  className="trail-summary"
                  aria-expanded={expanded}
                  onClick={() => setExpandedTrailId(expanded ? "" : trail.id)}
                >
                  <span className={`trail-field-icon ${trail.severity}`}><Icon size={19} /></span>
                  <span className="trail-field-copy">
                    <strong>{trail.field}</strong>
                    <small>
                      {trail.classification} · {trail.confidence || "medium"} confidence
                    </small>
                  </span>
                  <span className="trail-mini-route">
                    <span>{trail.origin}</span>
                    <ArrowRight size={15} />
                    <span>{trail.visibleTo}</span>
                  </span>
                  <span className={`trail-severity ${trail.severity}`}>
                    {trail.severity} exposure
                  </span>
                  <span className="trail-toggle" aria-hidden="true">
                    <ChevronDown className="trail-chevron" size={18} />
                  </span>
                </button>

                {expanded ? (
                  <div className="trail-details">
                    <div className="trail-path">
                      <div>
                        <span className="path-number">1</span>
                        <p>Origin</p>
                        <strong>{trail.origin}</strong>
                      </div>
                      <ArrowRight size={18} />
                      <div>
                        <span className="path-number">2</span>
                        <p>Action or permission</p>
                        <strong>{trail.action}</strong>
                      </div>
                      <ArrowRight size={18} />
                      <div>
                        <span className="path-number">3</span>
                        <p>Reached or visible to</p>
                        <strong>{trail.destination}</strong>
                      </div>
                    </div>
                    <div className="trail-evidence-meta">
                      <div>
                        <ShieldCheck size={16} />
                        <span>
                          <strong>{trail.confidence || "Medium"} evidence confidence</strong>
                          {trail.confidenceScore ? ` · ${trail.confidenceScore}%` : " · sample estimate"}
                        </span>
                      </div>
                      <div>
                        <Database size={16} />
                        <span>
                          {(trail.evidenceSources || [trail.origin]).join(" + ")}
                        </span>
                      </div>
                      {trail.observedAt ? (
                        <time dateTime={trail.observedAt}>
                          Observed {new Date(trail.observedAt).toLocaleDateString()}
                        </time>
                      ) : null}
                    </div>
                    <div className="trail-explanation">
                      <div>
                        <Info size={16} />
                        <p><strong>Why this appears:</strong> {trail.evidence}</p>
                      </div>
                      <div>
                        <ShieldCheck size={16} />
                        <p><strong>Recommended fix:</strong> {trail.fix}</p>
                      </div>
                      <button type="button" onClick={() => onNavigate("plan")}>
                        Open matching fix <ArrowRight size={15} />
                      </button>
                    </div>
                    {scanResult ? (
                      <div className="finding-feedback">
                        <span>Is this finding accurate?</span>
                        <button type="button" onClick={() => onFeedback({ field_key: trail.fieldKey, origin: trail.origin }, "accurate")}>
                          <Check size={14} /> Yes
                        </button>
                        <button type="button" onClick={() => onFeedback({ field_key: trail.fieldKey, origin: trail.origin }, "false_positive")}>
                          <X size={14} /> No
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {scanResult?.graph ? <PrivacyGraphExplorer graph={scanResult.graph} /> : null}
    </div>
  );
}

function PrivacyGraphExplorer({ graph }) {
  const groups = [
    { type: "data", label: "Personal data", icon: Fingerprint },
    { type: "source", label: "Collected from", icon: Database },
    { type: "recipient", label: "Reached", icon: Network },
    { type: "fix", label: "Protected by", icon: ShieldCheck },
  ];
  return (
    <section className="card graph-card" aria-label="Privacy relationship graph">
      <div className="card-header">
        <div><p className="card-kicker">Privacy graph</p><h2>One view of data, sources, recipients, and fixes</h2></div>
        <span className="count-pill">{graph.nodes.length} nodes · {graph.edges.length} links</span>
      </div>
      <div className="graph-columns">
        {groups.map((group, index) => {
          const Icon = group.icon;
          const nodes = graph.nodes.filter((node) => node.type === group.type);
          return (
            <div className="graph-column" key={group.type}>
              <div className="graph-column-title"><Icon size={17} /><strong>{group.label}</strong>{index < groups.length - 1 ? <ArrowRight size={15} /> : null}</div>
              <div className="graph-node-list">
                {nodes.slice(0, 7).map((node) => <span key={node.id}>{node.label}{node.risk_score !== null && node.risk_score !== undefined ? <small>{node.risk_score}</small> : null}</span>)}
                {nodes.length > 7 ? <em>+{nodes.length - 7} more</em> : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="graph-note"><Info size={15} /> Relationships are derived from the imported evidence; they do not claim a confirmed data breach.</p>
    </section>
  );
}

function MapNode({ icon: Icon, label, meta, risk, className }) {
  return (
    <div className={`map-node ${className}`}>
      <div className="node-icon"><Icon size={20} /></div>
      <div><strong>{label}</strong><span>{meta}</span></div>
      <i className={`node-risk ${risk}`} />
    </div>
  );
}

function FieldRow({ icon: Icon, label, count, level }) {
  return (
    <div className="field-row">
      <div className="field-icon"><Icon size={17} /></div>
      <div><strong>{label}</strong><span>{count}</span></div>
      <span className="field-level">{level}</span>
    </div>
  );
}

function PrivacyPlan({ riskScore, progress, completedActions, actions, fixStatuses, scanComparison, onStartFix }) {
  const verifiedCount = Math.max(
    actions.filter((action) => fixStatuses[action.id] === "verified").length,
    scanComparison?.verifiedFixes || 0,
  );
  const pendingCount = actions.filter((action) => fixStatuses[action.id] === "pending_verification").length;
  const totalReduction = actions.reduce(
    (total, action) => total + action.reduction,
    0,
  );

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Privacy prescription"
        title="Your clear path to safer."
        description="Personalized actions, ordered by the privacy impact they can make."
      />

      <section className="plan-summary">
        <div className="plan-score">
          <span className="summary-icon"><ShieldCheck size={22} /></span>
          <div>
            <p>Current exposure score</p>
            <strong>{riskScore}<small>/100</small></strong>
          </div>
        </div>
        <div className="plan-progress-copy">
          <div><strong>{verifiedCount} verified · {pendingCount} awaiting rescan</strong><span>{progress}%</span></div>
          <div className="plan-meter"><span style={{ width: `${progress}%` }} /></div>
          <p>Finish the plan to lower your score by up to {totalReduction} points.</p>
        </div>
      </section>

      {scanComparison?.verifiedFixes ? (
        <section className="verified-change-banner">
          <ShieldCheck size={22} />
          <div><strong>{scanComparison.verifiedFixes} privacy changes verified by your latest export</strong><span>{[...scanComparison.resolved, ...scanComparison.reduced].join(" · ")}</span></div>
          <span>{scanComparison.scoreChange >= 0 ? `−${scanComparison.scoreChange}` : `+${Math.abs(scanComparison.scoreChange)}`} points</span>
        </section>
      ) : null}

      <section className="card action-list-card">
        <div className="card-header">
          <div>
            <p className="card-kicker">Recommended for you</p>
            <h2>Priority action plan</h2>
          </div>
          <span className="privacy-time"><Clock3 size={15} /> About 12 minutes</span>
        </div>
        <div className="action-list">
          {actions.map((action, index) => {
            const Icon = action.icon;
            const status = fixStatuses[action.id] || (completedActions.includes(action.id) ? "pending_verification" : "not_started");
            const isVerified = status === "verified";
            const isPending = status === "pending_verification";
            return (
              <article className={`action-row ${isVerified ? "completed" : ""} ${isPending ? "pending" : ""}`} key={action.id}>
                <div className="action-order">{isVerified ? <Check size={18} /> : index + 1}</div>
                <div className="action-icon"><Icon size={20} /></div>
                <div className="action-copy">
                  <div className="action-title-line">
                    <h3>{action.title}</h3>
                    <span>{action.impact}</span>
                  </div>
                  <p>{action.description}</p>
                  <small>{action.source} · Score impact −{action.reduction}</small>
                </div>
                <button
                  type="button"
                  className={isVerified ? "done-button" : isPending ? "pending-button" : "fix-button"}
                  onClick={() => onStartFix(action)}
                  disabled={isVerified}
                >
                  {isVerified ? <><Check size={16} /> Verified</> : isPending ? <><RefreshCw size={15} /> Awaiting rescan</> : <>Start fix <ChevronRight size={16} /></>}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Watcher({ account, lastScan, watcherStatus, qualityMetrics, timeline, scanComparison, onNavigate, onOpenScanner, onNotify }) {
  const [activeTab, setActiveTab] = useState("alerts");
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const watcherEvents = watcherStatus?.events || [];

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    try {
      const receipt = await createPrivacyReceipt(account.id);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" })
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `digimirror-signed-receipt-${account.id}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      onNotify?.("Cryptographically signed Ed25519 receipt downloaded");
    } catch (err) {
      onNotify?.(err.message || "Could not generate signed receipt");
    } finally {
      setDownloadingReceipt(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Exposure history"
        title="History & alerts."
        description="Track how your privacy exposure changes over time and get a clear signal when something important shifts."
        actions={
          <div className={`watch-status ${watcherStatus?.active ? "" : "waiting"}`}><span /> {watcherStatus?.active ? "Active" : "Waiting for baseline"}</div>
        }
      />

      <section className="watch-grid">
        <article className="watch-hero">
          <div className="watch-radar">
            <Radar size={34} />
            <span className="radar-sweep" />
          </div>
          <div>
            <p className="card-kicker light">Protection status</p>
            <h2>{account.services} services monitored</h2>
            <p>Your latest full scan completed {lastScan}. History tracks every snapshot and surfaces important changes.</p>
          </div>
          <div className="watch-stat"><strong>{watcherStatus?.scan_count || 0}</strong><span>persistent snapshots</span></div>
        </article>

        <article className="card digest-card">
          <p className="card-kicker">Quality summary</p>
          <h2>Quiet by design</h2>
          <div className="digest-number">{qualityMetrics?.total_verified_fixes || 0} <span>verified fixes</span></div>
          <p>{qualityMetrics?.confirmed_accuracy_rate !== null && qualityMetrics?.confirmed_accuracy_rate !== undefined ? `${qualityMetrics.confirmed_accuracy_rate}% user-confirmed accuracy from ${qualityMetrics.finding_feedback_count} ratings.` : "Rate findings in the Exposure Map to build a transparent quality measure."}</p>
        </article>
      </section>

      {/* One-line bonus: Cryptographically signed receipt */}
      <div className="receipt-bonus-strip">
        <div className="receipt-bonus-left">
          <span className="receipt-bonus-icon"><BadgeCheck size={18} /></span>
          <div>
            <strong>Bonus · Cryptographic proof of progress</strong>
            <p>Export an audit-grade Ed25519 signed receipt with SHA-256 evidence fingerprint. No raw personal values are included.</p>
          </div>
        </div>
        <button
          type="button"
          className="receipt-bonus-btn"
          disabled={downloadingReceipt || !(watcherStatus?.scan_count > 0)}
          onClick={handleDownloadReceipt}
        >
          {downloadingReceipt ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}
          <span>{downloadingReceipt ? "Signing…" : "Download signed proof"}</span>
        </button>
      </div>

      <div className="history-tabs" role="tablist" aria-label="History view">
        <button type="button" role="tab" aria-selected={activeTab === "alerts"} className={activeTab === "alerts" ? "active" : ""} onClick={() => setActiveTab("alerts")}>
          <BellRing size={16} /> Alerts
        </button>
        <button type="button" role="tab" aria-selected={activeTab === "timeline"} className={activeTab === "timeline" ? "active" : ""} onClick={() => setActiveTab("timeline")}>
          <History size={16} /> Timeline replay
        </button>
      </div>

      {activeTab === "alerts" ? (
        <section className="card alerts-card">
          <div className="card-header">
            <div>
              <p className="card-kicker">New since your last review</p>
              <h2>Exposure alerts</h2>
            </div>
            <span className="count-pill">{watcherEvents.length} recorded</span>
          </div>
          <div className="alerts-list">
            {watcherEvents.length ? watcherEvents.map((alert) => {
              const level = alert.event_type === "worsened" ? "high" : alert.event_type === "improved" ? "low" : "medium";
              const title = alert.event_type === "baseline" ? "Monitoring baseline created" : `Exposure ${alert.event_type}`;
              const description = `${Math.abs(alert.score_change)}-point change · ${alert.resolved_fields.length} resolved · ${alert.new_fields.length} new · ${alert.verified_fixes} fixes verified`;
              return (
              <article className="alert-row" key={alert.id}>
                <div className={`alert-symbol ${level}`}>
                  {level === "low" ? <ShieldCheck size={18} /> : level === "high" ? <AlertTriangle size={18} /> : <Eye size={18} />}
                </div>
                <div className="alert-copy">
                  <div><h3>{title}</h3><span>{`Score ${alert.score_before ?? "—"} → ${alert.score_after}`}</span></div>
                  <p>{description}</p>
                </div>
                <time>{new Date(alert.created_at).toLocaleDateString()}</time>
                <button type="button" onClick={() => onNavigate("plan")}>
                  Review <ChevronRight size={16} />
                </button>
              </article>
            );}) : <div className="empty-alerts"><Radar size={27} /><strong>No snapshot history yet</strong><span>Import a privacy export to establish a monitoring baseline.</span></div>}
          </div>
        </section>
      ) : (
        <TimelineReplay timeline={timeline} scanComparison={scanComparison} onOpenScanner={onOpenScanner} />
      )}
    </div>
  );
}

function TimelineReplay({ timeline, scanComparison, onOpenScanner }) {
  const [index, setIndex] = useState(Math.max(0, timeline.length - 1));
  const [playing, setPlaying] = useState(false);
  useEffect(() => setIndex(Math.max(0, timeline.length - 1)), [timeline.length]);
  useEffect(() => {
    if (!playing || timeline.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= timeline.length - 1) { setPlaying(false); return current; }
        return current + 1;
      });
    }, 1100);
    return () => window.clearInterval(timer);
  }, [playing, timeline.length]);

  if (!timeline.length) {
    return (
      <div className="card empty-alerts" style={{ padding: "3rem", textAlign: "center" }}>
        <History size={30} style={{ marginBottom: "0.75rem", opacity: 0.4 }} />
        <strong>Your timeline starts with a baseline</strong>
        <span style={{ display: "block", marginTop: "0.5rem", opacity: 0.6 }}>Import an export once to create the first snapshot, then import a newer one to replay the change.</span>
        <button type="button" className="primary-action" style={{ marginTop: "1.25rem" }} onClick={onOpenScanner}>Import a privacy export <ArrowRight size={16} /></button>
      </div>
    );
  }

  const current = timeline[index];
  const previous = index > 0 ? timeline[index - 1] : null;
  const currentFields = current.fields || {};
  const previousFields = previous?.fields || {};
  const newFields = Object.keys(currentFields).filter((field) => !(field in previousFields));
  const resolvedFields = Object.keys(previousFields).filter((field) => !(field in currentFields));
  const changedFields = Object.keys(currentFields).filter((field) => field in previousFields && currentFields[field] !== previousFields[field]);
  const delta = previous ? previous.score - current.score : 0;

  return (
    <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <section className="time-stage" key={current.id}>
        <div className="time-score"><p>Snapshot {index + 1} of {timeline.length}</p><strong>{current.score}</strong><span>{current.risk_level} exposure</span></div>
        <div className="time-summary">
          <time>{new Date(current.created_at).toLocaleString()}</time>
          <h3>{previous ? delta > 0 ? `Exposure improved by ${delta} points` : delta < 0 ? `Exposure increased by ${Math.abs(delta)} points` : "Exposure score stayed stable" : "Monitoring baseline created"}</h3>
          <div>
            <span className="resolved"><CheckCircle2 size={15} /> {resolvedFields.length} resolved</span>
            <span className="new"><AlertTriangle size={15} /> {newFields.length} new</span>
            <span><RotateCcw size={15} /> {changedFields.length} changed</span>
          </div>
        </div>
        <button type="button" className="time-play" onClick={() => { if (index >= timeline.length - 1) setIndex(0); setPlaying((value) => !value); }} disabled={timeline.length < 2}>
          {playing ? <Pause size={18} /> : <Play size={18} />} {playing ? "Pause" : "Replay"}
        </button>
      </section>
      <div className="time-track">
        <i />
        {timeline.map((snapshot, snapshotIndex) => (
          <button type="button" className={snapshotIndex === index ? "active" : snapshotIndex < index ? "past" : ""} onClick={() => { setPlaying(false); setIndex(snapshotIndex); }} key={snapshot.id}>
            <span>{snapshot.score}</span><small>{new Date(snapshot.created_at).toLocaleDateString()}</small>
          </button>
        ))}
      </div>
      <section className="time-details">
        <div><p>Resolved at this point</p>{resolvedFields.length ? resolvedFields.map((field) => <span className="good" key={field}><Check size={14} /> {field}</span>) : <small>No fields resolved in this step</small>}</div>
        <div><p>Newly observed</p>{newFields.length ? newFields.map((field) => <span className="bad" key={field}><AlertTriangle size={14} /> {field}</span>) : <small>No newly observed fields</small>}</div>
        <div><p>Category posture</p>{Object.entries(current.categories || {}).map(([name, score]) => <span key={name}>{name}<strong>{score}</strong></span>)}</div>
      </section>
      {scanComparison?.verifiedFixes ? <div className="lab-success" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--mint)" }}><ShieldCheck size={18} /> Latest comparison verified {scanComparison.verifiedFixes} fixes.</div> : null}
    </div>
  );
}

function TrustCentre({
  account,
  scanResult,
  trustSummary,
  consentRecords,
  connectors,
  qualityMetrics,
  onDelete,
  onDownload,
  onOpenScanner,
}) {
  const [deleteArmed, setDeleteArmed] = useState(false);
  const handleDelete = async () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    await onDelete();
    setDeleteArmed(false);
  };
  return (
    <div className="page-stack">
      <PageHeading
        eyebrow="Trust centre"
        title="Your privacy controls, in plain sight."
        description="See what DigiMirror retains, inspect consent, manage connections, export results, or erase everything derived for this account."
        actions={<button type="button" className="secondary-button" onClick={onDownload}><Download size={18} /> Download report</button>}
      />

      <section className="trust-stat-grid">
        <article className="card trust-stat"><LockKeyhole size={21} /><span>Raw personal values</span><strong>Never stored</strong><small>Imports are processed in memory</small></article>
        <article className="card trust-stat"><Database size={21} /><span>Derived snapshots</span><strong>{trustSummary?.derived_snapshots || 0}</strong><small>{trustSummary?.data_retention || "90-day rolling retention"}</small></article>
        <article className="card trust-stat"><FileCheck2 size={21} /><span>Consent records</span><strong>{trustSummary?.consent_records || consentRecords.length}</strong><small>Purpose and data categories logged</small></article>
        <article className="card trust-stat"><ShieldCheck size={21} /><span>Verified fixes</span><strong>{qualityMetrics?.total_verified_fixes || 0}</strong><small>Confirmed by a later import</small></article>
      </section>

      <section className="trust-layout">
        <article className="card connector-card">
          <div className="card-header">
            <div><p className="card-kicker">Connections</p><h2>Bring data in transparently</h2></div>
            <button type="button" className="text-button" onClick={onOpenScanner}>Import now <ChevronRight size={16} /></button>
          </div>
          <div className="connector-list">
            {connectors.map((connector) => (
              <div className="connector-row" key={connector.id}>
                <span className="connector-icon">{connector.mode === "oauth" ? <Globe2 size={19} /> : <Database size={19} />}</span>
                <div><strong>{connector.name}</strong><small>{connector.mode === "oauth" ? "OAuth + PKCE connector" : "User-controlled export import"}</small></div>
                <span className={`connector-state ${connector.configured ? "configured" : ""}`}>{connector.configured ? "Configured" : connector.mode === "oauth" ? "Needs provider approval" : "Ready"}</span>
                {connector.export_help_url ? <a href={connector.export_help_url} target="_blank" rel="noreferrer">Export help <ExternalLink size={14} /></a> : null}
              </div>
            ))}
          </div>
          <p className="connector-note"><Info size={15} /> OAuth is deliberately disabled until real provider credentials, verification, and approved scopes are supplied.</p>
        </article>

        <article className="card consent-card">
          <div className="card-header"><div><p className="card-kicker">Consent ledger</p><h2>What you authorized</h2></div><span className="count-pill">{consentRecords.length} records</span></div>
          <div className="consent-list">
            {consentRecords.length ? consentRecords.slice(0, 6).map((record) => (
              <div key={record.id || record.created_at}>
                <span><CheckCircle2 size={16} /> Granted</span>
                <strong>{record.purpose}</strong>
                <small>{record.data_categories.join(" · ")} · {new Date(record.created_at).toLocaleDateString()}</small>
              </div>
            )) : <div className="empty-trust"><ShieldQuestion size={25} /><p>No import consent recorded yet.</p></div>}
          </div>
        </article>
      </section>

      <section className="card data-control-card">
        <div><Trash2 size={21} /><span><strong>Delete this account's DigiMirror data</strong><small>Removes snapshots, Watcher events, receipts, canaries, consent, feedback, OAuth state, and local history.</small></span></div>
        <button type="button" className={deleteArmed ? "danger-button armed" : "danger-button"} onClick={handleDelete}>
          <Trash2 size={16} /> {deleteArmed ? "Confirm permanent deletion" : "Delete derived data"}
        </button>
        {deleteArmed ? <button type="button" className="text-button" onClick={() => setDeleteArmed(false)}>Cancel</button> : null}
      </section>
      {!scanResult ? <p className="trust-empty-note">Run a scan to populate Watcher, quality, report, and privacy graph data for {account.label.toLowerCase()}.</p> : null}
    </div>
  );
}

function FixModal({ action, status, onClose, onComplete }) {
  const steps = action.steps?.length ? action.steps : [
    `Open the privacy settings for ${action.source}.`,
    action.description,
    "Save the change, then return to DigiMirror.",
  ];
  const [checked, setChecked] = useState(() => steps.map(() => false));
  const allChecked = checked.every(Boolean);
  const pending = status === "pending_verification";
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="fix-modal" role="dialog" aria-modal="true" aria-labelledby="fix-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close guided fix"><X size={20} /></button>
        <div className="modal-icon"><ShieldCheck size={25} /></div>
        <p className="eyebrow">Guided fix</p>
        <h2 id="fix-title">{action.title}</h2>
        <p className="modal-lead">{action.description}</p>
        {pending ? (
          <div className="pending-verification"><RefreshCw size={20} /><div><strong>Change marked complete</strong><span>Import a newer export to verify that the exposure actually changed. Your score will not drop until then.</span></div></div>
        ) : (
          <div className="fix-steps">
            {steps.map((step, index) => (
              <label key={`${action.id}-${index}`}>
                <input type="checkbox" checked={checked[index]} onChange={() => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))} />
                <span>{checked[index] ? <Check size={15} /> : index + 1}</span>
                <strong>{step}</strong>
              </label>
            ))}
          </div>
        )}
        {action.settings_url ? <a className="settings-link" href={action.settings_url} target="_blank" rel="noreferrer">Open official settings <ExternalLink size={16} /></a> : null}
        <button type="button" className="primary-action modal-action" disabled={!pending && !allChecked} onClick={pending ? onClose : onComplete}>
          {pending ? "Close" : "I made this change"} {!pending ? <ArrowRight size={17} /> : null}
        </button>
        <p className="fix-disclaimer">DigiMirror never changes another service automatically. You stay in control, and a later scan verifies the result.</p>
      </div>
    </div>
  );
}

function ScanModal({
  scanning,
  scanStep,
  scanComplete,
  scanError,
  scanComparison,
  account,
  riskScore,
  onClose,
  onStart,
  onViewResults,
}) {
  const [scanMode, setScanMode] = useState("sample");
  const [selectedFile, setSelectedFile] = useState(null);
  const [threatProfile, setThreatProfile] = useState("everyday");
  const takeoutSelected = selectedFile?.name.toLowerCase().endsWith(".zip");
  const progress = Math.min(100, Math.round((scanStep / scanSteps.length) * 100));

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="scan-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} disabled={scanning} aria-label="Close scanner">
          <X size={20} />
        </button>

        {!scanning && !scanComplete ? (
          <>
            <div className="modal-icon"><ScanSearch size={25} /></div>
            <p className="eyebrow">The Scanner</p>
            <h2 id="scan-title">Create a fresh privacy reflection</h2>
            <p className="modal-lead">
              Run the guided demo or securely import a structured privacy export for a calculated result.
            </p>

            <label className="profile-select">
              <span><UserRoundCog size={16} /> Personalize the risk model</span>
              <select value={threatProfile} onChange={(event) => setThreatProfile(event.target.value)}>
                {threatProfiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.label} — {profile.detail}</option>)}
              </select>
            </label>

            <div className="scan-mode-switch" role="tablist" aria-label="Scan source">
              <button
                type="button"
                role="tab"
                aria-selected={scanMode === "sample"}
                className={scanMode === "sample" ? "active" : ""}
                onClick={() => setScanMode("sample")}
              >
                <Sparkles size={16} /> Guided demo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={scanMode === "import"}
                className={scanMode === "import" ? "active" : ""}
                onClick={() => setScanMode("import")}
              >
                <Database size={16} /> Import export
              </button>
            </div>

            {scanMode === "sample" ? (
              <div className="scan-source-list">
                {platforms.slice(0, account.services).map((platform) => {
                  const Icon = platform.icon;
                  return (
                    <div key={platform.name}>
                      <span className={`platform-icon ${platform.tone}`}><Icon size={18} /></span>
                      <strong>{platform.name}</strong>
                      <span><Check size={15} /> Demo source ready</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <label className={`upload-zone ${selectedFile ? "has-file" : ""}`}>
                <input
                  type="file"
                  accept=".json,.csv,.zip,application/json,text/csv,application/zip"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
                <span className="upload-icon">
                  {selectedFile ? <CheckCircle2 size={23} /> : <Database size={23} />}
                </span>
                <span className="upload-copy">
                  <strong>{selectedFile ? selectedFile.name : "Choose JSON, CSV, or privacy export ZIP"}</strong>
                  <small>
                    {selectedFile
                      ? `${Math.max(1, Math.round(selectedFile.size / 1024))} KB ready to analyze`
                      : "ZIP up to 25 MB · JSON/CSV up to 2 MB"}
                  </small>
                </span>
                <span className="upload-browse">Browse</span>
              </label>
            )}

            {scanError ? (
              <div className="scan-error" role="alert">
                <AlertTriangle size={16} /> <span>{scanError}</span>
              </div>
            ) : null}

            <div className="consent-note">
              <LockKeyhole size={17} />
              <span>
                <strong>Privacy promise:</strong> files are processed in memory. Raw personal values are ignored, never stored, and never returned.
              </span>
            </div>
            <button
              type="button"
              className="primary-action modal-action"
              disabled={scanMode === "import" && !selectedFile}
              onClick={() => onStart(scanMode === "import" ? selectedFile : null, threatProfile)}
            >
              {scanMode === "import" ? "Analyze export" : "Start sample scan"}
              <ArrowRight size={18} />
            </button>
          </>
        ) : null}

        {scanning ? (
          <div className="scanning-state">
            <div className="scanning-visual">
              <div className="scan-ring ring-a" />
              <div className="scan-ring ring-b" />
              <ShieldCheck size={36} />
            </div>
            <p className="eyebrow">{takeoutSelected ? "Privacy export adapter" : "Scanning locally"}</p>
            <h2 id="scan-title">Building your reflection…</h2>
            <p className="scan-current">
              {scanSteps[Math.min(scanStep, scanSteps.length - 1)]}
            </p>
            <div className="scan-progress"><span style={{ width: `${progress}%` }} /></div>
            <div className="scan-progress-label">
              <span>{progress}% complete</span>
              <span>{takeoutSelected ? "Schema-based detection" : "Processed in memory"}</span>
            </div>
            <div className="step-list">
              {scanSteps.map((step, index) => (
                <div className={index < scanStep ? "step-done" : index === scanStep ? "step-active" : ""} key={step}>
                  <span>{index < scanStep ? <Check size={14} /> : index + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {scanComplete ? (
          <div className="complete-state">
            <div className="complete-icon"><Check size={31} /></div>
            <p className="eyebrow">Reflection updated</p>
            <h2 id="scan-title">Your latest snapshot is ready.</h2>
            <p>
              We mapped {account.exposedFields} exposed fields and found {account.actionCount} actions worth taking.
            </p>
            {scanComparison ? (
              <div className={`rescan-verification ${scanComparison.scoreChange >= 0 ? "improved" : "worse"}`}>
                {scanComparison.scoreChange >= 0 ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                <div>
                  <strong>
                    {scanComparison.scoreChange > 0
                      ? `${scanComparison.scoreChange}-point improvement verified`
                      : scanComparison.scoreChange < 0
                        ? `${Math.abs(scanComparison.scoreChange)}-point increase detected`
                        : "No score change detected"}
                  </strong>
                  <span>
                    {scanComparison.verifiedFixes} fixes verified · {scanComparison.resolved.length} findings resolved · {scanComparison.added.length} new
                  </span>
                </div>
              </div>
            ) : account.importType !== "sample" && account.importType !== "normalized" ? (
              <div className="rescan-verification baseline">
                <Database size={20} />
                <div>
                  <strong>Export baseline created</strong>
                  <span>Import a newer archive later to verify privacy improvements.</span>
                </div>
              </div>
            ) : null}
            <div className="complete-stats">
              <div><strong>{account.exposedFields}</strong><span>fields mapped</span></div>
              <div><strong>{account.actionCount}</strong><span>priority fixes</span></div>
              <div><strong>{riskScore}</strong><span>exposure score</span></div>
            </div>
            <button type="button" className="primary-action modal-action" onClick={onViewResults}>
              View my results <ArrowRight size={18} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AuthModal({ onClose, onLoginSuccess }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [threatProfile, setThreatProfile] = useState("everyday");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleQuickSampleLogin = async () => {
    setError("");
    setSubmitting(true);
    try {
      const data = await loginUser("sample", "sample123");
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || "Failed to log in as sample");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (tab === "login") {
        const data = await loginUser(email, password);
        onLoginSuccess(data);
      } else {
        const data = await signupUser({
          email,
          password,
          name: name.trim() || "User",
          account_name: accountName.trim() || undefined,
          threat_profile: threatProfile,
        });
        onLoginSuccess(data);
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="auth-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>

        <div className="modal-icon"><KeyRound size={24} /></div>
        <p className="eyebrow">Session & Multi-Account Workspace</p>
        <h2>{tab === "login" ? "Sign in to DigiMirror" : "Create DigiMirror Account"}</h2>
        <p className="modal-lead">
          Sign in to link multiple accounts, sync across devices, and retain persistent privacy history.
        </p>

        {/* Quick Sample Login Box */}
        <div className="quick-login-box">
          <div className="quick-login-box-text">
            <strong>⚡ Default Demo Account</strong>
            <small>Instant access with pre-configured sample profiles</small>
          </div>
          <button type="button" className="quick-login-btn" onClick={handleQuickSampleLogin} disabled={submitting}>
            <Zap size={14} /> Quick Demo Login
          </button>
        </div>

        <div className="auth-divider"><span>or with credentials</span></div>

        <div className="scan-mode-switch" role="tablist">
          <button
            type="button"
            className={tab === "login" ? "active" : ""}
            onClick={() => { setTab("login"); setError(""); }}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            type="button"
            className={tab === "signup" ? "active" : ""}
            onClick={() => { setTab("signup"); setError(""); }}
          >
            <UserPlus size={15} /> Create Account
          </button>
        </div>

        {error ? <div className="auth-error-banner">{error}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === "signup" ? (
            <div className="form-field">
              <label>Your Name</label>
              <input
                type="text"
                placeholder="e.g. Harshika Thopte"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          ) : null}

          <div className="form-field">
            <label>Email Address</label>
            <input
              type="text"
              placeholder="e.g. user@example.com (or 'sample')"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              placeholder={tab === "signup" ? "Minimum 6 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {tab === "signup" ? (
            <>
              <div className="form-field">
                <label>Initial Account Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g. Personal Profile"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>Threat Profile Lens</label>
                <select value={threatProfile} onChange={(e) => setThreatProfile(e.target.value)}>
                  <option value="everyday">Everyday</option>
                  <option value="public_figure">Public Figure</option>
                  <option value="frequent_traveler">Frequent Traveler</option>
                  <option value="financially_sensitive">Financially Sensitive</option>
                  <option value="family">Family Safety</option>
                </select>
              </div>
            </>
          ) : null}

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? "Authenticating…" : tab === "login" ? "Sign In" : "Create Account"} <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-toggle-link">
          {tab === "login" ? (
            <span>Don't have an account? <button type="button" onClick={() => { setTab("signup"); setError(""); }}>Create one</button></span>
          ) : (
            <span>Already have an account? <button type="button" onClick={() => { setTab("login"); setError(""); }}>Sign in</button></span>
          )}
        </div>
      </div>
    </div>
  );
}

function AddAccountModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("Personal account");
  const [threatProfile, setThreatProfile] = useState("everyday");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await onCreated({ name: name.trim(), label, threatProfile });
    } catch (err) {
      setError(err.message || "Failed to add account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="add-account-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>

        <div className="modal-icon"><Plus size={24} /></div>
        <p className="eyebrow">Multi-Account Workspace</p>
        <h2>Link New Account Profile</h2>
        <p className="modal-lead">
          Create an isolated privacy profile for your personal identity, work account, or family member.
        </p>

        {error ? <div className="auth-error-banner">{error}</div> : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Profile Name</label>
            <input
              type="text"
              placeholder="e.g. Harshika (Freelance), Ishan (Kids)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-field">
            <label>Context / Label</label>
            <select value={label} onChange={(e) => setLabel(e.target.value)}>
              <option value="Personal account">Personal account</option>
              <option value="Work account">Work account</option>
              <option value="Family member">Family member</option>
              <option value="Research / Test">Research / Test</option>
              <option value="Travel identity">Travel identity</option>
            </select>
          </div>

          <div className="form-field">
            <label>Threat Profile Lens</label>
            <select value={threatProfile} onChange={(e) => setThreatProfile(e.target.value)}>
              <option value="everyday">Everyday</option>
              <option value="public_figure">Public Figure</option>
              <option value="frequent_traveler">Frequent Traveler</option>
              <option value="financially_sensitive">Financially Sensitive</option>
              <option value="family">Family Safety</option>
            </select>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={submitting || !name.trim()}>
            {submitting ? "Adding…" : "Add Linked Profile"} <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
