import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import {
  createAdminApiKey,
  createPolicy,
  fetchAdminApiKeys,
  fetchAnalyticsOverview,
  fetchModeratorQueue,
  fetchOrganizations,
  fetchPolicies,
  moderateContent,
  rotateAdminApiKey,
  reviewModeration,
  updateAdminApiKey,
  revokeAdminApiKey,
  signupUser
} from "./api";
import { auth, db } from "./firebase";
import { useAuth } from "./auth";

function PanelShell({ title, nav, children }: { title: string; nav: { to: string; label: string }[]; children: ReactNode }) {
  const { claims, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Aegis AI</p>
            <h1 className="text-lg font-semibold text-indigo-300">{title}</h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <span>Org: {claims?.orgId ?? "-"}</span>
            <span>Plan: {claims?.plan ?? "-"}</span>
            <button onClick={onLogout} className="rounded bg-indigo-500 px-3 py-1.5 font-semibold text-white">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-6">
        <aside className="col-span-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <nav className="space-y-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm ${isActive ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-200"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section className="col-span-9 space-y-4">{children}</section>
      </main>
    </div>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">{text}</p>
    </article>
  );
}

function statusText(value: unknown) {
  return typeof value === "string" ? value : "unknown";
}

function formatExpiry(value: unknown) {
  if (!value) return "never";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const maybeDate = (value as { toDate?: () => Date }).toDate;
    if (typeof maybeDate === "function") return maybeDate().toISOString();
  }
  return String(value);
}

function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : "Login failed";
  }
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Invalid email or password.";
    case "auth/user-not-found":
      return "No account found for this email.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account is disabled.";
    case "auth/operation-not-allowed":
      return "Email/password login is not enabled in Firebase Auth.";
    case "auth/too-many-requests":
      return "Too many login attempts. Please wait and try again.";
    default:
      return "Login failed. Check Firebase Auth settings and credentials.";
  }
}

export function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name || !email || !password || !role) {
      setError("All fields are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      // Wait for backend to assign claims and store data
      const result = await signupUser(credential.user, { name, role });
      
      // Force refresh the ID token so frontend gets the new claims
      await credential.user.getIdToken(true);
      
      navigate(`/${result.role}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-xl font-semibold text-indigo-300">Create Account</h1>
        <p className="mt-2 text-sm text-slate-300">Sign up to access Aegis AI.</p>
        <div className="mt-5 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <option value="user">User</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </select>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <button type="submit" disabled={loading} className="w-full rounded bg-indigo-500 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Already have an account? <Link to="/login" className="text-indigo-400 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const claims = (await credential.user.getIdTokenResult(true)).claims as Record<string, unknown>;
      const role = claims.role;
      if (role !== "user" && role !== "moderator" && role !== "admin") {
        throw new Error("Account has no valid role claim.");
      }
      navigate(`/${role}`, { replace: true });
    } catch (err) {
      setError(getLoginErrorMessage(err));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-xl font-semibold text-indigo-300">Aegis AI Login</h1>
        <p className="mt-2 text-sm text-slate-300">Sign in to access your role-specific panel.</p>
        <div className="mt-5 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <button type="submit" className="w-full rounded bg-indigo-500 py-2 text-sm font-semibold text-white">
            Sign In
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Don't have an account? <Link to="/signup" className="text-indigo-400 hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md rounded-lg border border-slate-800 bg-slate-900 p-5 text-sm text-slate-200">
        This account is missing required custom claims (`orgId`, `role`, `plan`). Contact an admin.
      </div>
    </div>
  );
}

export function UserPanelPage() {
  const location = useLocation();
  const { claims } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [type, setType] = useState<"text" | "image" | "video">("text");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [submitState, setSubmitState] = useState("");
  const [history, setHistory] = useState<Array<{ id: string; status: string; type: string; createdAt?: { seconds?: number } }>>([]);

  useEffect(() => {
    if (!claims) return;
    const orgId = claims.orgId;
    const ref = query(collection(db, "organizations", orgId, "content"), orderBy("createdAt", "desc"));
    return onSnapshot(ref, (snap) => {
      setHistory(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            status: statusText(data.status),
            type: statusText(data.type),
            createdAt: data.createdAt as { seconds?: number } | undefined
          };
        })
      );
    });
  }, [claims]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("Submitting...");
    try {
      const payload =
        type === "text"
          ? { type, text, async: false }
          : {
              type,
              mediaUrl,
              async: type === "video"
            };
      const result = await moderateContent(payload, apiKey);
      setSubmitState(`Submitted. contentId=${result.contentId}`);
      setText("");
      setMediaUrl("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submission failed";
      setSubmitState(message);
    }
  }

  const nav = useMemo(
    () => [
      { to: "/user", label: "Submit Content" },
      { to: "/user/history", label: "Submission History" }
    ],
    []
  );
  return (
    <PanelShell title="User Panel" nav={nav}>
      {location.pathname === "/user" ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold">Submit Content</h2>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Tenant API key (required for /moderate)"
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <select value={type} onChange={(e) => setType(e.target.value as "text" | "image" | "video")} className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          {type === "text" ? (
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text to moderate..." className="h-28 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
          ) : (
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://... media URL"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            />
          )}
          <button type="submit" className="rounded bg-indigo-500 px-4 py-2 text-sm font-semibold">
            Submit to /moderate
          </button>
          {submitState ? <p className="text-xs text-slate-300">{submitState}</p> : null}
        </form>
      ) : null}

      {location.pathname === "/user/history" ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-semibold">Submission History (real-time)</h2>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
                <p>ID: {item.id}</p>
                <p>Type: {item.type}</p>
                <p>Status: {item.status}</p>
              </div>
            ))}
            {history.length === 0 ? <p className="text-xs text-slate-400">No submissions yet.</p> : null}
          </div>
        </div>
      ) : null}
    </PanelShell>
  );
}

export function ModeratorPanelPage() {
  const { user, claims } = useAuth();
  const location = useLocation();
  const [queue, setQueue] = useState<Array<Record<string, unknown>>>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchModeratorQueue(user).then((resp) => setQueue(resp.queue)).catch((err: unknown) => {
      setStatus(err instanceof Error ? err.message : "Failed to load queue");
    });
  }, [user]);

  useEffect(() => {
    if (!claims) return;
    const orgId = claims.orgId;
    const ref = query(collection(db, "organizations", orgId, "moderation_results"), where("needsHumanReview", "==", true), orderBy("createdAt", "asc"));
    return onSnapshot(ref, (snap) => {
      setQueue(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [claims]);

  async function onReview(contentId: string, decision: "approved" | "rejected") {
    if (!user) return;
    try {
      await reviewModeration(user, contentId, decision, reason[contentId] ?? "");
      setStatus(`Reviewed ${contentId} as ${decision}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Review failed");
    }
  }

  const nav = useMemo(
    () => [
      { to: "/moderator", label: "Review Queue" },
      { to: "/moderator/history", label: "Reviewed Items" }
    ],
    []
  );
  return (
    <PanelShell title="Moderator Panel" nav={nav}>
      {location.pathname === "/moderator" ? (
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-semibold">Moderation Queue (needsHumanReview=true)</h2>
          {queue.map((item) => {
            const id = String(item.id ?? "");
            return (
              <div key={id} className="rounded border border-slate-800 bg-slate-950 p-3 text-xs">
                <p>Content ID: {id}</p>
                <p>AI Decision: {statusText(item.decision)}</p>
                <p>Confidence: {String(item.confidence ?? "-")}</p>
                <p>Severity: {String(item.severity ?? "-")}</p>
                <textarea
                  value={reason[id] ?? ""}
                  onChange={(e) => setReason((prev) => ({ ...prev, [id]: e.target.value }))}
                  placeholder="Add moderator notes..."
                  className="mt-2 h-20 w-full rounded border border-slate-700 bg-slate-900 p-2"
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => onReview(id, "approved")} className="rounded bg-emerald-600 px-3 py-1">Approve</button>
                  <button onClick={() => onReview(id, "rejected")} className="rounded bg-red-600 px-3 py-1">Reject</button>
                </div>
              </div>
            );
          })}
          {queue.length === 0 ? <p className="text-xs text-slate-400">No items in queue.</p> : null}
          {status ? <p className="text-xs text-slate-300">{status}</p> : null}
        </div>
      ) : (
        <Card title="Reviewed Items" text="Reviewed entries leave the queue when needsHumanReview=false." />
      )}
    </PanelShell>
  );
}

export function AdminPanelPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [organizations, setOrganizations] = useState<Array<Record<string, unknown>>>([]);
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [analytics, setAnalytics] = useState<{ total: number; rejected: number; flagged: number; aiAccuracy: number } | null>(null);
  const [state, setState] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [policyDescription, setPolicyDescription] = useState("");
  const [policyThreshold, setPolicyThreshold] = useState(80);
  const [apiKeys, setApiKeys] = useState<Array<Record<string, unknown>>>([]);
  const [keyLabel, setKeyLabel] = useState("");
  const [keyExpiresAt, setKeyExpiresAt] = useState("");
  const [createdRawKey, setCreatedRawKey] = useState("");
  const [editExpiryByKeyId, setEditExpiryByKeyId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    if (location.pathname === "/admin") {
      fetchOrganizations(user).then((r) => setOrganizations(r.organizations)).catch((e: unknown) => setState(e instanceof Error ? e.message : "Failed loading organizations"));
    }
    if (location.pathname === "/admin/policies") {
      fetchPolicies(user).then((r) => setPolicies(r.policies)).catch((e: unknown) => setState(e instanceof Error ? e.message : "Failed loading policies"));
    }
    if (location.pathname === "/admin/analytics") {
      fetchAnalyticsOverview(user).then((r) => setAnalytics(r)).catch((e: unknown) => setState(e instanceof Error ? e.message : "Failed loading analytics"));
    }
    if (location.pathname === "/admin/api-keys") {
      fetchAdminApiKeys(user).then((r) => setApiKeys(r.keys)).catch((e: unknown) => setState(e instanceof Error ? e.message : "Failed loading API keys"));
    }
  }, [location.pathname, user]);

  async function onCreatePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    try {
      await createPolicy(user, { name: policyName, description: policyDescription, severityThreshold: policyThreshold });
      const refreshed = await fetchPolicies(user);
      setPolicies(refreshed.policies);
      setPolicyName("");
      setPolicyDescription("");
      setPolicyThreshold(80);
      setState("Policy created.");
    } catch (error) {
      setState(error instanceof Error ? error.message : "Failed to create policy");
    }
  }

  async function onCreateApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    try {
      const created = await createAdminApiKey(user, { label: keyLabel || "default", expiresAt: keyExpiresAt || undefined });
      setCreatedRawKey(created.apiKey);
      setKeyLabel("");
      setKeyExpiresAt("");
      const refreshed = await fetchAdminApiKeys(user);
      setApiKeys(refreshed.keys);
      setState("API key created. Copy it now; it is shown only once.");
    } catch (error) {
      setState(error instanceof Error ? error.message : "Failed to create API key");
    }
  }

  async function onRevokeApiKey(keyId: string) {
    if (!user) return;
    try {
      await revokeAdminApiKey(user, keyId);
      const refreshed = await fetchAdminApiKeys(user);
      setApiKeys(refreshed.keys);
      setState(`Revoked key ${keyId}`);
    } catch (error) {
      setState(error instanceof Error ? error.message : "Failed to revoke API key");
    }
  }

  async function onSaveExpiry(keyId: string) {
    if (!user) return;
    try {
      const expiresAt = editExpiryByKeyId[keyId];
      await updateAdminApiKey(user, keyId, { expiresAt: expiresAt || null });
      const refreshed = await fetchAdminApiKeys(user);
      setApiKeys(refreshed.keys);
      setState(`Updated expiration for ${keyId}`);
    } catch (error) {
      setState(error instanceof Error ? error.message : "Failed to update expiration");
    }
  }

  async function onRotateApiKey(keyId: string) {
    if (!user) return;
    try {
      const expiresAt = editExpiryByKeyId[keyId];
      const rotated = await rotateAdminApiKey(user, keyId, { expiresAt: expiresAt || null });
      setCreatedRawKey(rotated.apiKey);
      const refreshed = await fetchAdminApiKeys(user);
      setApiKeys(refreshed.keys);
      setState(`Rotated key ${keyId}. Copy replacement key now.`);
    } catch (error) {
      setState(error instanceof Error ? error.message : "Failed to rotate key");
    }
  }

  const nav = useMemo(
    () => [
      { to: "/admin", label: "Organizations" },
      { to: "/admin/policies", label: "Policies" },
      { to: "/admin/api-keys", label: "API Keys" },
      { to: "/admin/analytics", label: "Analytics" }
    ],
    []
  );
  return (
    <PanelShell title="Admin Panel" nav={nav}>
      {location.pathname === "/admin" ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-semibold">Organizations</h2>
          <div className="space-y-2 text-xs">
            {organizations.map((org) => (
              <div key={String(org.id ?? "")} className="rounded border border-slate-800 bg-slate-950 p-3">
                <p>ID: {String(org.id ?? "")}</p>
                <p>Name: {String(org.name ?? "-")}</p>
                <p>Status: {String(org.status ?? "active")}</p>
              </div>
            ))}
            {organizations.length === 0 ? <p className="text-slate-400">No organizations available.</p> : null}
          </div>
        </div>
      ) : null}

      {location.pathname === "/admin/policies" ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-semibold">Policies</h2>
          <form onSubmit={onCreatePolicy} className="mb-4 space-y-2 rounded border border-slate-800 bg-slate-950 p-3 text-xs">
            <p className="font-semibold">Create Policy</p>
            <input value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="Policy name" className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5" />
            <textarea value={policyDescription} onChange={(e) => setPolicyDescription(e.target.value)} placeholder="Description" className="h-20 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5" />
            <input
              type="number"
              min={0}
              max={100}
              value={policyThreshold}
              onChange={(e) => setPolicyThreshold(Number(e.target.value))}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
            />
            <button type="submit" className="rounded bg-indigo-500 px-3 py-1.5">Create</button>
          </form>
          <div className="space-y-2 text-xs">
            {policies.map((policy) => (
              <div key={String(policy.id ?? "")} className="rounded border border-slate-800 bg-slate-950 p-3">
                <p>ID: {String(policy.id ?? "")}</p>
                <p>Name: {String(policy.name ?? "-")}</p>
                <p>Version: {String(policy.version ?? "-")}</p>
              </div>
            ))}
            {policies.length === 0 ? <p className="text-slate-400">No policies configured.</p> : null}
          </div>
        </div>
      ) : null}

      {location.pathname === "/admin/api-keys" ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-3 text-sm font-semibold">API Keys</h2>
          <form onSubmit={onCreateApiKey} className="mb-4 flex items-center gap-2">
            <input
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              placeholder="Key label"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
            />
            <input
              type="datetime-local"
              value={keyExpiresAt}
              onChange={(e) => setKeyExpiresAt(e.target.value)}
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
            />
            <button type="submit" className="rounded bg-indigo-500 px-3 py-2 text-xs font-semibold">Create Key</button>
          </form>
          {createdRawKey ? (
            <div className="mb-4 rounded border border-amber-700 bg-amber-950 p-3 text-xs text-amber-200">
              One-time secret (copy now): <span className="font-mono">{createdRawKey}</span>
            </div>
          ) : null}
          <div className="space-y-2 text-xs">
            {apiKeys.map((key) => {
              const keyId = String(key.keyId ?? "");
              const isActive = Boolean(key.isActive);
              return (
                <div key={keyId} className="rounded border border-slate-800 bg-slate-950 p-3">
                  <p>ID: {keyId}</p>
                  <p>Label: {String(key.label ?? "-")}</p>
                  <p>Preview: {String(key.keyPreview ?? "-")}</p>
                  <p>Status: {isActive ? "active" : "revoked"}</p>
                  <p>Expires: {formatExpiry(key.expiresAt)}</p>
                  <input
                    type="datetime-local"
                    value={editExpiryByKeyId[keyId] ?? ""}
                    onChange={(e) => setEditExpiryByKeyId((prev) => ({ ...prev, [keyId]: e.target.value }))}
                    className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
                  />
                  <button
                    onClick={() => onRevokeApiKey(keyId)}
                    disabled={!isActive}
                    className="mt-2 rounded bg-red-600 px-2 py-1 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                  <button
                    onClick={() => onSaveExpiry(keyId)}
                    className="ml-2 mt-2 rounded bg-slate-700 px-2 py-1"
                  >
                    Save Expiry
                  </button>
                  <button
                    onClick={() => onRotateApiKey(keyId)}
                    disabled={!isActive}
                    className="ml-2 mt-2 rounded bg-indigo-600 px-2 py-1 disabled:opacity-50"
                  >
                    Rotate (atomic)
                  </button>
                </div>
              );
            })}
            {apiKeys.length === 0 ? <p className="text-slate-400">No API keys yet.</p> : null}
          </div>
        </div>
      ) : null}

      {location.pathname === "/admin/analytics" ? (
        <div className="grid grid-cols-2 gap-3">
          <Card title="Total Moderations" text={String(analytics?.total ?? "-")} />
          <Card title="Rejected" text={String(analytics?.rejected ?? "-")} />
          <Card title="Flagged" text={String(analytics?.flagged ?? "-")} />
          <Card title="AI Accuracy" text={`${String(analytics?.aiAccuracy ?? "-")}%`} />
        </div>
      ) : null}
      {state ? <p className="text-xs text-slate-300">{state}</p> : null}
    </PanelShell>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 text-sm text-slate-200">
        Page not found. Go to <Link to="/" className="text-indigo-300 underline">home</Link>.
      </div>
    </div>
  );
}
