import { en, text } from "../i18n/en";
import { useAppReducedMotion } from "../components/preferences";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  FileUp,
  Fingerprint,
  LockKeyhole,
  Moon,
  Network,
  Pause,
  Play,
  ShieldCheck,
  Sun,
  UserPlus,
} from "lucide-react";
import { mock } from "../data/mock";
import { Brand, Button, SampleBadge, ScoreRing } from "../components/UI";
export default function Landing({
  dark,
  toggleTheme,
  openImport,
  openEvidence,
  openLogin,
  openSignup,
}: {
  dark: boolean;
  toggleTheme: () => void;
  openImport: () => void;
  openEvidence: () => void;
  openLogin: () => void;
  openSignup: () => void;
}) {
  const [frame, setFrame] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);
  const reduced = useAppReducedMotion();
  useEffect(() => {
    if (!playing || reduced) return;
    const timer = setInterval(() => setFrame((i) => (i + 1) % 3), 4200);
    return () => clearInterval(timer);
  }, [playing, reduced]);
  const slides = [
    en["landing_your_exposure"],
    en["landing_your_connections"],
    en["landing_your_next_step"],
  ];
  return (
    <div className="landing">
      <header className="site-header">
        <a href="#home" aria-label={en["app_digimirror_home"]}>
          <Brand />
        </a>
        <nav aria-label={en["landing_site_navigation"]}>
          <a href="#how-it-works">{en["landing_how_it_works"]}</a>
          <a href="#privacy">{en["landing_your_privacy"]}</a>
          <a href="#questions">{en["landing_questions"]}</a>
        </nav>
        <div className="site-header-actions">
          <button
            className="icon-button"
            aria-label={text("app_use_theme", dark ? "light" : "dark")}
            onClick={toggleTheme}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="button quiet header-sign-in" onClick={openLogin}>
            {en.auth_sign_in}
          </button>
          <button className="button secondary header-sign-up" onClick={openSignup}>
            <UserPlus size={17} /> {en.auth_create_account}
          </button>
          <a href="#app/overview" className="button primary">
            {en["landing_open_workspace"]}
          </a>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="brand-statement">
              {en["landing_privacy_reflected"]}
            </span>
            <h1>
              {en["landing_see_what_your"]}
              <br />
              {en["landing_digital_life_reveals"]}
            </h1>
            <p>
              {
                en[
                  "landing_a_clearer_view_of_what_s_visible_about_you_why_it_matters_and_th"
                ]
              }
            </p>
            <a href="#app/overview" className="button primary large">
              {en["landing_explore_your_reflection"]}
              <ArrowRight size={20} />
            </a>
            <div className="hero-proof">
              <LockKeyhole size={20} />
              <p>
                {
                  en[
                    "landing_your_files_are_analysed_in_your_browser_and_never_uploaded"
                  ]
                }
              </p>
            </div>
            <span className="small muted">
              {en["landing_start_with_sample_data_no_account_needed"]}
            </span>
          </div>
          <div
            className="product-preview"
            role="region"
            aria-label={en["landing_product_preview"]}
          >
            <div className="preview-top">
              <span>
                <Fingerprint size={20} />
                {en["landing_your_reflection"]}
              </span>
              <SampleBadge />
            </div>
            <div className="preview-stage">
              <AnimatePresence mode="wait">
                <motion.div
                  key={frame}
                  className="preview-slide"
                  initial={{ opacity: reduced ? 1 : 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: reduced ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {frame === 0 ? (
                    <>
                      <div className="preview-score">
                        <ScoreRing score={mock.baseScore} small />
                        <div>
                          <span className="risk-label high">
                            {en["landing_high_exposure"]}
                          </span>
                          <h2>
                            {en["landing_a_little_more_visible"]}
                            <br />
                            {en["landing_than_you_d_expect"]}
                          </h2>
                          <p>
                            {
                              en[
                                "landing_lower_is_better_start_with_your_phone_number"
                              ]
                            }
                          </p>
                        </div>
                      </div>
                      <Button kind="quiet" onClick={openEvidence}>
                        {en.experience_see_the_evidence}
                      </Button>
                      <div className="preview-insight">
                        <Eye size={20} />
                        <span>
                          {
                            en[
                              "landing_your_number_is_visible_beyond_your_contacts"
                            ]
                          }
                        </span>
                      </div>
                    </>
                  ) : frame === 1 ? (
                    <>
                      <h2>{en["landing_your_details_connect_the_dots"]}</h2>
                      <div
                        className="mini-map"
                        aria-label={
                          en[
                            "landing_four_sample_services_connected_to_your_profile"
                          ]
                        }
                      >
                        <svg
                          viewBox="0 0 480 220"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <path d="M86 55 Q185 55 220 95 M394 55 Q295 55 260 95 M86 165 Q185 165 220 125 M394 165 Q295 165 260 125" />
                        </svg>
                        <span className="mini-you">{en["landing_you"]}</span>
                        <span className="mini-node n1">
                          {en["landing_social_profile"]}
                        </span>
                        <span className="mini-node n2">
                          {en["landing_google"]}
                        </span>
                        <span className="mini-node n3">
                          {en["landing_shopcart"]}
                        </span>
                        <span className="mini-node n4">
                          {en["landing_soundwave"]}
                        </span>
                      </div>
                      <p className="preview-caption">
                        {
                          en[
                            "landing_follow_a_connection_to_understand_the_evidence"
                          ]
                        }
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="preview-action-icon">
                        <ShieldCheck size={24} />
                      </div>
                      <h2>
                        {en["landing_one_useful_change"]}
                        <br />
                        {en["landing_a_little_less_exposure"]}
                      </h2>
                      <div className="preview-fix">
                        <span>1</span>
                        <div>
                          <strong>{mock.fixes[0].title}</strong>
                          <p>{en["landing_about_2_minutes"]}</p>
                        </div>
                        <span className="impact-chip">
                          {en["landing_7_points"]}
                        </span>
                      </div>
                      <p className="preview-caption">
                        {
                          en[
                            "landing_a_clear_explanation_before_you_change_a_setting"
                          ]
                        }
                      </p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="preview-controls">
              <div
                role="group"
                aria-label={en["landing_choose_product_preview"]}
              >
                {slides.map((slide, index) => (
                  <button
                    key={slide}
                    aria-label={text("landing_preview", slide.toLowerCase())}
                    aria-pressed={frame === index}
                    onClick={() => {
                      setFrame(index);
                      setPlaying(false);
                    }}
                  >
                    <span />
                    {slide}
                  </button>
                ))}
              </div>
              <button
                className="icon-button"
                aria-label={
                  playing
                    ? en["landing_pause_product_preview"]
                    : en["landing_play_product_preview"]
                }
                onClick={() => setPlaying(!playing)}
              >
                {playing && !reduced ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>
        </section>
        <section className="landing-how site-section" id="how-it-works">
          <div className="section-intro">
            <h2>
              {en["landing_less_wondering"]}
              <br />
              {en["landing_more_understanding"]}
            </h2>
            <p>
              {
                en[
                  "landing_your_information_lives_in_different_places_bring_the_signals_tog"
                ]
              }
            </p>
          </div>
          <div className="steps-grid">
            {[
              {
                icon: FileUp,
                title: en["landing_bring_it_into_view"],
                text: en[
                  "landing_preview_an_export_in_your_browser_or_explore_with_sample_data_no"
                ],
              },
              {
                icon: Network,
                title: en["landing_understand_the_connections"],
                text: en[
                  "landing_see_which_details_are_visible_and_how_an_action_or_permission_ca"
                ],
              },
              {
                icon: ShieldCheck,
                title: en["landing_choose_your_next_step"],
                text: en[
                  "landing_review_one_practical_fix_at_a_time_understand_the_change_before_"
                ],
              },
            ].map((step, index) => (
              <article key={step.title}>
                <div className="step-number">
                  <step.icon size={24} />
                  <span>0{index + 1}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="privacy-section site-section" id="privacy">
          <div className="privacy-illustration">
            <img
              src="/shield-transparent.png"
              alt={en["landing_digimirror_shield"]}
            />
            <span>
              <LockKeyhole size={20} />
              {en["landing_stays_in_your_browser"]}
            </span>
          </div>
          <div>
            <h2>
              {en["landing_privacy_shouldn_t_require"]}
              <br />
              {en["landing_another_leap_of_faith"]}
            </h2>
            <p>
              {
                en[
                  "landing_you_can_explore_without_signing_in_a_file_preview_is_read_locall"
                ]
              }
            </p>
            <ul className="check-list">
              <li>
                <Check size={20} />
                {en["landing_no_account_connection_required"]}
              </li>
              <li>
                <Check size={20} />
                {en["landing_no_file_uploads_or_background_monitoring"]}
              </li>
              <li>
                <Check size={20} />
                {en["landing_a_clear_way_to_export_or_delete_your_reflection"]}
              </li>
            </ul>
            <Button kind="secondary" onClick={openImport}>
              {en["landing_see_how_file_previews_work"]}
            </Button>
          </div>
        </section>
        <section className="faq-section site-section" id="questions">
          <div>
            <h2>
              {en["landing_a_few_things"]}
              <br />
              {en["landing_worth_knowing"]}
            </h2>
            <p>{en["landing_clarity_before_you_begin"]}</p>
          </div>
          <div className="faq-list">
            {mock.faq.map((item, index) => (
              <article key={item.q}>
                <h3>
                  <button
                    aria-expanded={faq === index}
                    aria-controls={`faq-${index}`}
                    onClick={() => setFaq(faq === index ? null : index)}
                  >
                    {item.q}
                    <ChevronDown
                      size={20}
                      className={faq === index ? "rotated" : ""}
                    />
                  </button>
                </h3>
                <div id={`faq-${index}`} hidden={faq !== index}>
                  <p>{item.a}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="closing-cta">
          <ShieldCheck size={24} />
          <h2>{en["landing_a_clearer_picture_starts_here"]}</h2>
          <p>
            {
              en[
                "landing_see_the_sample_understand_the_signals_choose_one_next_step"
              ]
            }
          </p>
          <a href="#app/overview" className="button primary large">
            {en["landing_open_workspace"]}
          </a>
        </section>
      </main>
      <footer className="site-footer">
        <Brand />
        <p>{en["landing_privacy_reflected_decisions_yours"]}</p>
        <a href="#home">{en["landing_back_to_top"]}</a>
      </footer>
    </div>
  );
}
