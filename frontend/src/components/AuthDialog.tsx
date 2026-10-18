import { useState, type FormEvent } from "react";
import { ArrowRight, FlaskConical, LogIn, UserPlus } from "lucide-react";
import { Dialog } from "./UI";
import {
  sampleSignIn,
  signIn,
  signUp,
  type AuthUser,
} from "../data/auth";

export type AuthMode = "login" | "signup";

export function AuthDialog({
  initialMode,
  onClose,
  onAuthenticated,
}: {
  initialMode: AuthMode;
  onClose: () => void;
  onAuthenticated: (user: AuthUser, sample: boolean) => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const authenticate = async (action: () => ReturnType<typeof signIn>, sample = false) => {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      onAuthenticated(result.user, sample);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void authenticate(() =>
      mode === "login" ? signIn(email, password) : signUp(name, email, password),
    );
  };

  const changeMode = (next: AuthMode) => {
    setMode(next);
    setError("");
  };

  return (
    <Dialog
      title={mode === "login" ? "Sign in to DigiMirror" : "Create your DigiMirror account"}
      onClose={onClose}
    >
      <p className="dialog-lead auth-intro">
        {mode === "login"
          ? "Continue with your account, or explore the website using Harshika Thopte's sample profile."
          : "Create your own private workspace. Harshika's profile will stay available as the sample account."}
      </p>

      <div className="auth-tabs" role="tablist" aria-label="Account options">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={mode === "login" ? "active" : ""}
          onClick={() => changeMode("login")}
        >
          <LogIn size={17} /> Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={mode === "signup" ? "active" : ""}
          onClick={() => changeMode("signup")}
        >
          <UserPlus size={17} /> Create account
        </button>
      </div>

      {mode === "login" && (
        <button
          type="button"
          className="sample-login-card"
          disabled={busy}
          onClick={() => void authenticate(sampleSignIn, true)}
        >
          <span className="sample-avatar">HT</span>
          <span>
            <strong>Harshika Thopte</strong>
            <small>Sample account · Open instantly</small>
          </span>
          <FlaskConical size={19} />
        </button>
      )}

      {mode === "login" && <div className="auth-separator"><span>or use your account</span></div>}

      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && (
          <label>
            Full name
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              required
            />
          </label>
        )}
        <label>
          Email address
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "signup" ? 6 : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            required
          />
        </label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="button primary auth-submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          {!busy && <ArrowRight size={18} />}
        </button>
      </form>

      <p className="auth-switch">
        {mode === "login" ? "New to DigiMirror?" : "Already have an account?"}{" "}
        <button type="button" onClick={() => changeMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </Dialog>
  );
}
