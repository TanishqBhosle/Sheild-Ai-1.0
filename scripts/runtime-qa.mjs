import crypto from "crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const projectId = "aegis-ai-d9204";
const orgId = "org_demo";
const apiBase = `http://127.0.0.1:5001/${projectId}/us-central1/api/v1`;
const authRestBase = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const emulatorApiKey = "demo-key";
const password = "Passw0rd!";
const rawApiKey = "aegis_demo_runtime_key";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = projectId;

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function ensureUser(email, role) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password, emailVerified: true });
  }
  await auth.setCustomUserClaims(user.uid, { orgId, role, plan: "pro" });
  return user.uid;
}

async function signIn(email) {
  const response = await fetch(`${authRestBase}/accounts:signInWithPassword?key=${emulatorApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Sign in failed for ${email}: ${JSON.stringify(payload)}`);
  }
  return payload.idToken;
}

async function api(path, method, tokenOrApiKey, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenOrApiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  await db.collection("organizations").doc(orgId).set({
    name: "Demo Org",
    plan: "pro",
    status: "active",
    updatedAt: Timestamp.now()
  }, { merge: true });
  const apiKeyHash = sha256(rawApiKey);
  await db.collection("api_keys").doc(apiKeyHash).set({
    orgId,
    label: "runtime-check",
    isActive: true,
    keyPreview: "aegis_demo..._key",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastUsedAt: null,
    expiresAt: null
  }, { merge: true });

  await ensureUser("admin@aegis.test", "admin");
  await ensureUser("moderator@aegis.test", "moderator");
  await ensureUser("user@aegis.test", "user");

  const adminToken = await signIn("admin@aegis.test");
  const moderatorToken = await signIn("moderator@aegis.test");
  const userToken = await signIn("user@aegis.test");

  const moderateResp = await api("/moderate", "POST", rawApiKey, {
    type: "text",
    text: "maybe this is unclear and context missing",
    async: false
  });
  assert(moderateResp.status === 200, `POST /moderate failed: ${JSON.stringify(moderateResp)}`);
  const contentId = moderateResp.payload.contentId;
  assert(contentId, "POST /moderate missing contentId");

  const singleResult = await api(`/results/${contentId}`, "GET", rawApiKey);
  assert(singleResult.status === 200, `GET /results/:contentId failed: ${JSON.stringify(singleResult)}`);

  const allResults = await api("/results", "GET", rawApiKey);
  assert(allResults.status === 200, `GET /results failed: ${JSON.stringify(allResults)}`);

  const modQueue = await api("/moderator/queue", "GET", moderatorToken);
  assert(modQueue.status === 200, `GET /moderator/queue failed: ${JSON.stringify(modQueue)}`);
  assert(Array.isArray(modQueue.payload.queue), "Moderator queue format invalid");

  const modReview = await api(`/moderator/review/${contentId}`, "POST", moderatorToken, { decision: "approved", reason: "safe by context" });
  assert(modReview.status === 200, `POST /moderator/review failed: ${JSON.stringify(modReview)}`);

  const createPolicy = await api("/policies", "POST", adminToken, {
    name: "Runtime QA Policy",
    description: "Created by runtime QA",
    severityThreshold: 80
  });
  assert(createPolicy.status === 201, `POST /policies failed: ${JSON.stringify(createPolicy)}`);

  const policyId = createPolicy.payload.policyId;
  const patchPolicy = await api(`/policies/${policyId}`, "PATCH", adminToken, { description: "Updated in runtime QA" });
  assert(patchPolicy.status === 200, `PATCH /policies failed: ${JSON.stringify(patchPolicy)}`);

  const listPolicies = await api("/policies", "GET", adminToken);
  assert(listPolicies.status === 200, `GET /policies failed: ${JSON.stringify(listPolicies)}`);

  const adminOrg = await api("/admin/organizations", "GET", adminToken);
  assert(adminOrg.status === 200, `GET /admin/organizations failed: ${JSON.stringify(adminOrg)}`);

  const dashboard = await api("/dashboard/summary", "GET", userToken);
  assert(dashboard.status === 200, `GET /dashboard/summary failed: ${JSON.stringify(dashboard)}`);

  const analytics = await api("/analytics/overview", "GET", adminToken);
  assert(analytics.status === 200, `GET /analytics/overview failed: ${JSON.stringify(analytics)}`);

  const webhookTest = await api("/webhooks/test", "POST", adminToken, {});
  assert(webhookTest.status === 200, `POST /webhooks/test failed: ${JSON.stringify(webhookTest)}`);
  assert(typeof webhookTest.payload.signature === "string" && webhookTest.payload.signature.startsWith("sha256="), "Webhook signature format invalid");

  const adminKeyCreate = await api("/admin/api-keys", "POST", adminToken, { label: "qa-key" });
  assert(adminKeyCreate.status === 201, `POST /admin/api-keys failed: ${JSON.stringify(adminKeyCreate)}`);
  const createdKeyId = adminKeyCreate.payload.keyId;
  assert(createdKeyId, "Created key missing keyId");

  const adminKeyList = await api("/admin/api-keys", "GET", adminToken);
  assert(adminKeyList.status === 200, `GET /admin/api-keys failed: ${JSON.stringify(adminKeyList)}`);

  const adminKeyPatch = await api(`/admin/api-keys/${createdKeyId}`, "PATCH", adminToken, { label: "qa-key-updated" });
  assert(adminKeyPatch.status === 200, `PATCH /admin/api-keys/:keyId failed: ${JSON.stringify(adminKeyPatch)}`);

  const adminKeyRotate = await api(`/admin/api-keys/${createdKeyId}/rotate`, "POST", adminToken, {});
  assert(adminKeyRotate.status === 201, `POST /admin/api-keys/:keyId/rotate failed: ${JSON.stringify(adminKeyRotate)}`);
  const rotatedKeyId = adminKeyRotate.payload.newKeyId;
  assert(rotatedKeyId, "Rotate response missing newKeyId");

  const adminKeyRevoke = await api(`/admin/api-keys/${rotatedKeyId}/revoke`, "POST", adminToken, {});
  assert(adminKeyRevoke.status === 200, `POST /admin/api-keys/:keyId/revoke failed: ${JSON.stringify(adminKeyRevoke)}`);

  const moderatorForbidden = await api("/admin/organizations", "GET", moderatorToken);
  assert(moderatorForbidden.status === 403, "Moderator must not access admin organizations");

  const userForbidden = await api("/moderator/queue", "GET", userToken);
  assert(userForbidden.status === 403, "User must not access moderator queue");

  const adminCreateOtherOrg = await api("/admin/api-keys", "POST", adminToken, { orgId: "org_other", label: "bad" });
  assert(adminCreateOtherOrg.status === 403, "Cross-tenant admin create key should be forbidden");

  const limitedOrgId = "org_rate_limit";
  const limitedRawKey = "aegis_demo_rate_key";
  const limitedApiKeyHash = sha256(limitedRawKey);
  await db.collection("organizations").doc(limitedOrgId).set({
    name: "Rate Limited Org",
    plan: "free",
    status: "active",
    updatedAt: Timestamp.now()
  }, { merge: true });
  await db.collection("api_keys").doc(limitedApiKeyHash).set({
    orgId: limitedOrgId,
    label: "rate-limit-key",
    isActive: true,
    keyPreview: "aegis_demo...rate",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    lastUsedAt: null,
    expiresAt: null
  }, { merge: true });
  let rateLimitedCount = 0;
  for (let i = 0; i < 65; i++) {
    const rlResp = await api("/moderate", "POST", limitedRawKey, {
      type: "text",
      text: `rate-limit-probe-${i % 2}`
    });
    if (rlResp.status === 429) rateLimitedCount += 1;
  }
  assert(rateLimitedCount > 0, "Rate limiting did not trigger expected 429 responses");

  console.log("Runtime QA checks passed.");
  console.log(JSON.stringify({
    moderate: moderateResp.status,
    resultById: singleResult.status,
    results: allResults.status,
    queue: modQueue.status,
    review: modReview.status,
    policiesCreate: createPolicy.status,
    policiesPatch: patchPolicy.status,
    policiesList: listPolicies.status,
    adminOrgs: adminOrg.status,
    dashboard: dashboard.status,
    analytics: analytics.status,
    webhookTest: webhookTest.status,
    adminKeyCreate: adminKeyCreate.status,
    adminKeyList: adminKeyList.status,
    adminKeyPatch: adminKeyPatch.status,
    adminKeyRotate: adminKeyRotate.status,
    adminKeyRevoke: adminKeyRevoke.status,
    forbiddenModeratorAdmin: moderatorForbidden.status,
    forbiddenUserModerator: userForbidden.status,
    crossTenantDenied: adminCreateOtherOrg.status,
    rateLimitedResponses: rateLimitedCount
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
