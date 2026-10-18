import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import {
  applyFix,
  categoryTone,
  initialSnapshot,
  readSession,
  relativeTime,
  scoreFor,
  writeSession,
} from "../data/state";
const user = () => userEvent.setup();
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  location.hash = "app/plan";
});
afterEach(cleanup);
async function ready(page = "plan") {
  location.hash = `app/${page}`;
  const result = render(<App />);
  await waitFor(
    () =>
      expect(
        screen.queryByRole("dialog", { name: "Welcome to DigiMirror" }),
      ).not.toBeInTheDocument(),
    { timeout: 2500 },
  );
  const skip = screen.queryByRole("button", { name: "Skip introduction" });
  if (skip) await user().click(skip);
  await within(screen.getByRole("main")).findByRole("heading", { level: 1 });
  return result;
}
describe("sample state", () => {
  it("updates the score once per action and can reopen it", () => {
    let s = initialSnapshot();
    s = applyFix(s, "phone", "done");
    expect(scoreFor(s)).toBe(65);
    s = applyFix(s, "phone", "done");
    expect(scoreFor(s)).toBe(65);
    s = applyFix(s, "phone", "open");
    expect(scoreFor(s)).toBe(72);
  });
  it("uses requested severity boundaries", () => {
    expect([49, 50, 75, 76].map(categoryTone)).toEqual([
      "protected",
      "high",
      "high",
      "critical",
    ]);
  });
  it("handles invalid saved JSON and relative dates", () => {
    sessionStorage.setItem("bad", "{broken");
    expect(readSession("bad", "fallback")).toBe("fallback");
    expect(
      relativeTime(
        "2026-10-14T12:00:00",
        new Date("2026-10-16T12:00:00").getTime(),
      ),
    ).toBe("2 days ago");
  });
});
describe("frontend journeys", () => {
  it("guided completion updates plan, overview, history and supports Undo", async () => {
    await ready();
    const u = user();
    await u.click(screen.getByRole("button", { name: "Hide my phone number" }));
    const d = screen.getByRole("dialog", { name: "Hide my phone number" });
    for (const box of within(d).getAllByRole("checkbox")) await u.click(box);
    await u.click(
      within(d).getByRole("button", { name: "Done, I changed it" }),
    );
    expect(
      await screen.findByRole("dialog", { name: "What changed?" }),
    ).toHaveTextContent("65");
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    await u.click(screen.getByRole("button", { name: "Close summary" }));
    await u.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    await u.click(screen.getByRole("button", { name: "Hide my phone number" }));
    for (const box of within(
      screen.getByRole("dialog", { name: "Hide my phone number" }),
    ).getAllByRole("checkbox"))
      await u.click(box);
    await u.click(screen.getByRole("button", { name: "Done, I changed it" }));
    await u.click(screen.getByRole("button", { name: "Close summary" }));
    await u.click(
      within(screen.getByRole("navigation", { name: "Workspace" })).getByRole(
        "link",
        { name: "Overview" },
      ),
    );
    expect(
      await screen.findByRole("img", { name: /Sample exposure score 65/ }),
    ).toBeInTheDocument();
    await u.click(
      within(screen.getByRole("navigation", { name: "Workspace" })).getByRole(
        "link",
        { name: "History" },
      ),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Hide my phone number",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Sample weekly exposure trend/),
    ).toBeInTheDocument();
  });
  it("onboarding stays dismissed after skip and a new app mount", async () => {
    const first = await ready();
    expect(readSession("dm-onboard", false)).toBe(true);
    first.unmount();
    render(<App />);
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Welcome to DigiMirror" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Skip introduction" }),
    ).not.toBeInTheDocument();
  });
  it("theme selection persists across app mounts", async () => {
    let view = await ready("settings");
    await user().click(screen.getByRole("button", { name: "Dark" }));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    view.unmount();
    view = render(<App />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(readSession("dm-theme", "system")).toBe("dark");
    view.unmount();
  });
  it("deletion requires confirmation and Undo restores cleared data", async () => {
    await ready("trust");
    const u = user();
    await u.click(screen.getByRole("button", { name: "Delete my reflection" }));
    const d = screen.getByRole("dialog", { name: "Delete this reflection?" });
    expect(d).toHaveTextContent("file summary");
    await u.click(
      within(d).getByRole("button", { name: "Keep my reflection" }),
    );
    expect(screen.getByText("Sample data is in use")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Delete my reflection" }));
    await u.click(
      within(
        screen.getByRole("dialog", { name: "Delete this reflection?" }),
      ).getByRole("button", { name: "Delete my reflection" }),
    );
    expect(
      await screen.findByText("Sample data was cleared"),
    ).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Sample data is in use")).toBeInTheDocument();
  });
  it("opens a plan action and completes it using the keyboard", async () => {
    await ready();
    const u = user();
    screen.getByRole("button", { name: "Hide my phone number" }).focus();
    await u.keyboard("{Enter}");
    const d = screen.getByRole("dialog", { name: "Hide my phone number" });
    const boxes = within(d).getAllByRole("checkbox");
    for (const box of boxes) {
      box.focus();
      await u.keyboard(" ");
    }
    const done = within(d).getByRole("button", { name: "Done, I changed it" });
    expect(done).toBeEnabled();
    done.focus();
    await u.keyboard("{Enter}");
    expect(
      await screen.findByRole("dialog", { name: "What changed?" }),
    ).toBeInTheDocument();
  });
  it("restores completed choices for this browser session", async () => {
    writeSession("dm-onboard", true);
    writeSession("dm-state", applyFix(initialSnapshot(), "phone", "done"));
    await ready();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  });
});
