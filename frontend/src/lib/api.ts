const TOKEN_KEY = "zenithai_token";

/** Tarayıcıda Codespaces/localhost için backend URL (3000→8000). SSR'da proxy. */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const o = window.location.origin;
    if (o.includes("-3000.")) return o.replace("-3000.", "-8000.");
    if (o.includes(":3000")) return o.replace(":3000", ":8000");
  }
  return process.env.NEXT_PUBLIC_API_URL || "/api/backend";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export async function fetchAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    window.location.replace("/giris");
  }
  return res;
}

