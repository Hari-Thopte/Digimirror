import PrintSummary from "./components/PrintSummary";
import { en, text } from "./i18n/en";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Check,
  Command,
  History,
  House,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LockKeyhole,
  Menu,
  Moon,
  Network,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { AuthDialog, type AuthMode } from "./components/AuthDialog";
import { readAuthUser, signOut, type AuthUser } from "./data/auth";
import {
  mock,
  type Activity as ActivityItem,
  type Fix,
  type FixStatus,
  type Screen,
} from "./data/mock";
import {
  applyFix,
  clearSnapshot,
  readSession,
  readDevice,
  writeDevice,
  restoreSnapshot,
  scoreFor,
  writeSession,
  type Theme,
} from "./data/state";
import {
  Brand,
  Button,
  CommandSearch,
  Dialog,
  ImportDialog,
  SampleBadge,
} from "./components/UI";
import {
  Connectivity,
  EvidenceDrawer,
  MissingPage,
  Notifications,
  Onboarding,
  ScreenBoundary,
  Skeleton,
  WhatChanged,
} from "./components/Experience";
import { MotionPreference } from "./components/preferences";
const minimumLoad = <T,>(load: Promise<T>): Promise<T> =>
  Promise.all([load, new Promise((resolve) => setTimeout(resolve, 300))]).then(
    ([module]) => module,
  );
const Landing = lazy(() => minimumLoad(import("./screens/Landing")));
const Overview = lazy(() => minimumLoad(import("./screens/Overview")));
const ExposureMap = lazy(() => minimumLoad(import("./screens/ExposureMap")));
const PlanScreen = lazy(() =>
  minimumLoad(
    import("./screens/WorkspaceScreens").then((m) => ({
      default: m.PlanScreen,
    })),
  ),
);
const HistoryScreen = lazy(() =>
  minimumLoad(
    import("./screens/WorkspaceScreens").then((m) => ({
      default: m.HistoryScreen,
    })),
  ),
);
const LabScreen = lazy(() =>
  minimumLoad(
    import("./screens/WorkspaceScreens").then((m) => ({
      default: m.LabScreen,
    })),
  ),
);
const TrustScreen = lazy(() =>
  minimumLoad(
    import("./screens/WorkspaceScreens").then((m) => ({
      default: m.TrustScreen,
    })),
  ),
);
const Settings = lazy(() => minimumLoad(import("./screens/Settings")));
export interface FileSummary {
  name: string;
  records: number;
  format: string;
}
export interface WorkspaceData {
  hasData: boolean;
  score: number;
  statuses: Record<string, FixStatus>;
  activity: ActivityItem[];
  fileSummary: FileSummary | null;
  navigate: (s: Screen) => void;
  showImport: () => void;
  loadSample: () => void;
  startFix: (f: Fix) => void;
  setFix: (f: Fix, s: FixStatus) => void;
  notify: (s: string) => void;
  clearData: () => void;
  clearFile: () => void;
  showEvidence: (id?: string) => void;
  exportData: () => void;
}
const icons = {
  overview: LayoutDashboard,
  map: Network,
  plan: ListChecks,
  history: History,
  lab: Sparkles,
  trust: ShieldCheck,
  settings: SettingsIcon,
};
export default function App() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || "home");
  const [theme, setThemeState] = useState<Theme>(() =>
    readSession("dm-theme", readDevice<Theme>("dm-theme", "system")),
  );
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [reduceMotion, setReduceMotion] = useState(() =>
    readSession("dm-reduced", false),
  );
  const [textSize, setTextSize] = useState(() =>
    readSession("dm-text", "standard"),
  );
  const osReduced = useReducedMotion();
  const reduced = !!osReduced || reduceMotion;
  const dark = theme === "dark" || (theme === "system" && systemDark);
  const [splash, setSplash] = useState(true);
  const [onboard, setOnboard] = useState(
    () => !readDevice("dm-onboard", readSession("dm-onboard", false)),
  );
  const [state, setState] = useState(restoreSnapshot);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [command, setCommand] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [profile, setProfile] = useState(false),
    [notifications, setNotifications] = useState(false),
    [clearConfirm, setClearConfirm] = useState(false),
    [railOpen, setRailOpen] = useState(false);
  const [read, setRead] = useState<string[]>(() => readSession("dm-read", []));
  const [activeFix, setActiveFix] = useState<Fix | null>(null),
    [checked, setChecked] = useState<number[]>([]),
    [evidence, setEvidence] = useState<string | null>(null);
  const [changed, setChanged] = useState<{
    fix: Fix;
    before: number;
    after: number;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(readAuthUser);
  const [undo, setUndo] = useState<(() => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef<HTMLElement>(null);
  const score = scoreFor(state);
  const workspace = route === "app" || route.startsWith("app/");
  const screen = (
    route === "app"
      ? readSession<Screen>("dm-last-screen", "overview")
      : route.slice(4)
  ) as Screen;
  const valid =
    mock.navigation.some((n) => n.id === screen) || screen === "settings";
  const notify = useCallback((message: string, reverse?: () => void) => {
    setToast(message);
    setUndo(() => reverse || null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast("");
      setUndo(null);
    }, 8000);
  }, []);
  const navigate = useCallback((s: Screen) => {
    location.hash = `app/${s}`;
  }, []);
  const finishSplash = useCallback(() => {
    setSplash(false);
    writeSession("dm-intro", true);
  }, []);
  const finishOnboarding = () => {
    setOnboard(false);
    writeSession("dm-onboard", true);
    writeDevice("dm-onboard", true);
  };
  const setTheme = (t: Theme) => {
    document.documentElement.classList.add("theme-changing");
    setThemeState(t);
    setTimeout(
      () => document.documentElement.classList.remove("theme-changing"),
      180,
    );
  };
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || "home");
      setProfile(false);
      setRailOpen(false);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const m = matchMedia("(prefers-color-scheme: dark)");
    const f = () => setSystemDark(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#0c1a16" : "#f3f6f2");
    writeSession("dm-theme", theme);
    writeDevice("dm-theme", theme);
  }, [dark, theme]);
  useEffect(() => {
    writeSession("dm-state", state);
  }, [state]);
  useEffect(() => {
    writeSession("dm-reduced", reduceMotion);
    document.documentElement.dataset.reduced = String(reduced);
  }, [reduceMotion, reduced]);
  useEffect(() => {
    writeSession("dm-text", textSize);
    document.documentElement.dataset.text = textSize;
  }, [textSize]);
  useEffect(() => {
    writeSession("dm-read", read);
  }, [read]);
  useEffect(() => {
    if (!splash) return;
    const id = setTimeout(finishSplash, reduced ? 100 : 1050);
    return () => clearTimeout(id);
  }, [splash, reduced, finishSplash]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((v) =>
          v ? false : !document.querySelector("dialog[open]"),
        );
      }
      if (e.key === "Escape") {
        setProfile(false);
        setRailOpen(false);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    const label =
      mock.navigation.find((n) => n.id === screen)?.label ||
      (screen === "settings" ? en["app_settings"] : en["app_page_not_found"]);
    document.title = workspace
      ? text("app_digimirror", label)
      : en["app_digimirror_privacy_reflected"];
    if (workspace) writeSession("dm-last-screen", screen);
    window.scrollTo(0, 0);
    pageRef.current?.focus({ preventScroll: true });
  }, [route, screen, workspace]);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );
  function loadSample() {
    setState(restoreInitial());
    notify(en["app_sample_data_loaded_your_privacy_overview_is_ready"]);
  }
  function restoreInitial() {
    return {
      hasData: true,
      statuses: {},
      activity: mock.initialActivity,
      fileSummary: null,
    };
  }
  function startFix(f: Fix) {
    setChecked([]);
    setActiveFix(f);
  }
  function setFix(f: Fix, status: FixStatus) {
    const previous = stateRef.current;
    const next = applyFix(previous, f.id, status);
    if (next === previous) {
      notify(text("app_already_status", f.title));
      return;
    }
    setState(next);
    if (status === "done") {
      setChanged({ fix: f, before: scoreFor(previous), after: scoreFor(next) });
      notify(
        text("app_marked_done_sample_score", f.title, scoreFor(next)),
        () => {
          setState(previous);
          setChanged(null);
          notify(text("app_undone", f.title));
        },
      );
    } else
      notify(
        text(
          "app_action_status",
          f.title,
          status === "later" ? en.app_saved_for_later : en.app_reopened,
        ),
      );
  }
  function clearData() {
    const previous = stateRef.current;
    setState(clearSnapshot());
    notify(
      en["app_sample_score_plan_activity_and_file_summary_cleared"],
      () => {
        setState(previous);
        notify(en["app_your_sample_data_was_restored"]);
      },
    );
  }
  function exportData() {
    const value = {
      kind: en["app_digimirror_illustrative_sample"],
      generatedAt: new Date().toISOString(),
      sampleScore: state.hasData ? score : null,
      actions: state.statuses,
      history: state.activity,
      fileSummary: state.fileSummary
        ? {
            format: state.fileSummary.format,
            records: state.fileSummary.records,
          }
        : null,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-digimirror-reflection.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(en["app_export_my_reflection_downloaded_a_sample_json_copy"]);
  }
  const data: WorkspaceData = {
    ...state,
    score,
    navigate,
    showImport: () => setImportOpen(true),
    loadSample,
    startFix,
    setFix,
    notify,
    clearData,
    clearFile: () => {
      setState((s) => ({ ...s, fileSummary: null }));
      notify(en["app_file_summary_cleared"]);
    },
    showEvidence: (id = "all") => setEvidence(id),
    exportData,
  };
  const mainNav = mock.navigation.filter((n) => n.id !== "trust");
  const displayedUser = authUser || mock.user;
  const displayedInitials = authUser
    ? authUser.name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : mock.user.initials;
  const renderScreen = () =>
    !valid ? (
      <MissingPage onHome={() => navigate("overview")} />
    ) : screen === "overview" ? (
      <Overview data={data} />
    ) : screen === "map" ? (
      <ExposureMap data={data} />
    ) : screen === "plan" ? (
      <PlanScreen data={data} />
    ) : screen === "history" ? (
      <HistoryScreen data={data} />
    ) : screen === "lab" ? (
      <LabScreen data={data} />
    ) : screen === "trust" ? (
      <TrustScreen data={data} />
    ) : (
      <Settings
        data={data}
        theme={theme}
        setTheme={setTheme}
        reduced={reduceMotion}
        setReduced={setReduceMotion}
        textSize={textSize}
        setTextSize={setTextSize}
        replay={() => setOnboard(true)}
      />
    );
  const navLink = (item: { id: Screen; label: string }) => {
    const Icon = icons[item.id];
    return (
      <a
        key={item.id}
        href={`#app/${item.id}`}
        aria-label={item.label}
        aria-current={screen === item.id ? "page" : undefined}
        title={item.label}
      >
        <Icon size={20} />
        <span>{item.label}</span>
        {item.id === "plan" && state.hasData && (
          <small>
            {mock.fixes.filter((f) => state.statuses[f.id] !== "done").length}
          </small>
        )}
      </a>
    );
  };
  return (
    <MotionPreference.Provider value={reduced}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>
        <PrintSummary data={data} />
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main-content")?.focus();
          }}
        >
          {en["app_skip_to_content"]}
        </a>
        <Connectivity />
        {workspace ? (
          <div className="workspace-shell">
            <aside className={`sidebar ${railOpen ? "rail-expanded" : ""}`}>
              <a
                className="sidebar-brand"
                href="#home"
                aria-label={en["app_digimirror_home"]}
              >
                <Brand />
                <img
                  className="rail-shield"
                  src="/shield-transparent.png"
                  alt=""
                  width="44"
                  height="44"
                />
              </a>
              <button
                className="rail-toggle icon-button"
                aria-label={en["app_expand_navigation"]}
                aria-expanded={railOpen}
                onClick={() => setRailOpen(!railOpen)}
              >
                <Menu size={20} />
              </button>
              <a
                className="back-to-site"
                href="#home"
                aria-label={en["app_back_to_site"]}
              >
                <ArrowLeft size={16} />
                <span>{en["app_back_to_site"]}</span>
              </a>
              <nav aria-label={en["app_workspace"]}>{mainNav.map(navLink)}</nav>
              <div className="sidebar-bottom">
                <nav aria-label={en["app_privacy_and_preferences"]}>
                  {navLink({ id: "trust", label: en["app_trust_centre"] })}
                  {navLink({ id: "settings", label: en["app_settings"] })}
                </nav>
                <button
                  className="sidebar-profile"
                  onClick={() => navigate("settings")}
                  aria-label={en["app_profile_and_settings"]}
                >
                  <span className="profile-initials">{displayedInitials}</span>
                  <span>
                    <strong>{"fullName" in displayedUser ? displayedUser.fullName : displayedUser.name}</strong>
                    <small>{authUser ? authUser.email : en["app_sample_profile"]}</small>
                  </span>
                </button>
              </div>
            </aside>
            <div className="workspace-main">
              <header className="workspace-header">
                <a
                  href="#home"
                  className="mobile-home"
                  aria-label={en["app_back_to_site"]}
                >
                  <House size={20} />
                </a>
                <span className="privacy-status">
                  <LockKeyhole size={16} />
                  <span>{en["app_local_preview"]}</span>
                </span>
                {state.hasData && <SampleBadge />}
                <div className="header-controls">
                  <button
                    className="command-button"
                    onClick={() => setCommand(true)}
                    aria-label={en["app_search_pages_and_actions"]}
                  >
                    <Search size={20} />
                    <span>{en["app_find_something"]}</span>
                    <kbd>
                      <Command size={12} />
                      {en["app_k"]}
                    </kbd>
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => setNotifications(true)}
                    aria-label={text(
                      "app_notifications_unread_sample_items",
                      2 - read.length,
                    )}
                  >
                    <Bell size={20} />
                    {read.length < 2 && <span className="unread-indicator" />}
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => setTheme(dark ? "light" : "dark")}
                    aria-label={text("app_use_theme", dark ? "light" : "dark")}
                  >
                    {dark ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                  <div className="profile-wrap">
                    <button
                      className="avatar-button"
                      aria-label={en["app_open_profile_menu"]}
                      aria-expanded={profile}
                      onClick={() => setProfile(!profile)}
                    >
                      {displayedInitials}
                    </button>
                    {profile && (
                      <>
                        <button
                          className="menu-dismiss"
                          tabIndex={-1}
                          aria-label={en["app_close_profile_menu"]}
                          onClick={() => setProfile(false)}
                        />
                        <div className="avatar-menu">
                          <strong>{"fullName" in displayedUser ? displayedUser.fullName : displayedUser.name}</strong>
                          <p>{authUser ? authUser.email : en["app_sample_profile"]}</p>
                          <button onClick={() => navigate("settings")}>
                            {en["app_settings_1"]}
                            <SettingsIcon size={20} />
                          </button>
                          <button onClick={() => navigate("trust")}>
                            {en["app_trust_centre_2"]}
                            <ShieldCheck size={20} />
                          </button>
                          <a href="#home">
                            {en["app_back_to_site_3"]}
                            <House size={20} />
                          </a>
                          {authUser ? (
                            <button onClick={() => {
                              signOut();
                              setAuthUser(null);
                              setProfile(false);
                              notify("Signed out. Harshika's sample profile is active.");
                            }}>
                              {en.auth_sign_out}
                              <LogIn size={20} />
                            </button>
                          ) : (
                            <button onClick={() => { setProfile(false); setAuthMode("login"); }}>
                              {en.auth_sign_in_or_create}
                              <LogIn size={20} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </header>
              <main
                id="main-content"
                tabIndex={-1}
                ref={pageRef}
                className="workspace-content"
              >
                <p className="breadcrumb">
                  {en["app_workspace_4"]}
                  {mock.navigation.find((n) => n.id === screen)?.label ||
                    (screen === "settings"
                      ? en["app_settings"]
                      : en["app_page_not_found"])}
                </p>
                <ScreenBoundary key={screen} onReset={() => location.reload()}>
                  <Suspense fallback={<Skeleton />}>
                    <motion.div
                      key={screen}
                      className="screen-body"
                      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      {renderScreen()}
                    </motion.div>
                  </Suspense>
                </ScreenBoundary>
              </main>
            </div>
            <nav
              className="bottom-tabs"
              aria-label={en["app_mobile_workspace"]}
            >
              {mainNav.map((item) => {
                const Icon = icons[item.id];
                return (
                  <a
                    key={item.id}
                    href={`#app/${item.id}`}
                    aria-current={screen === item.id ? "page" : undefined}
                    aria-label={item.label}
                  >
                    <Icon size={20} />
                    <span>
                      {item.id === "overview"
                        ? en.mobile_home
                        : item.id === "history"
                          ? en.mobile_history
                          : item.id === "map"
                            ? en["app_map"]
                            : item.id === "plan"
                              ? en["app_plan"]
                              : item.label}
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>
        ) : (
          <ScreenBoundary onReset={() => location.reload()}>
            <Suspense fallback={<Skeleton />}>
              <Landing
                dark={dark}
                toggleTheme={() => setTheme(dark ? "light" : "dark")}
                openImport={() => setImportOpen(true)}
                openEvidence={() => setEvidence("baseline")}
                openLogin={() => setAuthMode("login")}
                openSignup={() => setAuthMode("signup")}
              />
            </Suspense>
          </ScreenBoundary>
        )}
        <AnimatePresence>
          {splash && (
            <motion.div
              className="intro-overlay"
              role="dialog"
              aria-label={en["app_welcome_to_digimirror"]}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.12 }}
            >
              <button
                className="intro-skip button secondary"
                onClick={finishSplash}
              >
                {en["app_skip"]}
                <X size={16} />
              </button>
              <motion.div
                className="intro-brand"
                initial={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduced ? 0 : 0.4 }}
              >
                <img
                  src="/shield-transparent.png"
                  alt={en["app_digimirror_shield_logo"]}
                  width="160"
                  height="160"
                />
                <h1>{en["app_digimirror_5"]}</h1>
                <p>{en["app_privacy_reflected"]}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {!splash && workspace && onboard && (
          <Onboarding
            onClose={finishOnboarding}
            onSample={loadSample}
            onImport={() => setImportOpen(true)}
          />
        )}
        {command && (
          <CommandSearch
            navigate={navigate}
            onClose={() => setCommand(false)}
            onImport={() => setImportOpen(true)}
            onFix={(f) => {
              if (!state.hasData) loadSample();
              startFix(f);
            }}
            actions={[
              {
                id: "next",
                label: en["app_start_next_fix"],
                shortcut: en["app_enter"],
                run: () => {
                  const f = mock.fixes.find(
                    (f) =>
                      state.statuses[f.id] !== "done" &&
                      state.statuses[f.id] !== "later",
                  );
                  if (f) {
                    if (!state.hasData) loadSample();
                    startFix(f);
                  } else {
                    navigate("plan");
                    notify(
                      en[
                        "app_review_your_completed_or_deferred_sample_actions"
                      ],
                    );
                  }
                },
              },
              {
                id: "theme",
                label: en["app_toggle_theme"],
                shortcut: en["app_enter"],
                run: () => setTheme(dark ? "light" : "dark"),
              },
              {
                id: "export",
                label: en["app_export_my_reflection"],
                shortcut: en["app_enter"],
                run: exportData,
              },
              {
                id: "clear",
                label: en["app_clear_sample_data"],
                shortcut: en["app_enter"],
                run: () => setClearConfirm(true),
              },
            ]}
          />
        )}
        {importOpen && (
          <ImportDialog
            onClose={() => setImportOpen(false)}
            onSample={loadSample}
            onMetadata={(summary) => {
              setState((s) => ({ ...s, fileSummary: summary }));
              notify(en["app_file_preview_ready_analysed_on_this_device_only"]);
            }}
          />
        )}
        {activeFix && (
          <Dialog title={activeFix.title} onClose={() => setActiveFix(null)}>
            <div className="fix-meta">
              <span className="impact-chip">
                {en["app_sample"]}
                {activeFix.impact}
                {en["app_points"]}
              </span>
              <span>
                {activeFix.minutes}
                {en["app_minutes"]}
              </span>
              <span>{activeFix.service}</span>
            </div>
            <h3>{en["app_what_will_change"]}</h3>
            <p className="dialog-lead">{activeFix.description}</p>
            <p className="evidence-limit">
              {
                en[
                  "app_illustrative_guidance_for_this_sample_menu_names_vary_between_re"
                ]
              }
            </p>
            {activeFix.help && (
              <a
                className="button quiet"
                href={activeFix.help}
                target="_blank"
                rel="noreferrer"
              >
                {en.current_service_help}
              </a>
            )}
            <div className="guided-steps">
              {activeFix.steps.map((s, i) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={checked.includes(i)}
                    onChange={() =>
                      setChecked((a) =>
                        a.includes(i) ? a.filter((v) => v !== i) : [...a, i],
                      )
                    }
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
            <p className="small muted">
              {
                en[
                  "app_digimirror_records_your_sample_choice_it_does_not_change_or_veri"
                ]
              }
            </p>
            <div className="button-row">
              <Button
                disabled={checked.length !== activeFix.steps.length}
                onClick={() => {
                  setFix(activeFix, "done");
                  setActiveFix(null);
                }}
              >
                {en["app_done_i_changed_it"]}
              </Button>
              <Button
                kind="quiet"
                onClick={() => {
                  setFix(activeFix, "later");
                  setActiveFix(null);
                }}
              >
                {en["app_remind_me_later"]}
              </Button>
            </div>
          </Dialog>
        )}
        {changed && (
          <WhatChanged
            {...changed}
            next={mock.fixes.find(
              (f) =>
                state.statuses[f.id] !== "done" &&
                state.statuses[f.id] !== "later",
            )}
            onClose={() => setChanged(null)}
            onNext={startFix}
            onUndo={
              undo
                ? () => {
                    undo();
                    setUndo(null);
                  }
                : undefined
            }
          />
        )}
        {evidence && (
          <EvidenceDrawer
            serviceId={evidence}
            data={data}
            onClose={() => setEvidence(null)}
          />
        )}
        {notifications && (
          <Notifications
            read={read}
            onRead={setRead}
            onClose={() => setNotifications(false)}
          />
        )}
        {clearConfirm && (
          <Dialog
            title={en["app_clear_sample_data_6"]}
            onClose={() => setClearConfirm(false)}
          >
            <p>
              {
                en[
                  "app_this_removes_the_sample_score_plan_choices_activity_history_and_"
                ]
              }
            </p>
            <div className="button-row">
              <Button
                kind="danger"
                onClick={() => {
                  clearData();
                  setClearConfirm(false);
                }}
              >
                {en["app_clear_sample_data"]}
              </Button>
              <Button kind="secondary" onClick={() => setClearConfirm(false)}>
                {en["app_keep_my_data"]}
              </Button>
            </div>
          </Dialog>
        )}
        {authMode && (
          <AuthDialog
            initialMode={authMode}
            onClose={() => setAuthMode(null)}
            onAuthenticated={(user, sample) => {
              setAuthUser(user);
              setAuthMode(null);
              notify(sample ? "Harshika's sample account is ready." : `Welcome, ${user.name}. Your account is ready.`);
              location.hash = "app/overview";
            }}
          />
        )}
        <div className="live-announcer" aria-live="polite" aria-atomic="true">
          {toast}
        </div>
        <AnimatePresence>
          {toast && (
            <motion.div
              className="toast"
              initial={{ opacity: 0, y: reduced ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Check size={20} />
              <span>{toast}</span>
              {undo && (
                <button
                  className="undo-button"
                  onClick={() => {
                    undo();
                    setUndo(null);
                  }}
                >
                  {en["app_undo"]}
                </button>
              )}
              <button
                onClick={() => setToast("")}
                aria-label={en["app_dismiss_notification"]}
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </MotionPreference.Provider>
  );
}
