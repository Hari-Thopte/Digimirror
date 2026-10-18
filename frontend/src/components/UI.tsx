import { en, text } from "../i18n/en";
import { useAppReducedMotion } from "./preferences";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { animate } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Download,
  FileUp,
  LockKeyhole,
  LoaderCircle,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { mock, riskFor, type Fix, type Screen } from "../data/mock";
import { countCsvRecords } from "./filePreview";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <img
        className={`brand-logo light-logo ${compact ? "compact" : ""}`}
        src="/logo-transparent.png"
        width="786"
        height="338"
        alt={en["app_digimirror_privacy_reflected"]}
      />
      <img
        className={`brand-logo dark-logo ${compact ? "compact" : ""}`}
        src="/logo-white.png"
        width="786"
        height="338"
        alt={en["app_digimirror_privacy_reflected"]}
      />
    </>
  );
}
export function SampleBadge() {
  return (
    <span className="sample-badge">
      <span />
      {en["ui_sample_data"]}
    </span>
  );
}
export function Button({
  children,
  onClick,
  kind = "primary",
  disabled = false,
  className = "",
  type = "button",
  loading = false,
  success = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "secondary" | "quiet" | "danger";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  loading?: boolean;
  success?: boolean;
}) {
  return (
    <button
      type={type}
      className={`button ${kind} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading ? (
        <LoaderCircle className="spinner" size={20} />
      ) : success ? (
        <Check className="success-check" size={20} />
      ) : null}
      {children}
    </button>
  );
}
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const cancel = (event: Event) => {
      event.preventDefault();
      closeRef.current();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      dialog.close();
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "wide" : ""}`}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label={en["ui_close_dialog"]}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function ScoreRing({
  score,
  animateIntro = false,
  small = false,
}: {
  score: number;
  animateIntro?: boolean;
  small?: boolean;
}) {
  const reduced = useAppReducedMotion();
  const [display, setDisplay] = useState(animateIntro && !reduced ? 0 : score);
  const previous = useRef(display);
  const risk = riskFor(score);
  useEffect(() => {
    const controls = animate(previous.current, score, {
      duration: reduced ? 0 : animateIntro && previous.current < 1 ? 0.9 : 0.45,
      ease: "easeOut",
      onUpdate: (value) => {
        previous.current = value;
        setDisplay(Math.round(value));
      },
    });
    return () => controls.stop();
  }, [score, reduced, animateIntro]);
  return (
    <div
      tabIndex={0}
      title={text("ui_sample_100", score, risk.sentence)}
      className={`score-ring ${risk.tone} ${score < 35 ? "good-pulse" : ""} ${small ? "small" : ""}`}
      role="img"
      aria-label={text(
        "ui_sample_exposure_score_out_of_100_lower_is_better",
        score,
        risk.label,
      )}
    >
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <circle className="ring-track" cx="120" cy="120" r="104" />
        <circle
          className="ring-value"
          cx="120"
          cy="120"
          r="104"
          pathLength="100"
          strokeDasharray={`${display} 100`}
        />
      </svg>
      <div className="score-number" aria-hidden="true">
        <strong>{display}</strong>
        <span>{en["ui_sample_100_7"]}</span>
      </div>
    </div>
  );
}
export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  onSample,
  onGuide,
}: {
  title: string;
  description: string;
  onSample: () => void;
  onGuide: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-symbol">
        <ShieldCheck size={24} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="button-row">
        <Button onClick={onSample}>{en["ui_try_with_sample_data"]}</Button>
        <Button kind="quiet" onClick={onGuide}>
          {en["ui_how_to_get_your_export"]}
        </Button>
      </div>
      <ol className="inline-guide">
        {mock.exportSteps.slice(0, 3).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </div>
  );
}
export function CommandSearch({
  navigate,
  onClose,
  onImport,
  onFix,
  actions = [],
}: {
  navigate: (screen: Screen) => void;
  onClose: () => void;
  onImport: () => void;
  onFix: (fix: Fix) => void;
  actions?: {
    id: string;
    label: string;
    shortcut?: string;
    run: () => void;
  }[];
}) {
  const [query, setQuery] = useState("");
  const options = [
    ...actions,
    {
      id: "settings",
      label: en["app_settings"],
      run: () => navigate("settings"),
    },
    ...mock.navigation.map((item) => ({
      id: item.id,
      label: item.label,
      shortcut: en["app_enter"],
      run: () => navigate(item.id),
    })),
    { id: "import", label: en["ui_preview_my_export"], run: onImport },
    ...mock.fixes.map((fix) => ({
      id: `fix-${fix.id}`,
      label: fix.title,
      run: () => onFix(fix),
    })),
  ];
  const results = options.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Dialog title={en["ui_find_your_next_step"]} onClose={onClose}>
      <label className="search-input">
        <Search size={20} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={en["app_search_pages_and_actions"]}
          aria-label={en["app_search_pages_and_actions"]}
        />
      </label>
      <div className="command-results">
        {results.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onClose();
              item.run();
            }}
          >
            <span>{item.label}</span>
            <kbd>{en["app_enter"]}</kbd>
            <ChevronRight size={20} />
          </button>
        ))}
        {!results.length && (
          <p>{en["ui_no_matching_page_or_action_try_plan_phone_or_export"]}</p>
        )}
      </div>
      <p className="small muted">
        {
          en[
            "ui_cmd_ctrl_k_opens_search_tab_moves_through_results_enter_runs_an_"
          ]
        }
      </p>
    </Dialog>
  );
}
export function ImportDialog({
  onClose,
  onSample,
  onMetadata,
}: {
  onClose: () => void;
  onSample: () => void;
  onMetadata: (metadata: {
    name: string;
    records: number;
    format: string;
  }) => void;
}) {
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [summary, setSummary] = useState<{
    name: string;
    records: number;
    format: string;
  } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [dragging, setDragging] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => setSuccess(false), 1200);
    return () => clearTimeout(id);
  }, [success]);
  async function inspect(file: File) {
    setError("");
    setSummary(null);
    if (file.size > 2000000) {
      setError(
        en[
          "ui_this_file_is_larger_than_2_mb_choose_a_smaller_json_or_csv_expor"
        ],
      );
      return;
    }
    if (!/\.(json|csv)$/i.test(file.name)) {
      setError(
        en["ui_this_file_type_is_not_supported_choose_a_json_or_csv_file"],
      );
      return;
    }
    setWorking(true);
    try {
      const [content] = await Promise.all([
        file.text(),
        new Promise((resolve) => setTimeout(resolve, 300)),
      ]);
      let records = 0;
      let format = "CSV";
      if (file.name.toLowerCase().endsWith(".json")) {
        format = "JSON";
        const parsed: unknown = JSON.parse(content);
        if (Array.isArray(parsed)) records = parsed.length;
        else if (parsed && typeof parsed === "object")
          records = Object.keys(parsed).length;
        else throw new Error("structure");
      } else {
        records = countCsvRecords(content);
      }
      if (!alive.current) return;
      const result = { name: file.name, records, format };
      setSummary(result);
      setSuccess(true);
      onMetadata(result);
    } catch {
      setError(
        en[
          "ui_we_could_not_read_this_file_check_that_it_is_valid_json_or_csv_t"
        ],
      );
    } finally {
      if (alive.current) setWorking(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <Dialog title={en["ui_bring_a_file_into_view"]} onClose={onClose}>
      <p className="dialog-lead">
        {
          en[
            "ui_analysed_on_this_device_only_this_preview_reads_file_structure_n"
          ]
        }
      </p>
      <div className="privacy-proof">
        <LockKeyhole size={20} />
        <span>
          {
            en[
              "ui_only_the_file_summary_stays_in_memory_raw_contents_are_discarded"
            ]
          }
        </span>
      </div>
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        accept=".json,.csv"
        aria-label={en["ui_choose_a_json_or_csv_export"]}
        aria-invalid={!!error}
        aria-describedby="import-rules import-error"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void inspect(f);
        }}
      />
      <div
        className={`drop-zone ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (working) return;
          const file = e.dataTransfer.files[0];
          if (file) void inspect(file);
        }}
      >
        <p id="import-rules">
          {en["ui_drop_one_json_or_csv_export_here_maximum_2_mb"]}
        </p>
        <Button
          kind="secondary"
          className="full"
          loading={working}
          success={success}
          onClick={() => input.current?.click()}
          disabled={working}
        >
          {!working && !success && <FileUp size={20} />}
          {working
            ? en["ui_reading_in_your_browser"]
            : en["ui_choose_json_or_csv"]}
        </Button>
      </div>
      {working && (
        <progress
          className="import-progress"
          aria-label={en["ui_reading_file_locally"]}
        />
      )}
      {working && (
        <div
          className="skeleton-stack"
          role="status"
          aria-label={en["ui_reading_file"]}
        >
          <div />
          <div />
          <div />
        </div>
      )}
      <p
        id="import-error"
        className={error ? "form-error" : "visually-hidden"}
        role="alert"
      >
        {error}
      </p>
      {summary && (
        <div className="file-summary" role="status">
          <Check size={20} />
          <div>
            <strong>{summary.name}</strong>
            <p>
              {summary.records}{" "}
              {summary.format === "JSON"
                ? en["ui_top_level_entries"]
                : en["ui_data_rows"]}
              {en["ui_in_this"]}
              {summary.format}
              {en["ui_file"]}
            </p>
          </div>
        </div>
      )}
      <p className="small muted">
        {
          en[
            "ui_the_workspace_uses_sample_exposure_signals_previewing_a_file_doe"
          ]
        }
      </p>
      <h3>{en["ui_how_to_get_your_export_8"]}</h3>
      <div className="export-guides">
        {mock.exportGuides.map((guide) => (
          <details key={guide.service}>
            <summary>{guide.service}</summary>
            <ol>
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <a href={guide.help} target="_blank" rel="noreferrer">
              {en.export_official_help}
            </a>
          </details>
        ))}
      </div>
      <div className="button-row">
        <Button
          onClick={() => {
            onSample();
            onClose();
          }}
        >
          {en["ui_try_with_sample_data_9"]}
        </Button>
        <Button
          kind="quiet"
          onClick={() => {
            const blob = new Blob(
              [
                JSON.stringify(
                  {
                    items: mock.services.map((s) => ({
                      service: s.name,
                      observed_fields: s.fields,
                    })),
                  },
                  null,
                  2,
                ),
              ],
              { type: "application/json" },
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "digimirror-sample.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={16} />
          {en["ui_download_a_sample_file"]}
        </Button>
      </div>
    </Dialog>
  );
}
export function Delta({ value }: { value: number }) {
  return (
    <span className="delta">
      {value >= 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}{" "}
      {en["ui_sample"]}
      {Math.abs(value)}
      {en["ui_points"]}
      {value >= 0 ? en.ui_lower : en.ui_higher}
      {en["ui_than_last_week"]}
    </span>
  );
}
