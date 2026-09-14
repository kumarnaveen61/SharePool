export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export interface TestSession {
  cookie: string;
}

export async function login(email: string, password: string): Promise<TestSession> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get("set-cookie");
  if (!res.ok || !setCookie) {
    const body = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${body}`);
  }
  // Only need the cookie's name=value pair for subsequent requests.
  const cookie = setCookie.split(";")[0];
  return { cookie };
}

export async function apiRequest(
  path: string,
  session: TestSession | null,
  init: RequestInit = {}
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Cookie: session.cookie } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}
