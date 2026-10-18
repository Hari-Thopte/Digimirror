import { en, text } from "../i18n/en";
import { mock, type Activity, type FixStatus } from "./mock";
export type Theme = "system" | "light" | "dark";
export interface Snapshot {
  hasData: boolean;
  statuses: Record<string, FixStatus>;
  activity: Activity[];
  fileSummary: { name: string; records: number; format: string } | null;
}
export const initialSnapshot = (): Snapshot => ({
  hasData: true,
  statuses: {},
  activity: mock.initialActivity,
  fileSummary: null,
});
export const scoreFor = (state: Snapshot) =>
  state.hasData
    ? mock.baseScore -
      mock.fixes
        .filter((f) => state.statuses[f.id] === "done")
        .reduce((n, f) => n + f.impact, 0)
    : 0;
export function readSession<T>(key: string, fallback: T): T {
  try {
    const value = sessionStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage is optional. */
  }
}
export function restoreSnapshot(): Snapshot {
  const s = readSession<Snapshot | null>("dm-state", null);
  if (
    !s ||
    typeof s.hasData !== "boolean" ||
    !s.statuses ||
    typeof s.statuses !== "object" ||
    !Object.values(s.statuses).every((v) =>
      ["open", "later", "done"].includes(v),
    ) ||
    !Array.isArray(s.activity) ||
    !s.activity.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        typeof a.title === "string" &&
        typeof a.detail === "string" &&
        typeof a.score === "number" &&
        typeof a.at === "string",
    )
  )
    return initialSnapshot();
  if (
    s.fileSummary &&
    (typeof s.fileSummary.name !== "string" ||
      typeof s.fileSummary.format !== "string" ||
      typeof s.fileSummary.records !== "number")
  )
    return initialSnapshot();
  return { ...s, fileSummary: s.fileSummary || null };
}
export function applyFix(
  state: Snapshot,
  id: string,
  status: FixStatus,
  now = new Date().toISOString(),
): Snapshot {
  const fix = mock.fixes.find((f) => f.id === id);
  if (!fix || !state.hasData || (state.statuses[id] || "open") === status)
    return state;
  const next = { ...state, statuses: { ...state.statuses, [id]: status } };
  return {
    ...next,
    activity: [
      {
        id: crypto.randomUUID(),
        title: fix.title,
        action: status,
        detail:
          status === "done"
            ? en.state_done
            : status === "later"
              ? en.state_later
              : en.state_reopened,
        score: scoreFor(next),
        at: now,
      },
      ...state.activity,
    ],
  };
}
export function relativeTime(at: string, now = Date.now()) {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return at;
  const days = Math.floor(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) /
      86400000,
  );
  return days === 0
    ? en.state_today
    : days === 1
      ? en.state_yesterday
      : days < 7
        ? text("state_days_ago", days)
        : new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(date);
}
export const categoryTone = (value: number) =>
  value > 75 ? "critical" : value >= 50 ? "high" : "protected";
export const clearSnapshot = (): Snapshot => ({
  hasData: false,
  statuses: {},
  activity: [],
  fileSummary: null,
});

export function readDevice<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeDevice(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Preferences still work in memory. */
  }
}
