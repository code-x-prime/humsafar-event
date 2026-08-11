const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export type ApiEnvelope<T> =
  | { success: true; data: T; message: string }
  | { success: false; message: string; code: string; errors: unknown[] };

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const TOKEN_KEY = "humsafar_access_token";
const GUEST_SESSION_KEY = "humsafar_guest_session_id";

// In-memory mirror of the persisted token so every request doesn't touch
// localStorage — AuthContext calls setAccessToken on login/logout/restore.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function restoreAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  accessToken = localStorage.getItem(TOKEN_KEY);
  return accessToken;
}

// Every guest (unauthenticated) browser gets a stable random id, persisted so
// their cart survives reloads — the server uses this as the cart's identity
// when there's no logged-in user. Once they log in, the guest cart is merged
// into their account cart and this id stops being sent.
export function getGuestSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}

function authHeaders(): Record<string, string> {
  if (accessToken) return { Authorization: `Bearer ${accessToken}` };
  const guestId = getGuestSessionId();
  return guestId ? { "x-guest-session-id": guestId } : {};
}

// Cart merge needs BOTH headers at once — the fresh auth token (to identify
// which account to merge into) and the guest session id (to identify which
// guest cart to pull from), which authHeaders() never sends together.
function mergeCartHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const guestId = getGuestSessionId();
  if (guestId) headers["x-guest-session-id"] = guestId;
  return headers;
}

export async function mergeGuestCart<T>(): Promise<T> {
  const res = await fetch(`${API_BASE}/cart/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...mergeCartHeaders() },
    credentials: "include",
  });
  return parseEnvelope<T>(res);
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseEnvelope<T>(res);
}

export async function patchJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return parseEnvelope<T>(res);
}

export async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
    credentials: "include",
  });

  return parseEnvelope<T>(res);
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { ...authHeaders() },
    credentials: "include",
  });

  return parseEnvelope<T>(res);
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  const json: ApiEnvelope<T> = await res.json().catch(() => ({
    success: false,
    message: "Unexpected server response",
    code: "PARSE_ERROR",
    errors: [],
  }));

  if (!json.success) {
    throw new ApiError(json.message, json.code, res.status);
  }

  return json.data;
}
