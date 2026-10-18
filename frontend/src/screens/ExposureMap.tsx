import { en, text } from "../i18n/en";
import { useAppReducedMotion } from "../components/preferences";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  List,
  Minus,
  Network,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { riskFor, servicesFor } from "../data/mock";
import type { WorkspaceData } from "../App";
import { Button, EmptyState } from "../components/UI";
export default function ExposureMap({ data }: { data: WorkspaceData }) {
  const [mode, setMode] = useState<"map" | "list">(() =>
    matchMedia("(max-width: 760px)").matches ? "list" : "map",
  );
  const [selectedId, setSelectedId] = useState<string | null>("social");
  const services = servicesFor(data.statuses);
  const selected =
    services.find((service) => service.id === selectedId) || null;
  const [highlight, setHighlight] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const reduced = useAppReducedMotion();
  if (!data.hasData)
    return (
      <>
        <div className="page-title">
          <h1>{en["exposuremap_your_exposure_map"]}</h1>
          <p>{en["exposuremap_see_how_your_data_connects"]}</p>
        </div>
        <EmptyState
          title={en["exposuremap_your_connections_will_appear_here"]}
          description={
            en[
              "exposuremap_try_the_sample_map_to_see_how_a_service_can_reveal_details_about"
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
        <h1>{en["exposuremap_see_the_connections"]}</h1>
        <p>
          {
            en[
              "exposuremap_select_a_service_to_understand_what_it_reveals_about_you"
            ]
          }
        </p>
      </div>
      <div className="map-toolbar">
        <div
          className="segmented"
          role="tablist"
          aria-label={en["exposuremap_exposure_view"]}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              const active =
                (e.target as HTMLElement)
                  .closest("button")
                  ?.getAttribute("data-mode") || mode;
              const target =
                e.key === "Home"
                  ? "map"
                  : e.key === "End"
                    ? "list"
                    : active === "map"
                      ? "list"
                      : "map";
              setMode(target);
              e.currentTarget
                .querySelectorAll<HTMLButtonElement>("button")
                [target === "map" ? 0 : 1]?.focus();
            }
          }}
        >
          <button
            role="tab"
            data-mode="map"
            aria-controls="exposure-panel"
            tabIndex={mode === "map" ? 0 : -1}
            aria-selected={mode === "map"}
            onClick={() => setMode("map")}
          >
            <Network size={20} />
            {en["exposuremap_map"]}
          </button>
          <button
            role="tab"
            data-mode="list"
            aria-controls="exposure-panel"
            tabIndex={mode === "list" ? 0 : -1}
            aria-selected={mode === "list"}
            onClick={() => setMode("list")}
          >
            <List size={20} />
            {en["exposuremap_list"]}
          </button>
        </div>
        <div className="legend">
          <span>
            <i className="dot critical" />
            {en["exposuremap_critical"]}
          </span>
          <span>
            <i className="dot high" />
            {en["exposuremap_high"]}
          </span>
          <span>
            <i className="dot moderate" />
            {en["exposuremap_moderate"]}
          </span>
          <span>
            <i className="dot protected" />
            {en["exposuremap_lower"]}
          </span>
        </div>
      </div>
      <div className={`map-layout ${selected ? "with-detail" : ""}`}>
        <section
          className="map-canvas"
          id="exposure-panel"
          role="tabpanel"
          aria-label={
            mode === "map"
              ? en["exposuremap_interactive_sample_exposure_map"]
              : en["exposuremap_sample_exposure_list"]
          }
        >
          {mode === "map" ? (
            <>
              <div className="map-zoom-controls">
                <button
                  className="icon-button"
                  aria-label={en["exposuremap_zoom_out"]}
                  disabled={zoom <= 0.8}
                  onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
                >
                  <Minus size={20} />
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  className="icon-button"
                  aria-label={en["exposuremap_zoom_in"]}
                  disabled={zoom >= 1.6}
                  onClick={() => setZoom((z) => Math.min(1.6, z + 0.2))}
                >
                  <Plus size={20} />
                </button>
                <button
                  className="icon-button"
                  aria-label={en["exposuremap_reset_map_zoom"]}
                  onClick={() => setZoom(1)}
                >
                  <RotateCcw size={20} />
                </button>
              </div>
              <div className="map-scroll">
                <div
                  className="graph-space"
                  style={{
                    width: `${100 * zoom}%`,
                    minWidth: `${560 * zoom}px`,
                  }}
                >
                  <svg
                    viewBox="0 0 720 460"
                    preserveAspectRatio="none"
                    className="connection-lines"
                    aria-hidden="true"
                  >
                    {[90, 155, 218].map((r) => (
                      <circle
                        key={r}
                        cx="360"
                        cy="235"
                        r={r}
                        className="risk-ring"
                      />
                    ))}
                    {services.map((service) => (
                      <path
                        key={service.id}
                        pathLength="1"
                        style={{
                          opacity:
                            highlight && highlight !== service.id ? 0.15 : 1,
                        }}
                        className={`${riskFor(service.score).tone} ${highlight === service.id || selected?.id === service.id ? "highlighted" : ""}`}
                        d={`M360 235 Q${service.x} 235 ${service.x} ${service.y}`}
                      />
                    ))}
                  </svg>
                  <div className="graph-centre">
                    <strong>{en["exposuremap_you"]}</strong>
                    <span>{en["exposuremap_22_sample_fields"]}</span>
                  </div>
                  {services.map((service) => (
                    <button
                      key={service.id}
                      className={`graph-node ${riskFor(service.score).tone} ${highlight && highlight !== service.id ? "dimmed" : ""} ${selected?.id === service.id ? "selected" : ""}`}
                      style={
                        {
                          left: `${(service.x / 720) * 100}%`,
                          top: `${(service.y / 460) * 100}%`,
                          "--node-size": `${64 + service.score * 0.38}px`,
                        } as React.CSSProperties
                      }
                      aria-label={text(
                        "exposuremap_exposure_sample_service_fields_observed_fields_show_details",
                        service.name,
                        service.score,
                      )}
                      aria-pressed={selected?.id === service.id}
                      onMouseEnter={() => setHighlight(service.id)}
                      onMouseLeave={() => setHighlight(null)}
                      onFocus={() => setHighlight(service.id)}
                      onBlur={() => setHighlight(null)}
                      onClick={() => setSelectedId(service.id)}
                    >
                      <span className="node-disc">{service.short}</span>
                      <strong>{service.name}</strong>
                      <span>
                        {en["ui_sample"]}
                        {service.score} / 100
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="map-caption">
                {
                  en[
                    "exposuremap_larger_circles_show_greater_sample_exposure_higher_risk_services"
                  ]
                }
              </p>
            </>
          ) : (
            <div className="map-service-list">
              {services.map((service) => (
                <button
                  key={service.id}
                  aria-pressed={selected?.id === service.id}
                  onClick={() => setSelectedId(service.id)}
                >
                  <span
                    className={`service-monogram ${riskFor(service.score).tone}`}
                  >
                    {service.short}
                  </span>
                  <span>
                    <strong>{service.name}</strong>
                    <small>
                      {en["ui_sample"]}
                      {service.fields}
                      {en["exposuremap_observed_fields"]}
                    </small>
                  </span>
                  <span
                    className={`severity-text ${riskFor(service.score).tone}`}
                  >
                    {en["ui_sample"]}
                    {service.score} / 100
                  </span>
                  <ArrowRight size={20} />
                </button>
              ))}
            </div>
          )}
        </section>
        <AnimatePresence mode="wait">
          {selected && (
            <motion.aside
              key={selected.id}
              className="map-detail"
              initial={{ opacity: reduced ? 1 : 0, x: reduced ? 0 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              aria-label={text("exposuremap_details", selected.name)}
            >
              <div className="detail-title">
                <span
                  className={`service-monogram ${riskFor(selected.score).tone}`}
                >
                  {selected.short}
                </span>
                <button
                  className="icon-button"
                  aria-label={en["exposuremap_close_service_details"]}
                  onClick={() => setSelectedId(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <h2>{selected.name}</h2>
              <span className={`risk-label ${riskFor(selected.score).tone}`}>
                {riskFor(selected.score).label}
              </span>
              <p>{selected.summary}</p>
              <h3>{en["exposuremap_what_the_sample_shows"]}</h3>
              <ul className="evidence-list">
                {selected.evidence.map((item) => (
                  <li key={item}>
                    <Check size={16} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="evidence-limit">
                {
                  en[
                    "exposuremap_these_are_sample_observations_not_confirmation_of_a_breach"
                  ]
                }
              </div>
              <Button
                kind="secondary"
                onClick={() => data.showEvidence(selected.id)}
              >
                {en["experience_see_the_evidence"]}
              </Button>
              <Button onClick={() => data.navigate("plan")}>
                {en["exposuremap_review_my_privacy_plan"]}
              </Button>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      <details className="text-alternative">
        <summary>{en["exposuremap_read_the_map_as_text"]}</summary>
        <p>
          {en["exposuremap_your_sample_profile_connects_to_four_services"]}{" "}
          {services
            .map((s) =>
              text(
                "exposuremap_observed_fields_exposure_of_100",
                s.name,
                s.fields,
                s.score,
              ),
            )
            .join(" ")}{" "}
          {en["exposuremap_each_service_s_details_are_available_in_list_view"]}
        </p>
      </details>
    </>
  );
}
