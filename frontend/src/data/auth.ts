export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

const TOKEN_KEY = "dm-auth-token";
const USER_KEY = "dm-auth-user";

async function request(path: string, body: object): Promise<AuthResponse> {
  const response = await fetch(`/api/v1/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as AuthResponse & {
    detail?: string;
  };
  if (!response.ok) {
    throw new Error(data.detail || "We couldn't complete that request.");
  }
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export const signIn = (email: string, password: string) =>
  request("login", { email, password });

export const signUp = (name: string, email: string, password: string) =>
  request("signup", {
    name,
    email,
    password,
    account_name: `${name.trim() || "My"} profile`,
    threat_profile: "everyday",
  });

export const sampleSignIn = () => signIn("sample", "sample123");

export function readAuthUser(): AuthUser | null {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
