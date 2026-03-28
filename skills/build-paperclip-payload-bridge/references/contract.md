# Bridge Contract

Use this reference when implementing the route, request validator, or client example.

## Security Model

- Keep all database access behind the app's server runtime.
- Call the Payload local API instead of exposing raw database credentials or issuing direct SQL from the agent layer.
- Respect Payload access control by default.

## Required Auth Headers

- `x-paperclip-agent`
- `x-paperclip-timestamp`
- `x-paperclip-signature`

## Signature Formula

```text
hex(hmac_sha256(timestamp + "." + rawBody, shared_secret))
```

Use timing-safe signature comparison. Reject stale timestamps.

## Supported Operations

- `find`
- `findByID`
- `create`
- `update`
- `delete`

Keep the interface narrow and RPC-style. Do not expose a generic "any collection / any operation" admin route.

## Request Shape

Use a strict JSON body with one of these shapes:

```json
{
  "op": "find",
  "collection": "posts",
  "where": {
    "slug": {
      "equals": "example-post"
    }
  },
  "limit": 5,
  "page": 1,
  "sort": "-updatedAt",
  "depth": 0,
  "select": ["id", "title", "slug", "updatedAt"]
}
```

```json
{
  "op": "update",
  "collection": "posts",
  "id": 42,
  "data": {
    "title": "Updated title"
  },
  "select": ["id", "title", "slug", "updatedAt"]
}
```

Reject unexpected top-level keys and malformed JSON.

## Allowlist Requirements

Model allowlists explicitly in configuration, not in ad hoc conditionals.

Each collection rule should define:

- allowed operations
- max result limit
- max read depth
- readable fields
- writable fields when writes are enabled

Each agent rule should define:

- which collections that agent may access

Reject configuration that enables writes without explicit writable fields.

## Environment Contract

Required:

- `PAPERCLIP_PAYLOAD_SHARED_SECRET`
  Fallback to `PAPERCLIP_SHARED_SECRET` only if the product already uses that convention.
- `PAPERCLIP_PAYLOAD_COLLECTION_RULES`
- `PAPERCLIP_PAYLOAD_AGENT_RULES`

Optional:

- `PAPERCLIP_PAYLOAD_MAX_CLOCK_SKEW_MS`
- `PAPERCLIP_PAYLOAD_MAX_BODY_BYTES`
- `PAPERCLIP_PAYLOAD_DEFAULT_LIMIT`

Prefer JSON env values for the allowlist structures when the host app has no stronger config system.

## Implementation Pattern

Split the work into:

- a route handler or server endpoint
- shared auth and validation utilities
- a small client example
- focused tests
- a short doc explaining env vars and hardening gaps

If the host repo is not Next.js, adapt the route to the server framework in use. Preserve the same security invariants.
