# Aegis AI

Production-grade multi-tenant AI Content Moderation SaaS platform built to the provided Aegis AI technical documentation.

## Project Overview

Aegis AI is a full-stack moderation platform that supports:
- Multi-tenant isolation using `orgId` across Firestore, APIs, and storage.
- Sync moderation for text/small images and async moderation for heavy media.
- Human-in-the-loop review queues with moderator overrides and feedback signals.
- Three dashboard personas: end user, moderator, and platform admin.
- Secure API key auth, role-based access control, and HMAC webhook delivery.

## Features

- **Moderation APIs**
  - `POST /v1/moderate`
  - `GET /v1/results/:contentId`
  - `GET /v1/results`
- **Policy Management**
  - `POST /v1/policies`
  - `PATCH /v1/policies/:policyId`
  - `GET /v1/policies`
- **Moderator + Admin**
  - `GET /v1/moderator/queue`
  - `POST /v1/moderator/review/:contentId`
  - `GET /v1/dashboard/summary`
  - `GET /v1/analytics/overview`
  - `GET /v1/admin/organizations`
  - `POST /v1/admin/organizations/:orgId/suspend`
- **Webhook**
  - `POST /v1/webhooks/test` (HMAC signature)
- **Security + Isolation**
  - Firestore rules and storage rules enforce org isolation.
  - API keys are SHA-256 hashed and validated per request.
  - Firebase Auth ID token verification + strict RBAC middleware.
  - Role-locked frontend route guards for separated `/user/*`, `/moderator/*`, `/admin/*` panels.

## Strict Panel Separation

The platform enforces a non-overlapping role flow:

- `role=user` -> only `/user/*`
- `role=moderator` -> only `/moderator/*`
- `role=admin` -> only `/admin/*`

Authentication requirements:

- Firebase Auth sign-in
- Firebase custom claims on token: `{ orgId, role, plan }`
- If claims are missing/invalid, access is denied (`/unauthorized` in frontend, `403` in backend)

Cross-access protection:

- Frontend route guards redirect role mismatches to the correct panel.
- Backend role middleware rejects unauthorized role-to-endpoint access.

## Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, Framer Motion
- **Backend:** Firebase Cloud Functions v2, Express, Firestore, Firebase Auth
- **AI Layer:** Gemini-aligned routing model with per-type moderation pipeline
- **Data:** Firestore collections and composite indexes
- **Security:** Firestore Security Rules, Storage Rules, HMAC webhooks

## Architecture

- Shared infrastructure, isolated data:
  - `/organizations/{orgId}/...` for tenant-owned data.
  - Top-level `/api_keys/{hash}` for service-side key validation.
  - Optional `/platform/*` docs for platform admin stats.
- Request routing:
  - Sync (`<2s`) for text/small images.
  - Async queue pattern for audio/video/large media.
- HITL:
  - `needsHumanReview` queue entry.
  - Moderator decision overrides and feedback signals stored for accuracy analytics.

## Folder Structure

```text
aegis-ai/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.ts
├── functions/
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
└── package.json
```

## Firestore Schema

Core collections used by implementation:
- `/organizations/{orgId}`
  - `/members/{userId}`
  - `/policies/{policyId}`
  - `/content/{contentId}`
  - `/moderation_results/{resultId}`
  - `/usage_logs/{YYYY-MM}`
  - `/audit_logs/{logId}`
  - `/feedback_signals/{signalId}`
- `/api_keys/{sha256(rawKey)}`
- `/platform/{docId}`

## API Documentation

### `POST /v1/moderate`
Body:
```json
{
  "type": "text",
  "text": "sample",
  "mediaUrl": null,
  "externalId": "post_123",
  "policyId": "pol_abc",
  "metadata": { "userId": "u1" },
  "async": false
}
```

### `GET /v1/results/:contentId`
Returns queued or completed moderation result for a content item.

### `GET /v1/results`
Paginated/filterable listing (`status`, `type`, `limit`).

### Policy APIs
- `POST /v1/policies`
- `PATCH /v1/policies/:policyId`
- `GET /v1/policies`

### Moderator/Admin APIs
- `GET /v1/moderator/queue`
- `POST /v1/moderator/review/:contentId`
- `GET /v1/dashboard/summary`
- `GET /v1/analytics/overview`
- `GET /v1/admin/organizations`
- `POST /v1/admin/organizations/:orgId/suspend`
- `GET /v1/admin/api-keys`
- `POST /v1/admin/api-keys`
- `POST /v1/admin/api-keys/:keyId/revoke`

### Role Expectations by Endpoint

- **User**
  - Dashboard/status: `GET /v1/dashboard/summary`
- **Moderator**
  - Queue/review: `GET /v1/moderator/queue`, `POST /v1/moderator/review/:contentId`
- **Admin**
  - Policies, analytics, organizations, suspend org, webhook test
  - API key lifecycle: list/create/revoke

### Webhooks
- `POST /v1/webhooks/test`
- Signature header format: `X-AegisAI-Signature: sha256=<digest>`

## Environment Variables

Set these in Firebase Functions runtime / `.env`:

```bash
GEMINI_API_KEY=your_key
WEBHOOK_DEFAULT_SECRET=dev_secret
FIREBASE_PROJECT_ID=project_id
```

## Setup Instructions

1. Install dependencies:
   - `npm install`
2. Frontend local dev:
   - `npm run dev`
3. Build all:
   - `npm run build`
4. Deploy (after Firebase init):
   - `firebase deploy`

## How To Run

- Local frontend: `http://localhost:5173`
- Cloud Functions API base: `/v1/*` through deployed function endpoint
- Use Bearer API key for `/moderate` and `/results`
- Use Bearer base64-encoded role/org JSON token for dashboard/admin endpoints during local mock testing

## Security Notes

- API key raw values are never stored; only SHA-256 hashes are persisted.
- Tenant isolation is validated at middleware and Firestore rules layers.
- Client writes to `content`, `moderation_results`, and `audit_logs` are denied by rules.
- Webhook payloads are HMAC-signed.

## Future Improvements

- Replace `mockModeration` with full Gemini 1.5 Flash/Pro integration.
- Add dedicated Cloud Tasks workers (`moderation-async`, `video-heavy`, `webhook-delivery`).
- Add ffmpeg Cloud Run worker for video frame extraction.
- Add full charting suite and route-level dashboard pages.
- Add scheduled weekly AI-accuracy rollups from feedback signals.
- Expand automated tests (unit + integration + e2e).
