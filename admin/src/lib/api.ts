const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:4000/api/v1'

export type ApiEnvelope<T> =
  | { success: true; data: T; message: string; meta?: { page: number; limit: number; total: number; totalPages: number } }
  | { success: false; message: string; code: string; errors: unknown[] }

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

// When a request comes back 401/403 because the in-memory access token has
// expired (the page can sit open far longer than the token's lifetime), try a
// one-shot silent refresh using the httpOnly cookie and replay the request.
// Without this, a stale token surfaces to the user as a dead-end "Invalid or
// expired token" / "Insufficient permissions" error on actions like image
// upload, even though they are still logged in.
let refreshInFlight: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j.data?.accessToken) {
          accessToken = j.data.accessToken
          return true
        }
        return false
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<{ data: T; meta?: ApiEnvelope<T> extends { meta: infer M } ? M : never }> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  })

  const json: ApiEnvelope<T> = await res.json().catch(() => ({
    success: false,
    message: 'Unexpected server response',
    code: 'PARSE_ERROR',
    errors: [],
  }))

  if (!json.success) {
    if ((res.status === 401 || res.status === 403) && !isRetry && (await tryRefresh())) {
      return request<T>(path, options, true)
    }
    throw new ApiError(json.message, json.code, res.status)
  }

  return { data: json.data, meta: (json as { meta?: unknown }).meta as never }
}

async function uploadFile<T>(path: string, formData: FormData, isRetry = false): Promise<{ data: T }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      // No Content-Type here — the browser sets the multipart boundary itself.
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: 'include',
    body: formData,
  })

  const json: ApiEnvelope<T> = await res.json().catch(() => ({
    success: false,
    message: 'Unexpected server response',
    code: 'PARSE_ERROR',
    errors: [],
  }))

  if (!json.success) {
    if ((res.status === 401 || res.status === 403) && !isRetry && (await tryRefresh())) {
      return uploadFile<T>(path, formData, true)
    }
    throw new ApiError(json.message, json.code, res.status)
  }

  return { data: json.data }
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
  upload: uploadFile,
}
