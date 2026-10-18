import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthDialog } from "../components/AuthDialog";

const authResponse = (name: string, email: string) => ({
  token: "test-token",
  user: { id: "usr_test", name, email },
  accounts: [],
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("account access", () => {
  it("keeps Harshika Thopte available as the sample login", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => authResponse("Harshika Thopte", "sample@digimirror.local"),
    });
    vi.stubGlobal("fetch", fetchMock);
    const authenticated = vi.fn();
    render(
      <AuthDialog
        initialMode="login"
        onClose={() => undefined}
        onAuthenticated={authenticated}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Harshika Thopte/ }));

    await waitFor(() =>
      expect(authenticated).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Harshika Thopte" }),
        true,
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/login",
      expect.objectContaining({ body: JSON.stringify({ email: "sample", password: "sample123" }) }),
    );
  });

  it("allows a visitor to create a new account", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => authResponse("Asha Rao", "asha@example.com"),
    });
    vi.stubGlobal("fetch", fetchMock);
    const authenticated = vi.fn();
    render(
      <AuthDialog
        initialMode="signup"
        onClose={() => undefined}
        onAuthenticated={authenticated}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Full name"), "Asha Rao");
    await user.type(screen.getByLabelText("Email address"), "asha@example.com");
    await user.type(screen.getByLabelText("Password"), "secret12");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(authenticated).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Asha Rao" }),
        false,
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/signup",
      expect.objectContaining({
        body: JSON.stringify({
          name: "Asha Rao",
          email: "asha@example.com",
          password: "secret12",
          account_name: "Asha Rao profile",
          threat_profile: "everyday",
        }),
      }),
    );
  });
});
