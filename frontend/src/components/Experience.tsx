import { en, text } from "../i18n/en";
import { Component, type ReactNode, useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Check, Info, WifiOff } from "lucide-react";
import { Button, Dialog, EmptyState } from "./UI";
import { mock, servicesFor, type Fix } from "../data/mock";
import { relativeTime } from "../data/state";
import type { WorkspaceData } from "../App";
export function Skeleton() {
  return (
    <div
      className="page-skeleton"
      role="status"
      aria-label={en["experience_loading_this_screen"]}
    >
      <div />
      <div />
      <div />
      <span>{en["experience_preparing_this_view"]}</span>
    </div>
  );
}
export class ScreenBoundary extends Component<
  {
    children: ReactNode;
    onReset: () => void;
  },
  {
    failed: boolean;
  }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section className="empty-state" role="alert">
        <AlertCircle size={24} />
        <h1>{en["experience_this_view_could_not_open"]}</h1>
        <p>
          {
            en[
              "experience_try_opening_it_again_your_saved_sample_choices_remain_in_this_br"
            ]
          }
        </p>
        <Button
          onClick={() => {
            this.setState({ failed: false });
            this.props.onReset();
          }}
        >
          {en["experience_try_this_view_again"]}
        </Button>
        <a className="button quiet" href="#app/overview">
          {en["experience_back_to_overview"]}
        </a>
      </section>
    ) : (
      this.props.children
    );
  }
}
export function Connectivity() {
  const [online, setOnline] = useState(navigator.onLine);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & {
          effectiveType?: string;
        };
      }
    ).connection;
    const speed = () =>
      setSlow(["slow-2g", "2g"].includes(connection?.effectiveType || ""));
    speed();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    connection?.addEventListener("change", speed);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection?.removeEventListener("change", speed);
    };
  }, []);
  return !online || slow ? (
    <div className="connectivity-banner" role="status">
      <WifiOff size={20} />
      <span>
        {!online
          ? en[
              "experience_you_are_offline_already_opened_sample_screens_still_work_new_scr"
            ]
          : en[
              "experience_your_connection_is_slow_local_sample_data_remains_available_whil"
            ]}
      </span>
    </div>
  ) : null;
}
const definitions = {
  reflection: en.term_reflection,
  exposure:
    en[
      "experience_personal_details_that_a_service_or_another_person_could_see_or_u"
    ],
  tracker:
    en[
      "experience_a_tool_that_records_activity_such_as_pages_visited_to_build_a_pi"
    ],
  sharing:
    en[
      "experience_when_one_service_makes_your_information_available_to_another_org"
    ],
};
export function Term({
  term,
  children,
}: {
  term: keyof typeof definitions;
  children: ReactNode;
}) {
  return (
    <span className="term-wrap">
      <button
        type="button"
        className="term"
        aria-describedby={`definition-${term}`}
      >
        {children}
        <Info size={16} />
      </button>
      <span role="tooltip" id={`definition-${term}`} className="term-tooltip">
        {definitions[term]}
      </span>
    </span>
  );
}
export function Onboarding({
  onClose,
  onSample,
  onImport,
}: {
  onClose: () => void;
  onSample: () => void;
  onImport: () => void;
}) {
  const [step, setStep] = useState(0);
  return (
    <Dialog
      title={
        [
          en["experience_a_clearer_view_of_your_privacy"],
          en["experience_your_files_stay_on_this_device"],
          en["experience_choose_where_to_begin"],
        ][step]
      }
      onClose={onClose}
    >
      <p className="small muted">
        {en["experience_step"]}
        {step + 1}
        {en["experience_of_3"]}
      </p>
      <p className="dialog-lead">
        {
          [
            en[
              "experience_digimirror_brings_sample_privacy_observations_into_one_view_and_"
            ],
            en[
              "experience_file_contents_are_read_locally_and_discarded_your_sample_plan_an"
            ],
            en[
              "experience_explore_the_illustrative_sample_or_preview_the_structure_of_your"
            ],
          ][step]
        }
      </p>
      <div className="button-row">
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)}>
            {en["experience_continue"]}
            <ArrowRight size={20} />
          </Button>
        ) : (
          <>
            <Button
              onClick={() => {
                onSample();
                onClose();
              }}
            >
              {en["ui_try_with_sample_data"]}
            </Button>
            <Button
              kind="secondary"
              onClick={() => {
                onClose();
                onImport();
              }}
            >
              {en["ui_preview_my_export"]}
            </Button>
          </>
        )}
        <Button kind="quiet" onClick={onClose}>
          {en["experience_skip_introduction"]}
        </Button>
      </div>
    </Dialog>
  );
}
export function EvidenceDrawer({
  serviceId,
  data,
  onClose,
}: {
  serviceId: string;
  data: WorkspaceData;
  onClose: () => void;
}) {
  const services = (
    serviceId === "baseline" ? mock.services : servicesFor(data.statuses)
  ).filter(
    (s) =>
      serviceId === "all" || serviceId === "baseline" || s.id === serviceId,
  );
  return (
    <Dialog title={en["experience_see_the_evidence"]} onClose={onClose} wide>
      <div className="drawer-content">
        <p className="dialog-lead">
          {
            en[
              "experience_illustrative_observations_from_the_sample_no_accounts_have_been_"
            ]
          }
        </p>
        {services.map((s) => (
          <section className="evidence-section" key={s.id}>
            <h3>
              {s.name}
              {en["experience_sample"]}
              {s.score}/100
            </h3>
            {s.evidence.map((e) => (
              <p className="evidence-observation" key={e}>
                <Check size={20} />
                {e}
              </p>
            ))}
            <h4>{en["experience_why_this_matters"]}</h4>
            <p>
              {s.why}
              {
                en[
                  "experience_review_the_related_privacy_setting_and_choose_who_should_have_ac"
                ]
              }
            </p>
          </section>
        ))}
        <p className="evidence-limit">
          {
            en[
              "experience_the_sample_score_organises_these_observations_it_cannot_establis"
            ]
          }
        </p>
      </div>
    </Dialog>
  );
}
export function WhatChanged({
  fix,
  before,
  after,
  next,
  onClose,
  onNext,
  onUndo,
}: {
  fix: Fix;
  before: number;
  after: number;
  next?: Fix;
  onClose: () => void;
  onNext: (f: Fix) => void;
  onUndo?: () => void;
}) {
  return (
    <Dialog title={en["experience_what_changed"]} onClose={onClose}>
      <p className="section-marker">{en["experience_sample_progress"]}</p>
      <p className="changed-score">
        {before} <ArrowRight size={24} /> {after}
      </p>
      <h3>{fix.title}</h3>
      <h3>{en.changed_data_title}</h3>
      <p>{mock.changedData[fix.id]}</p>
      <p>{fix.description}</p>
      <p className="evidence-limit">
        {
          en[
            "experience_this_records_your_choice_in_the_sample_only_it_does_not_verify_o"
          ]
        }
        {fix.service}.
      </p>
      <div className="button-row">
        {next ? (
          <Button
            onClick={() => {
              onClose();
              onNext(next);
            }}
          >
            {next.title}
          </Button>
        ) : (
          <Button onClick={onClose}>
            {en["experience_review_completed_plan"]}
          </Button>
        )}
        {onUndo && (
          <Button kind="secondary" onClick={onUndo}>
            {en.app_undo}
          </Button>
        )}
        <Button kind="quiet" onClick={onClose}>
          {en["experience_close_summary"]}
        </Button>
      </div>
    </Dialog>
  );
}
export function Notifications({
  read,
  onRead,
  onClose,
}: {
  read: string[];
  onRead: (ids: string[]) => void;
  onClose: () => void;
}) {
  const items = mock.notifications.map((item) => ({
    ...item,
    at: new Date(Date.now() - item.daysAgo * 86400000).toISOString(),
  }));
  return (
    <Dialog title={en["experience_notifications"]} onClose={onClose}>
      <p className="small muted">
        {en["experience_sample_items_no_live_monitoring"]}
      </p>
      <Button kind="quiet" onClick={() => onRead(items.map((i) => i.id))}>
        {en["experience_mark_all_read"]}
      </Button>
      <div className="notification-list">
        {items.map((i) => (
          <button
            key={i.id}
            onClick={() => onRead([...new Set([...read, i.id])])}
          >
            <strong>{i.title}</strong>
            <span>{i.detail}</span>
            <small>
              {relativeTime(i.at)} ·{" "}
              {read.includes(i.id)
                ? en["experience_read"]
                : en["experience_unread"]}
            </small>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
export function MissingPage({ onHome }: { onHome: () => void }) {
  return (
    <section className="empty-state">
      <h1>{en["app_page_not_found"]}</h1>
      <p>
        {
          en[
            "experience_this_address_does_not_match_a_digimirror_screen_return_to_your_o"
          ]
        }
      </p>
      <Button onClick={onHome}>{en["experience_back_to_overview"]}</Button>
    </section>
  );
}
export function NoData({
  data,
  title,
}: {
  data: WorkspaceData;
  title: string;
}) {
  return (
    <EmptyState
      title={title}
      description={
        en[
          "experience_try_the_sample_or_learn_how_to_download_an_export_nothing_is_con"
        ]
      }
      onSample={data.loadSample}
      onGuide={data.showImport}
    />
  );
}
export function TrendChart({ data }: { data: WorkspaceData }) {
  const values = [
    ...mock.weeklyTrend,
    ...data.activity
      .filter((a) => a.id !== "sample-baseline" && a.action === "done")
      .slice()
      .reverse()
      .map((a) => a.score),
  ];
  return (
    <section
      className="trend-chart"
      aria-label={text(
        "experience_sample_weekly_exposure_trend_lower_is_better",
        values.join(", "),
      )}
    >
      <div className="section-title">
        <h2>{en["experience_sample_weekly_trend"]}</h2>
        <span>{en["experience_lower_is_better"]}</span>
      </div>
      <div className="trend-plot">
        <svg
          viewBox="0 0 640 136"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path className="trend-baseline" d="M20 110H620" />
          <polyline
            points={values
              .map(
                (v, i) =>
                  `${20 + (i * 600) / Math.max(1, values.length - 1)},${110 - (v - 35) * 1.8}`,
              )
              .join(" ")}
          />
        </svg>
        {values.map((v, i) => (
          <button
            key={i}
            className="trend-dot"
            style={{
              left: `${3.125 + (i * 93.75) / Math.max(1, values.length - 1)}%`,
              top: `${((110 - (v - 35) * 1.8) / 136) * 100}%`,
            }}
            aria-label={text(
              "experience_sample_out_of_100",
              i < 4
                ? text("experience_weeks_ago", 3 - i)
                : en["experience_completed_action"],
              v,
            )}
          >
            <span role="tooltip">
              {en["ui_sample"]}
              {v}/100 ·{" "}
              {i < 3
                ? text("experience_weeks_ago", 3 - i)
                : i === 3
                  ? en["experience_this_week"]
                  : en["experience_action_completed"]}
            </span>
          </button>
        ))}
      </div>
      <p className="small muted">
        {
          en[
            "experience_sample_79_72_across_weekly_examples_completed_actions_append_to_"
          ]
        }
      </p>
    </section>
  );
}
