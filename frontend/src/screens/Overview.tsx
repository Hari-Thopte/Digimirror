import { en, text } from "../i18n/en";
import { useAppReducedMotion } from "../components/preferences";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Fingerprint,
  LockKeyhole,
  MapPin,
} from "lucide-react";
import type { WorkspaceData } from "../App";
import { categoryTone } from "../data/state";
import { Term } from "../components/Experience";
import { mock, dateLabel, riskFor, servicesFor } from "../data/mock";
import {
  Button,
  Delta,
  EmptyState,
  ScoreRing,
  SectionTitle,
} from "../components/UI";
export default function Overview({ data }: { data: WorkspaceData }) {
  const reduced = useAppReducedMotion();
  const [animateIntro] = useState(() => {
    try {
      return !sessionStorage.getItem("dm-studio-score");
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem("dm-studio-score", "seen");
    } catch {
      /* Animation still works without storage. */
    }
  }, []);
  const risk = riskFor(data.score);
  const next = mock.fixes.find(
    (f) => data.statuses[f.id] !== "done" && data.statuses[f.id] !== "later",
  );
  const remaining = mock.fixes.some((f) => data.statuses[f.id] !== "done");
  const iconList = [Fingerprint, Activity, MapPin, LockKeyhole];
  if (!data.hasData)
    return (
      <>
        <div className="page-title">
          <h1>{en["overview_your_reflection_starts_here"]}</h1>
          <p>{en["overview_a_little_context_makes_the_next_step_easier"]}</p>
        </div>
        <EmptyState
          title={en["overview_bring_your_digital_life_into_view"]}
          description={
            en[
              "overview_explore_a_sample_reflection_or_preview_an_export_to_see_what_it_"
            ]
          }
          onSample={data.loadSample}
          onGuide={data.showImport}
        />
      </>
    );
  return (
    <>
      <div className="page-title">
        <p className="date-label">{dateLabel()}</p>
        <h1>
          {en["overview_a_clearer_picture"]}
          {mock.user.name}.
        </h1>
        <p>{en["overview_here_s_what_deserves_your_attention_today"]}</p>
      </div>
      <div className="overview-top">
        <section
          className={`score-hero ${risk.tone}`}
          aria-labelledby="exposure-title"
        >
          <div className="score-hero-head">
            <h2 id="exposure-title">
              <Term term="exposure">{en["landing_your_exposure"]}</Term>
            </h2>
            <span>{en["experience_lower_is_better"]}</span>
          </div>
          <div className="score-composition">
            <button
              className="score-evidence"
              aria-label={en["overview_see_the_evidence_for_your_sample_score"]}
              onClick={() => data.showEvidence()}
            >
              <ScoreRing score={data.score} animateIntro={animateIntro} />
            </button>
            <div className="score-message">
              <span className={`risk-label ${risk.tone}`}>{risk.label}</span>
              <motion.h2
                initial={{ opacity: animateIntro && !reduced ? 0 : 1 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: animateIntro && !reduced ? 1.05 : 0,
                  duration: 0.2,
                }}
              >
                {risk.sentence}
              </motion.h2>
              <Delta value={mock.previousScore - data.score} />
              <p className="small muted">
                {
                  en[
                    "overview_based_on_sample_observations_across_four_services"
                  ]
                }
              </p>
            </div>
          </div>
          <div className="score-foot">
            <span>{en["overview_one_setting_at_a_time_is_a_good_start"]}</span>
            <button onClick={() => data.showEvidence()}>
              {en["overview_see_the_evidence"]}
              <ArrowRight size={16} />
            </button>
          </div>
          <span className="visually-hidden" role="status" aria-live="polite">
            {en["overview_exposure_score"]}
            {data.score}. {risk.label}
            {en["overview_lower_is_better"]}
          </span>
        </section>
        <aside className="next-step">
          <span className="section-marker">
            {en["overview_best_next_step"]}
          </span>
          {next ? (
            <>
              <h2>{next.title}</h2>
              <p>{next.description}</p>
              <div className="fix-meta">
                <span className="impact-chip">
                  {en["app_sample"]}
                  {next.impact}
                  {en["app_points"]}
                </span>
                <span>
                  {en["overview_about"]}
                  {next.minutes}
                  {en["app_minutes"]}
                </span>
              </div>
              <Button onClick={() => data.startFix(next)}>{next.title}</Button>
              <span className="small muted">
                {en["overview_you_choose_the_setting_you_stay_in_control"]}
              </span>
            </>
          ) : (
            <>
              <h2>
                {remaining
                  ? en["overview_your_plan_can_wait"]
                  : en["overview_your_plan_is_complete"]}
              </h2>
              <p>
                {remaining
                  ? en[
                      "overview_your_remaining_actions_are_saved_for_later_come_back_when_you_ar"
                    ]
                  : en[
                      "overview_you_ve_worked_through_the_sample_actions_review_your_progress_wh"
                    ]}
              </p>
              <Button
                onClick={() => data.navigate(remaining ? "plan" : "history")}
              >
                {remaining
                  ? en["overview_review_my_plan"]
                  : en["overview_review_my_progress"]}
              </Button>
            </>
          )}
        </aside>
      </div>
      <section className="categories-section">
        <SectionTitle
          title={en["overview_what_needs_a_closer_look"]}
          description={en["overview_higher_bars_mean_more_exposure_to_review"]}
        />
        <div className="category-grid">
          {mock.categories.map((category, index) => {
            const Icon = iconList[index];
            const done = mock.fixes
              .filter(
                (f) =>
                  data.statuses[f.id] === "done" &&
                  (index === 0
                    ? f.id === "phone"
                    : index === 1
                      ? f.id === "ads"
                      : index === 2
                        ? f.id === "location"
                        : f.id === "card"),
              )
              .reduce((sum, f) => sum + f.impact, 0);
            const value = category.score - done;
            return (
              <div className="category" key={category.id}>
                <div className="category-heading">
                  <Icon size={20} />
                  <h3>{category.name}</h3>
                  <strong>
                    <span className="sample-number">{en["ui_sample"]}</span>
                    {value}
                    <span>/100</span>
                  </strong>
                </div>
                <div
                  className="bar-track"
                  role="img"
                  aria-label={text("overview_out_of_100", category.name, value)}
                >
                  <motion.span
                    className={categoryTone(value)}
                    initial={{
                      width: animateIntro && !reduced ? 0 : `${value}%`,
                    }}
                    animate={{ width: `${value}%` }}
                    transition={{
                      duration: reduced ? 0 : 0.6,
                      delay: animateIntro && !reduced ? 0.08 * index : 0,
                    }}
                  />
                </div>
                <p>
                  <strong className={`severity-text ${categoryTone(value)}`}>
                    {value > 75
                      ? en["overview_critical"]
                      : value >= 50
                        ? en["overview_medium"]
                        : en["overview_protected"]}
                  </strong>{" "}
                  · {category.detail}
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="services-section">
        <SectionTitle
          title={en["overview_your_connected_picture"]}
          description={
            en[
              "overview_four_services_in_this_sample_no_accounts_are_connected"
            ]
          }
          action={
            <Button kind="quiet" onClick={data.showImport}>
              {en["overview_preview_my_export"]}
            </Button>
          }
        />
        <div className="services-list">
          {servicesFor(data.statuses).map((service) => (
            <button
              key={service.id}
              onClick={() => {
                data.showEvidence(service.id);
              }}
            >
              <span className="service-monogram">{service.short}</span>
              <span>
                <strong>{service.name}</strong>
                <small>
                  {en["ui_sample"]}
                  {service.fields}
                  {en["exposuremap_observed_fields"]}
                </small>
              </span>
              <span className={`severity-text ${riskFor(service.score).tone}`}>
                {riskFor(service.score).label}
              </span>
              <ArrowRight size={20} />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
