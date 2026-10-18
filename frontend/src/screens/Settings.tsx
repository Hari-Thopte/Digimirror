import { en } from "../i18n/en";
import { Button, Dialog } from "../components/UI";
import { useState } from "react";
import type { WorkspaceData } from "../App";
import type { Theme } from "../data/state";
export default function Settings({
  data,
  theme,
  setTheme,
  reduced,
  setReduced,
  textSize,
  setTextSize,
  replay,
}: {
  data: WorkspaceData;
  theme: Theme;
  setTheme: (t: Theme) => void;
  reduced: boolean;
  setReduced: (b: boolean) => void;
  textSize: string;
  setTextSize: (s: string) => void;
  replay: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <div className="page-title">
        <h1>{en["settings_make_this_space_yours"]}</h1>
        <p>
          {en["settings_choose_how_digimirror_looks_and_moves_on_this_device"]}
        </p>
      </div>
      <section className="settings-hero">
        <h2>{en["settings_appearance_and_comfort"]}</h2>
        <fieldset>
          <legend>{en["settings_theme"]}</legend>
          <div className="segmented">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                aria-pressed={theme === t}
                onClick={() => setTheme(t)}
              >
                {t === "light"
                  ? en["settings_light"]
                  : t === "dark"
                    ? en["settings_dark"]
                    : en["settings_system"]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="setting-row">
          <span>
            <strong>{en["settings_reduce_motion"]}</strong>
            <small>{en["settings_your_device_preference_also_applies"]}</small>
          </span>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
          />
        </label>
        <label className="setting-row">
          <span>{en["settings_text_size"]}</span>
          <select
            value={textSize}
            onChange={(e) => setTextSize(e.target.value)}
          >
            <option value="standard">{en["settings_standard"]}</option>
            <option value="large">{en["settings_large"]}</option>
            <option value="largest">{en["settings_extra_large"]}</option>
          </select>
        </label>
      </section>
      <section className="data-actions">
        <div>
          <h2>{en["settings_review_the_introduction"]}</h2>
          <p>{en["settings_a_short_reminder_of_what_stays_in_your_browser"]}</p>
        </div>
        <Button kind="secondary" onClick={replay}>
          {en["settings_replay_introduction"]}
        </Button>
      </section>
      <section className="data-actions danger-zone">
        <div>
          <h2>{en["app_clear_sample_data"]}</h2>
          <p>
            {
              en[
                "settings_clear_the_score_plan_activity_and_file_summary_from_this_browser"
              ]
            }
          </p>
        </div>
        <Button kind="danger" onClick={() => setConfirm(true)}>
          {en["app_clear_sample_data"]}
        </Button>
      </section>
      {confirm && (
        <Dialog
          title={en["app_clear_sample_data_6"]}
          onClose={() => setConfirm(false)}
        >
          <p>
            {
              en[
                "settings_your_sample_score_completed_and_deferred_actions_activity_histor"
              ]
            }
          </p>
          <div className="button-row">
            <Button
              kind="danger"
              onClick={() => {
                data.clearData();
                setConfirm(false);
              }}
            >
              {en["app_clear_sample_data"]}
            </Button>
            <Button kind="secondary" onClick={() => setConfirm(false)}>
              {en["app_keep_my_data"]}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
