import { en, text } from "../i18n/en";
import { relativeTime } from "../data/state";
import { NoData, Term, TrendChart } from "../components/Experience";
import { useAppReducedMotion } from "../components/preferences";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Eye,
  FileSearch,
  FileText,
  Fingerprint,
  HeartHandshake,
  Info,
  Mail,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { WorkspaceData } from "../App";
import { mock, dateLabel } from "../data/mock";
import {
  Button,
  Dialog,
  EmptyState,
  ScoreRing,
  SectionTitle,
} from "../components/UI";
export function PlanScreen({ data }: { data: WorkspaceData }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const reduced = useAppReducedMotion();
  const done = mock.fixes.filter((f) => data.statuses[f.id] === "done").length;
  if (!data.hasData)
    return (
      <>
        <div className="page-title">
          <h1>{en["workspacescreens_a_plan_that_starts_small"]}</h1>
          <p>
            {
              en[
                "workspacescreens_prioritise_changes_you_can_understand_and_choose"
              ]
            }
          </p>
        </div>
        <EmptyState
          title={en["workspacescreens_find_your_first_useful_change"]}
          description={
            en[
              "workspacescreens_load_the_sample_to_explore_four_actions_their_impact_and_the_set"
            ]
          }
          onSample={data.loadSample}
          onGuide={data.showImport}
        />
      </>
    );
  const ordered = [...mock.fixes].sort(
    (a, b) =>
      Number(data.statuses[a.id] === "later") -
      Number(data.statuses[b.id] === "later"),
  );
  return (
    <>
      <div className="page-title">
        <h1>{en["workspacescreens_one_change_at_a_time"]}</h1>
        <p>
          {
            en[
              "workspacescreens_start_with_the_biggest_impact_choose_what_feels_right_for_you"
            ]
          }
        </p>
      </div>
      <section className="plan-progress">
        <div>
          <h2>
            {done}
            {en["workspacescreens_of"]}
            {mock.fixes.length}
            {en["workspacescreens_done"]}
          </h2>
          <p>
            {en["workspacescreens_sample_score"]}{" "}
            <strong>
              {data.score} →{" "}
              {mock.baseScore - mock.fixes.reduce((n, f) => n + f.impact, 0)}
              {en["workspacescreens_if_you_finish_all"]}
              {mock.fixes.filter((f) => data.statuses[f.id] !== "done").length}
              {en["workspacescreens_remaining_actions"]}
            </strong>
          </p>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={en["workspacescreens_privacy_plan_completion"]}
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={4}
        >
          {mock.fixes.map((f) => (
            <span
              key={f.id}
              className={data.statuses[f.id] === "done" ? "filled" : ""}
            />
          ))}
        </div>
        <span>
          {done === 4
            ? en["workspacescreens_your_sample_plan_is_complete"]
            : text(
                "workspacescreens_small_remaining",
                4 - done,
                4 - done === 1 ? "step" : "steps",
              )}
        </span>
      </section>
      <Button kind="quiet" onClick={() => data.showEvidence()}>
        {en.experience_see_the_evidence}
      </Button>
      <div className="plan-note">
        <Info size={20} />
        <p>
          {
            en[
              "workspacescreens_these_actions_update_your_sample_reflection_you_make_real_settin"
            ]
          }
        </p>
      </div>
      <section
        className="fix-list"
        aria-label={en["workspacescreens_ordered_privacy_actions"]}
      >
        {ordered.map((fix, index) => {
          const status = data.statuses[fix.id] || "open";
          const open = expanded === fix.id && status !== "done";
          return (
            <motion.article
              layout={!reduced}
              key={fix.id}
              className={`fix-row ${status}`}
              data-fix-id={fix.id}
              transition={{ duration: 0.2 }}
            >
              <div className="fix-row-main">
                <span className="fix-index">
                  {status === "done" ? <Check size={20} /> : index + 1}
                </span>
                <div className="fix-row-content">
                  <div className="fix-title">
                    <h2>{fix.title}</h2>
                    <span className="impact-chip">
                      {en["app_sample"]}
                      {fix.impact}
                      {en["app_points"]}
                    </span>
                  </div>
                  <p>
                    {fix.service}
                    <Clock3 size={16} />
                    {fix.minutes}
                    {en["workspacescreens_minutes"]}
                    {status === "later" && (
                      <span className="later-label">
                        {en["workspacescreens_saved_for_later"]}
                      </span>
                    )}
                  </p>
                </div>
                {status === "done" ? (
                  <Button kind="quiet" onClick={() => data.setFix(fix, "open")}>
                    <RotateCcw size={16} />
                    {en["workspacescreens_reopen"]}
                  </Button>
                ) : (
                  <Button
                    kind={index === 0 ? "primary" : "secondary"}
                    onClick={() => data.startFix(fix)}
                  >
                    {fix.title}
                  </Button>
                )}
              </div>
              {status === "done" ? (
                <div className="completed-note">
                  <Check size={16} />
                  {en["workspacescreens_marked_done_in_your_sample_plan"]}
                </div>
              ) : (
                <>
                  <div className="row-actions button-row">
                    <Button
                      kind="quiet"
                      onClick={() => data.setFix(fix, "later")}
                    >
                      {en["workspacescreens_not_now"]}
                    </Button>
                    <Button
                      kind="secondary"
                      onClick={() => data.setFix(fix, "done")}
                    >
                      {en["workspacescreens_mark_done"]}
                    </Button>
                  </div>
                  <button
                    className="expand-fix"
                    aria-expanded={open}
                    aria-controls={`fix-preview-${fix.id}`}
                    onClick={() => setExpanded(open ? null : fix.id)}
                  >
                    {en["workspacescreens_what_this_will_do"]}{" "}
                    <ChevronDown size={20} className={open ? "rotated" : ""} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        id={`fix-preview-${fix.id}`}
                        initial={{ height: reduced ? "auto" : 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: reduced ? "auto" : 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fix-preview"
                      >
                        <p>{fix.description}</p>
                        <div className="button-row">
                          <Button
                            kind="quiet"
                            onClick={() => data.setFix(fix, "later")}
                          >
                            {en["workspacescreens_not_now_10"]}
                          </Button>
                          <Button
                            kind="secondary"
                            onClick={() => data.setFix(fix, "done")}
                          >
                            <Check size={16} />
                            {en["workspacescreens_mark_done_11"]}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.article>
          );
        })}
      </section>
    </>
  );
}
export function HistoryScreen({ data }: { data: WorkspaceData }) {
  return (
    <>
      <div className="page-title">
        <h1>{en["workspacescreens_your_progress_in_perspective"]}</h1>
        <p>
          {
            en[
              "workspacescreens_a_record_of_what_you_chose_and_how_your_sample_reflection_change"
            ]
          }
        </p>
      </div>
      {!data.activity.length ? (
        <EmptyState
          title={en["workspacescreens_your_first_step_will_start_a_story"]}
          description={
            en[
              "workspacescreens_load_sample_data_then_mark_a_privacy_action_done_to_see_its_impa"
            ]
          }
          onSample={data.loadSample}
          onGuide={data.showImport}
        />
      ) : (
        <>
          <section className="history-summary">
            <div>
              <h2>
                {mock.previousScore - data.score}
                {en["workspacescreens_points_lower_than_last_week"]}
              </h2>
              <p>
                {en["workspacescreens_from"]}
                {mock.previousScore}
                {en["workspacescreens_to"]}
                {data.score}
                {en["workspacescreens_in_this_sample_lower_is_better"]}
              </p>
            </div>
            <span className="risk-label high">
              {en["workspacescreens_sample_comparison"]}
            </span>
          </section>
          <TrendChart data={data} />
          <Button kind="quiet" onClick={() => data.showEvidence()}>
            {en.experience_see_the_evidence}
          </Button>
          <SectionTitle
            title={en["workspacescreens_your_activity"]}
            description={
              en[
                "workspacescreens_actions_stay_in_this_browser_session_until_you_clear_your_data_o"
              ]
            }
          />
          <ol className="activity-list">
            {data.activity.map((item, index) => (
              <li key={item.id}>
                <span className="activity-icon">
                  {index === data.activity.length - 1 ? (
                    <Fingerprint size={20} />
                  ) : (
                    <Check size={20} />
                  )}
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                  <time dateTime={item.at}>{relativeTime(item.at)}</time>
                </div>
                <span className="activity-score">
                  <small>{en["ui_sample"]}</small>
                  {item.score}
                  <small>/100</small>
                </span>
              </li>
            ))}
          </ol>
          <div className="quiet-callout">
            <ShieldCheck size={20} />
            <p>
              {
                en[
                  "workspacescreens_progress_is_about_your_choices_a_sample_score_change_does_not_ve"
                ]
              }
            </p>
          </div>
        </>
      )}
    </>
  );
}
const labIcons = {
  mail: Mail,
  file: FileText,
  scan: ScanLine,
  sliders: SlidersHorizontal,
  eye: Eye,
  family: HeartHandshake,
};
export function LabScreen({ data }: { data: WorkspaceData }) {
  const [tool, setTool] = useState<string | null>(null);
  const [simulation, setSimulation] = useState(false);
  const [perspective, setPerspective] = useState<string>(
    en["workspacescreens_a_stranger"],
  );
  const [family, setFamily] = useState<number[]>([]);
  const [marker, setMarker] = useState(false);
  return (
    <>
      <div className="page-title">
        <h1>{en["workspacescreens_a_little_room_to_explore"]}</h1>
        <p>
          {
            en[
              "workspacescreens_look_at_your_privacy_from_a_different_angle_try_an_idea_before_a"
            ]
          }
        </p>
      </div>
      <div className="lab-context">
        <p>
          {
            en[
              "workspacescreens_these_explorations_use_sample_observations_nothing_changes_in_yo"
            ]
          }
        </p>
      </div>
      {!data.hasData && (
        <NoData
          data={data}
          title={en["workspacescreens_choose_a_sample_to_explore"]}
        />
      )}
      {mock.labGroups.map((group) => (
        <section key={group.name} className="lab-group">
          <SectionTitle title={group.name} description={group.description} />
          <div className="lab-tools">
            {group.tools.map((item) => {
              const Icon = labIcons[item.icon as keyof typeof labIcons];
              return (
                <button
                  key={item.id}
                  className="lab-tool"
                  onClick={() => {
                    if (item.id === "document") data.showImport();
                    else setTool(item.id);
                  }}
                >
                  <span className="tool-icon">
                    <Icon size={24} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </span>
                  <ArrowRight size={20} />
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="glossary">
        <Term term="tracker">{en["workspacescreens_tracker_12"]}</Term>
        <Term term="sharing">{en["workspacescreens_third_party_sharing"]}</Term>
      </p>
      <details className="advanced-tools">
        <summary>
          {en["workspacescreens_advanced"]}
          <ChevronDown size={20} />
        </summary>
        <p>
          {
            en[
              "workspacescreens_for_a_closer_look_at_the_evidence_and_its_limits"
            ]
          }
        </p>
        <div className="advanced-links">
          {mock.advancedTools.map((item) => (
            <button key={item.id} onClick={() => setTool(item.id)}>
              <ScanLine size={20} />
              <span>{item.title}</span>
            </button>
          ))}
          <button onClick={() => setTool("coverage")}>
            <FileSearch size={20} />
            {en["workspacescreens_inspect_export_coverage"]}
          </button>
          <button onClick={() => setTool("limits")}>
            <Info size={20} />
            {en["workspacescreens_understand_score_limitations"]}
          </button>
          <button onClick={() => data.navigate("trust")}>
            <Download size={20} />
            {en["workspacescreens_export_my_reflection"]}
          </button>
        </div>
      </details>
      {tool && (
        <Dialog
          title={
            mock.advancedTools.find((item) => item.id === tool)?.title ||
            (tool === "canary"
              ? en["workspacescreens_track_who_leaks_your_email"]
              : tool === "simulate"
                ? en["workspacescreens_preview_a_privacy_change"]
                : tool === "perspective"
                  ? en["workspacescreens_see_another_perspective"]
                  : tool === "family"
                    ? en["workspacescreens_review_a_family_checklist"]
                    : tool === "limits"
                      ? en["workspacescreens_what_a_score_can_tell_you"]
                      : en["workspacescreens_check_what_an_export_includes"])
          }
          onClose={() => setTool(null)}
        >
          {tool === "sensitive" ? (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_a_redacted_example_of_the_kinds_of_details_worth_reviewing_in_a_"
                  ]
                }
              </p>
              <div className="coverage-list">
                <div>
                  <FileText size={20} />
                  <span>{en["workspacescreens_contact_details"]}</span>
                  <span>{en["workspacescreens_sample_signal"]}</span>
                </div>
                <div>
                  <FileText size={20} />
                  <span>{en["workspacescreens_location_metadata"]}</span>
                  <span>{en["workspacescreens_sample_signal"]}</span>
                </div>
              </div>
              <p className="evidence-limit">
                {
                  en[
                    "workspacescreens_no_file_has_been_scanned_for_sensitive_contents_the_local_file_p"
                  ]
                }
              </p>
              <Button
                kind="secondary"
                onClick={() => {
                  setTool(null);
                  data.showImport();
                }}
              >
                {en["workspacescreens_preview_a_file_locally"]}
              </Button>
            </>
          ) : tool === "public" ? (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_explore_the_public_visibility_signals_in_your_sample_reflection_"
                  ]
                }
              </p>
              <ul className="evidence-list">
                {mock.services[0].evidence.map((evidence) => (
                  <li key={evidence}>
                    <Eye size={20} />
                    {evidence}
                  </li>
                ))}
              </ul>
              <div className="button-row">
                <Button
                  onClick={() => {
                    setTool(null);
                    data.navigate("map");
                  }}
                >
                  {en["workspacescreens_review_the_sample_map"]}
                </Button>
              </div>
            </>
          ) : tool === "optout" ? (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_some_browsers_let_you_express_a_preference_to_limit_data_sharing"
                  ]
                }
              </p>
              <div className="evidence-limit">
                {
                  en[
                    "workspacescreens_this_example_does_not_check_a_website_or_change_your_browser_set"
                  ]
                }
              </div>
              <Button
                kind="secondary"
                onClick={() => {
                  setTool(null);
                  data.navigate("trust");
                }}
              >
                {en["workspacescreens_review_my_privacy_controls"]}
              </Button>
            </>
          ) : tool === "habit" ? (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_a_useful_habit_starts_with_one_considered_action"
                  ]
                }
              </p>
              <div className="plan-progress">
                <h2>
                  {
                    mock.fixes.filter((fix) => data.statuses[fix.id] === "done")
                      .length
                  }{" "}
                  {en["workspacescreens_of_4_actions_reviewed"]}
                </h2>
                <p>
                  {
                    en[
                      "workspacescreens_mark_a_sample_fix_done_to_record_progress_there_is_no_perfect_sc"
                    ]
                  }
                </p>
              </div>
              <div className="button-row">
                <Button
                  onClick={() => {
                    setTool(null);
                    data.navigate("plan");
                  }}
                >
                  {en["workspacescreens_choose_my_next_action"]}
                </Button>
              </div>
            </>
          ) : tool === "simulate" ? (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_try_hiding_your_phone_number_in_the_sample_this_does_not_apply_t"
                  ]
                }
              </p>
              <Button
                kind="quiet"
                onClick={() => {
                  setTool(null);
                  data.showEvidence();
                }}
              >
                {en.experience_see_the_evidence}
              </Button>
              <div className="simulation">
                <ScoreRing
                  score={
                    data.hasData
                      ? data.score -
                        (simulation && data.statuses.phone !== "done" ? 7 : 0)
                      : mock.baseScore - (simulation ? 7 : 0)
                  }
                  small
                />
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={simulation}
                    onChange={(e) => setSimulation(e.target.checked)}
                  />
                  <span>{en["workspacescreens_hide_my_phone_number"]}</span>
                </label>
                <p>
                  {simulation
                    ? en[
                        "workspacescreens_a_7_point_reduction_is_shown_in_the_sample"
                      ]
                    : en[
                        "workspacescreens_your_current_sample_exposure_before_this_change"
                      ]}
                </p>
              </div>
              <Button
                onClick={() => {
                  data.navigate("plan");
                  setTool(null);
                }}
              >
                {en["workspacescreens_review_this_in_my_plan"]}
              </Button>
            </>
          ) : tool === "perspective" ? (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_explore_what_someone_could_infer_from_the_sample_s_visible_signa"
                  ]
                }
              </p>
              <label className="field-label">
                {en["workspacescreens_perspective"]}
                <select
                  value={perspective}
                  onChange={(e) => setPerspective(e.target.value)}
                >
                  <option>{en["workspacescreens_a_stranger"]}</option>
                  <option>{en["workspacescreens_an_advertiser"]}</option>
                  <option>{en["workspacescreens_someone_you_know"]}</option>
                </select>
              </label>
              <div className="evidence-limit">
                {perspective === en["workspacescreens_a_stranger"]
                  ? en[
                      "workspacescreens_a_public_phone_number_can_help_connect_a_profile_to_a_person"
                    ]
                  : perspective === en["workspacescreens_an_advertiser"]
                    ? en[
                        "workspacescreens_activity_and_location_signals_can_suggest_interests_and_routines"
                      ]
                    : en[
                        "workspacescreens_profile_visibility_and_contact_discovery_can_reveal_which_accoun"
                      ]}
              </div>
              <p className="small muted">
                {
                  en[
                    "workspacescreens_this_explains_possible_inferences_it_is_not_evidence_that_anyone"
                  ]
                }
              </p>
            </>
          ) : tool === "family" ? (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_a_conversation_not_a_way_to_monitor_someone_each_person_keeps_co"
                  ]
                }
              </p>
              <div className="guided-steps">
                {mock.familyChecklist.map((item, index) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={family.includes(index)}
                      onChange={() =>
                        setFamily((list) =>
                          list.includes(index)
                            ? list.filter((n) => n !== index)
                            : [...list, index],
                        )
                      }
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              <p className="small muted">
                {family.length}
                {en["workspacescreens_of"]}
                {mock.familyChecklist.length}
                {en["workspacescreens_conversation_steps_reviewed"]}
              </p>
            </>
          ) : tool === "canary" ? (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_a_different_email_marker_for_each_service_can_help_you_recognise"
                  ]
                }
              </p>
              <div className="marker-example">
                <Mail size={24} />
                <strong>
                  {en["workspacescreens_one_service_one_recognisable_marker"]}
                </strong>
                <p>
                  {
                    en[
                      "workspacescreens_no_email_address_is_created_or_sent_here"
                    ]
                  }
                </p>
              </div>
              <Button onClick={() => setMarker(!marker)}>
                {marker
                  ? en["workspacescreens_hide_the_example"]
                  : en["workspacescreens_show_a_sample_trail"]}
              </Button>
              {marker && (
                <div className="sample-trail" role="status">
                  <span>
                    {en["workspacescreens_marker_assigned_to_social_profile"]}
                  </span>
                  <ArrowRight size={20} />
                  <span>
                    {
                      en[
                        "workspacescreens_same_marker_observed_in_another_sample_export"
                      ]
                    }
                  </span>
                  <p>
                    {
                      en[
                        "workspacescreens_this_sample_shows_a_possible_trail_it_does_not_establish_a_real_"
                      ]
                    }
                  </p>
                </div>
              )}
            </>
          ) : tool === "limits" ? (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_a_score_is_a_starting_point_for_a_decision_not_a_verdict_about_y"
                  ]
                }
              </p>
              <ul className="check-list">
                <li>
                  <Info size={20} />
                  {
                    en[
                      "workspacescreens_only_signals_in_the_available_evidence_can_be_considered"
                    ]
                  }
                </li>
                <li>
                  <Info size={20} />
                  {
                    en[
                      "workspacescreens_a_lower_score_does_not_rule_out_every_risk"
                    ]
                  }
                </li>
                <li>
                  <Info size={20} />
                  {
                    en[
                      "workspacescreens_marking_a_sample_fix_done_does_not_change_a_real_account"
                    ]
                  }
                </li>
              </ul>
            </>
          ) : (
            <>
              <p className="dialog-lead">
                {
                  en[
                    "workspacescreens_an_export_is_one_view_of_one_service_missing_information_does_no"
                  ]
                }
              </p>
              <div className="coverage-list">
                {mock.categories.map((c) => (
                  <div key={c.id}>
                    <Check size={20} />
                    <span>{c.name}</span>
                    <span>{en["workspacescreens_sample_coverage"]}</span>
                  </div>
                ))}
              </div>
              <div className="evidence-limit">
                {
                  en[
                    "workspacescreens_this_sample_does_not_include_private_message_contents_or_service"
                  ]
                }
              </div>
              <Button
                kind="secondary"
                onClick={() => {
                  setTool(null);
                  data.showImport();
                }}
              >
                {en["workspacescreens_preview_an_export"]}
              </Button>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}
export function TrustScreen({ data }: { data: WorkspaceData }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <>
      <div className="page-title">
        <h1>{en["workspacescreens_nothing_hidden_from_you"]}</h1>
        <p>
          {
            en[
              "workspacescreens_understand_what_stays_here_what_never_leaves_your_browser_and_wh"
            ]
          }
        </p>
      </div>
      <div className="trust-explanations">
        <section>
          <h2>{en["workspacescreens_what_we_store"]}</h2>
          <p>
            {
              en[
                "workspacescreens_your_sample_plan_score_changes_and_activity_a_selected_file_s_na"
              ]
            }
          </p>
          <span className="small muted">
            {
              en[
                "workspacescreens_stored_in_this_browser_session_clear_data_to_remove_it_or_close_"
              ]
            }
          </span>
        </section>
        <section>
          <h2>{en["workspacescreens_what_we_never_do"]}</h2>
          <p>
            {
              en[
                "workspacescreens_your_raw_files_file_contents_account_passwords_and_contact_lists"
              ]
            }
          </p>
          <span className="small muted">
            {en["workspacescreens_file_previews_are_processed_in_this_browser"]}
          </span>
        </section>
      </div>
      <section className="trust-ledger">
        <SectionTitle
          title={en["workspacescreens_your_choices_recorded_clearly"]}
          description={
            en["workspacescreens_a_record_of_actions_you_took_in_this_view"]
          }
        />
        <div className="ledger-row">
          <ShieldCheck size={20} />
          <div>
            <strong>
              {en["ui_sample_data"]}
              {data.hasData
                ? en["workspacescreens_is_in_use"]
                : en["workspacescreens_was_cleared"]}
            </strong>
            <p>
              {data.hasData
                ? en[
                    "workspacescreens_you_can_explore_without_connecting_an_account"
                  ]
                : en[
                    "workspacescreens_no_reflection_is_loaded_you_can_start_again_at_any_time"
                  ]}
            </p>
          </div>
          <span>{dateLabel()}</span>
        </div>
        <div className="ledger-row">
          <FileText size={20} />
          <div>
            <strong>
              {data.fileSummary
                ? en["workspacescreens_file_preview_allowed"]
                : en["workspacescreens_no_file_has_been_selected"]}
            </strong>
            <p>
              {data.fileSummary
                ? text(
                    "workspacescreens_file_with_entries_only_its_summary_is_kept",
                    data.fileSummary.format,
                    data.fileSummary.records,
                  )
                : en[
                    "workspacescreens_choosing_a_file_gives_this_page_access_to_that_file_only_nothing"
                  ]}
            </p>
          </div>
          {data.fileSummary ? (
            <Button kind="quiet" onClick={data.clearFile}>
              {en["workspacescreens_clear_summary"]}
            </Button>
          ) : (
            <span>{en["workspacescreens_waiting_for_your_choice"]}</span>
          )}
        </div>
        <div className="ledger-row">
          <Eye size={20} />
          <div>
            <strong>{en["workspacescreens_no_background_monitoring"]}</strong>
            <p>
              {
                en[
                  "workspacescreens_this_view_does_not_check_your_services_or_read_files_in_the_back"
                ]
              }
            </p>
          </div>
          <span>{en["workspacescreens_always_in_your_control"]}</span>
        </div>
      </section>
      <p>
        <Term term="reflection">{en.term_reflection_label}</Term>
      </p>
      <h2 className="controls-heading">
        {en["workspacescreens_your_controls"]}
      </h2>
      <section className="data-actions">
        <div>
          <h2>{en["workspacescreens_keep_a_copy"]}</h2>
          <p>
            {
              en[
                "workspacescreens_download_your_sample_plan_and_action_history_raw_file_contents_a"
              ]
            }
          </p>
        </div>
        <div className="button-row">
          <Button kind="quiet" onClick={() => window.print()}>
            {en["workspacescreens_print_my_reflection"]}
          </Button>
          <Button kind="secondary" onClick={data.exportData}>
            <Download size={20} />
            {en["workspacescreens_export_my_reflection"]}
          </Button>
        </div>
      </section>
      <section className="data-actions danger-zone">
        <div>
          <h2>{en["workspacescreens_clear_this_reflection"]}</h2>
          <p>
            {
              en[
                "workspacescreens_remove_the_sample_score_plan_action_history_and_any_file_summary"
              ]
            }
          </p>
        </div>
        <Button kind="danger" onClick={() => setDeleting(true)}>
          <Trash2 size={20} />
          {en["workspacescreens_delete_my_reflection"]}
        </Button>
      </section>
      {!data.hasData && (
        <EmptyState
          title={en["workspacescreens_a_fresh_start_is_yours"]}
          description={
            en[
              "workspacescreens_your_sample_data_is_cleared_you_can_reload_the_sample_or_learn_h"
            ]
          }
          onSample={data.loadSample}
          onGuide={data.showImport}
        />
      )}
      <p className="trust-preferences">
        {
          en[
            "workspacescreens_your_theme_preference_is_saved_on_this_device_the_welcome_screen"
          ]
        }
      </p>
      {deleting && (
        <Dialog
          title={en["workspacescreens_delete_this_reflection"]}
          onClose={() => setDeleting(false)}
        >
          <p className="dialog-lead">
            {
              en[
                "workspacescreens_this_removes_the_sample_score_completed_and_deferred_actions_act"
              ]
            }
          </p>
          <p>
            {
              en[
                "workspacescreens_you_can_load_sample_data_again_whenever_you_want"
              ]
            }
          </p>
          <div className="button-row">
            <Button
              kind="danger"
              onClick={() => {
                data.clearData();
                setDeleting(false);
              }}
            >
              {en["workspacescreens_delete_my_reflection"]}
            </Button>
            <Button kind="secondary" onClick={() => setDeleting(false)}>
              {en["workspacescreens_keep_my_reflection"]}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
