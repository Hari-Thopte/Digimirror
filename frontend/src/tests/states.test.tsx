import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Connectivity, ScreenBoundary } from "../components/Experience";
import { ImportDialog } from "../components/UI";
import { en } from "../i18n/en";
import { expansionCopy } from "../i18n/locales";
import { servicesFor } from "../data/mock";
describe("failure and accessibility states", () => {
  it("shows an offline banner and recovers on reconnect", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    const view = render(<Connectivity />);
    expect(screen.getByRole("status")).toHaveTextContent("offline");
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    fireEvent(window, new Event("online"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    view.unmount();
  });
  it("shows recovery instructions after a screen error", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const Broken = () => {
      throw new Error("test failure");
    };
    const reset = vi.fn();
    const view = render(
      <ScreenBoundary onReset={reset}>
        <Broken />
      </ScreenBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("could not open");
    fireEvent.click(
      screen.getByRole("button", { name: "Try this view again" }),
    );
    expect(reset).toHaveBeenCalled();
    view.unmount();
    log.mockRestore();
  });
  it("keeps import validation associated with the file control and recovers with valid JSON", async () => {
    const metadata = vi.fn();
    const u = userEvent.setup({ applyAccept: false });
    const view = render(
      <ImportDialog
        onClose={() => {}}
        onSample={() => {}}
        onMetadata={metadata}
      />,
    );
    const input = screen.getByLabelText("Choose a JSON or CSV export");
    await u.upload(input, new File(["x"], "bad.txt"));
    expect(screen.getByRole("alert")).toHaveTextContent("not supported");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "import-rules import-error",
    );
    const good = new File(['[{"sample":true}]'], "sample.json", {
      type: "application/json",
    });
    Object.defineProperty(good, "text", {
      value: async () => '[{"sample":true}]',
    });
    await u.upload(input, good);
    await waitFor(() =>
      expect(metadata).toHaveBeenCalledWith({
        name: "sample.json",
        records: 1,
        format: "JSON",
      }),
    );
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    view.unmount();
  });
  it("provides a complete double-length copy fixture for wrapping checks", () => {
    const expanded = expansionCopy(en);
    expect(Object.keys(expanded)).toEqual(Object.keys(en));
    expect(expanded.app_done_i_changed_it.length).toBeGreaterThan(
      en.app_done_i_changed_it.length * 2,
    );
  });
  it("keeps advertising evidence aligned with completed sample actions", () => {
    const social = servicesFor({ ads: "done", phone: "done" }).find(
      (s) => s.id === "social",
    )!;
    expect(social.score).toBe(75);
    expect(social.evidence.join(" ")).not.toContain(
      "Activity used for personalised ads",
    );
    expect(social.evidence.join(" ")).not.toContain(
      "Phone number visible on profile",
    );
  });
});
