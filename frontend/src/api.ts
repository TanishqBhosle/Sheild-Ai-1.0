import { User } from "firebase/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

async function authedFetch(path: string, user: User, init?: RequestInit) {
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

export async function signupUser(user: User, payload: { name: string; role: string; requestedOrgId?: string }) {
  return authedFetch("/auth/signup", user, {
    method: "POST",
    body: JSON.stringify(payload)
  }) as Promise<{ success: boolean; role: string; orgId: string }>;
}

export async function moderateContent(payload: { type: "text" | "image" | "video"; text?: string; mediaUrl?: string; async?: boolean }, apiKey: string) {
  const response = await fetch(`${API_BASE}/moderate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Moderation failed: ${response.status}`);
  }
  return response.json() as Promise<{ contentId: string; status?: string; decision?: string }>;
}

export async function fetchModeratorQueue(user: User) {
  return authedFetch("/moderator/queue", user) as Promise<{ queue: Array<Record<string, unknown>> }>;
}

export async function reviewModeration(user: User, contentId: string, decision: "approved" | "rejected", reason: string) {
  return authedFetch(`/moderator/review/${contentId}`, user, {
    method: "POST",
    body: JSON.stringify({ decision, reason })
  });
}

export async function fetchPolicies(user: User) {
  return authedFetch("/policies", user) as Promise<{ policies: Array<Record<string, unknown>> }>;
}

export async function createPolicy(user: User, payload: { name: string; description: string; severityThreshold: number }) {
  return authedFetch("/policies", user, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchAnalyticsOverview(user: User) {
  return authedFetch("/analytics/overview", user) as Promise<{ total: number; rejected: number; flagged: number; aiAccuracy: number }>;
}

export async function fetchOrganizations(user: User) {
  return authedFetch("/admin/organizations", user) as Promise<{ organizations: Array<Record<string, unknown>> }>;
}

export async function fetchAdminApiKeys(user: User, orgId?: string) {
  const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
  return authedFetch(`/admin/api-keys${qs}`, user) as Promise<{ keys: Array<Record<string, unknown>> }>;
}

export async function createAdminApiKey(user: User, payload: { orgId?: string; label: string; expiresAt?: string }) {
  return authedFetch("/admin/api-keys", user, {
    method: "POST",
    body: JSON.stringify(payload)
  }) as Promise<{ keyId: string; apiKey: string; keyPreview: string }>;
}

export async function revokeAdminApiKey(user: User, keyId: string) {
  return authedFetch(`/admin/api-keys/${keyId}/revoke`, user, {
    method: "POST"
  }) as Promise<{ revoked: boolean }>;
}

export async function updateAdminApiKey(user: User, keyId: string, payload: { label?: string; expiresAt?: string | null }) {
  return authedFetch(`/admin/api-keys/${keyId}`, user, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }) as Promise<{ updated: boolean }>;
}

export async function rotateAdminApiKey(user: User, keyId: string, payload: { label?: string; expiresAt?: string | null }) {
  return authedFetch(`/admin/api-keys/${keyId}/rotate`, user, {
    method: "POST",
    body: JSON.stringify(payload)
  }) as Promise<{ rotated: boolean; apiKey: string; newKeyId: string }>;
}
