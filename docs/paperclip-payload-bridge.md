# Paperclip Payload Bridge

## Architecture Summary

- Route: `POST /api/paperclip/payload`
- Runtime: Node.js route handler in `app/(frontend)/api/paperclip/payload/route.ts`
- Data path: signed Paperclip request -> Next.js route -> Payload local API -> allowlisted collection response
- Security model: shared-secret HMAC auth, explicit agent allowlists, explicit collection/operation allowlists, field-level read/write allowlists, request-size limits, depth/limit clamps, and structured audit logging

This bridge deliberately avoids direct database credentials, direct SQL, and broad admin tokens. The route uses Payload's local API with `overrideAccess: false`, so existing collection access rules still apply.

## Threat Model And Security Choices

- Credential leakage: Paperclip only receives a shared secret used to sign requests, never raw database credentials.
- Replay and spoofing: the route requires `x-paperclip-agent`, `x-paperclip-timestamp`, and `x-paperclip-signature`; signatures are verified with timing-safe comparison and stale timestamps are rejected.
- Over-broad data access: every allowed collection must be configured in `PAPERCLIP_PAYLOAD_COLLECTION_RULES`, every agent must be configured in `PAPERCLIP_PAYLOAD_AGENT_RULES`, and each collection rule defines readable fields, writable fields, max limits, and max read depth.
- Payload abuse: request bodies are JSON-only, size-limited, validated, and rejected on unexpected top-level keys or non-JSON structures.
- Auditability: every request logs request id, agent id, collection, operation, duration, and success/failure without logging secrets or document bodies.

## Implementation Surface

- Shared validation and auth helpers: `lib/paperclip-payload-bridge.ts`
- Secure route: `app/(frontend)/api/paperclip/payload/route.ts`
- Signed client example: `scripts/paperclip-payload-client.ts`
- Helper tests: `lib/paperclip-payload-bridge.test.ts`

## Required Environment Variables

- `PAPERCLIP_PAYLOAD_SHARED_SECRET`
  Fallback: `PAPERCLIP_SHARED_SECRET`
- `PAPERCLIP_PAYLOAD_COLLECTION_RULES`
  JSON object keyed by collection slug.
- `PAPERCLIP_PAYLOAD_AGENT_RULES`
  JSON object keyed by Paperclip agent id.

Optional:

- `PAPERCLIP_PAYLOAD_MAX_CLOCK_SKEW_MS`
  Default: `300000`
- `PAPERCLIP_PAYLOAD_MAX_BODY_BYTES`
  Default: `262144`
- `PAPERCLIP_PAYLOAD_DEFAULT_LIMIT`
  Fallback: `PAPERCLIP_MAX_LIMIT`
  Default: `10`

Example:

```bash
PAPERCLIP_PAYLOAD_SHARED_SECRET=replace-me
PAPERCLIP_PAYLOAD_COLLECTION_RULES='{
  "posts": {
    "operations": ["find", "findByID", "create", "update"],
    "maxLimit": 10,
    "maxDepth": 1,
    "readFields": ["id", "title", "slug", "excerpt", "publishedDate", "group", "author", "updatedAt", "_status"],
    "writeFields": ["title", "slug", "excerpt", "content", "publishedDate", "scheduledPublishDate", "group", "author", "tags", "newsletterHeading", "newsletterDescription", "_status", "order"]
  },
  "groups": {
    "operations": ["find", "findByID", "create", "update"],
    "maxLimit": 20,
    "maxDepth": 0,
    "readFields": ["id", "title", "slug", "description", "updatedAt"],
    "writeFields": ["title", "slug", "description", "tags"]
  }
}'
PAPERCLIP_PAYLOAD_AGENT_RULES='{
  "73e3b082-ec65-47bb-90dc-5591abf74a7c": {
    "collections": ["posts", "groups"]
  }
}'
```

## Production Hardening Checklist

- Add rate limiting keyed by agent id and source IP.
- Add a replay-protection store for one-time timestamp/signature use.
- Add IP allowlisting or private-network ingress for the route.
- Wire logs into Sentry or another alerting system.
- Narrow agent rules further if different agents need different collection scopes.
- Consider migrating from shared-secret auth to service accounts or short-lived signed JWTs.

## Test Plan

- Unit test HMAC validation against a known-good signature.
- Unit test stale timestamp rejection.
- Unit test agent/collection allowlist rejection.
- Unit test limit clamping.
- Unit test malformed JSON rejection.
- Smoke test locally with `npx tsx scripts/paperclip-payload-client.ts` after wiring env vars.
