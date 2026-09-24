const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "afribit.authToken";

export interface AuthedProfile {
  id: string;
  email: string;
  role: "contributor" | "admin";
  displayName: string | null;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** For any authenticated request beyond auth.ts itself -- e.g. Microtasks calls. */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseErrorOr<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function register(email: string, password: string): Promise<{ role: string }> {
  const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseErrorOr<{ token: string; role: string }>(response);
  setAuthToken(data.token);
  return { role: data.role };
}

export async function login(email: string, password: string): Promise<{ role: string }> {
  const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseErrorOr<{ token: string; role: string }>(response);
  setAuthToken(data.token);
  return { role: data.role };
}

export async function fetchProfile(): Promise<AuthedProfile | null> {
  const token = getAuthToken();
  if (!token) return null;
  const response = await fetch(`${API_BASE}/api/v1/auth/me`, {
    headers: authHeaders(),
  });
  if (!response.ok) {
    // Token expired/invalid -- clear it rather than keep retrying with a dead token.
    clearAuthToken();
    return null;
  }
  return response.json();
}

export function logout(): void {
  clearAuthToken();
}
