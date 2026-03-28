# Acceptance Checklist

Use this checklist before closing the task or marking a review complete.

## Repo Fit

- Confirm the repo actually hosts Payload or has a clear server-side integration point for the Payload local API.
- Call out any mismatch between the requested bridge shape and the repo's architecture before forcing an implementation.

## Security

- The bridge never exposes direct database credentials to Paperclip agents.
- The bridge never uses raw SQL as the agent-facing interface.
- Every request requires the Paperclip auth headers and HMAC validation.
- Timestamp freshness is enforced.
- Agent, collection, operation, and field allowlists are explicit.
- Read depth and result limits are clamped.
- The route uses existing access control unless a stronger override is explicitly justified.
- Logs omit secrets and sensitive payload contents.

## Implementation Surface

- One narrow RPC-style endpoint exists.
- Shared validation or auth helpers exist instead of embedding everything in the route.
- The supported operations are limited to `find`, `findByID`, `create`, `update`, and optionally `delete`.
- Oversized bodies and malformed JSON are rejected.
- Returned documents are filtered to approved readable fields.
- TODO hooks or stubs exist for rate limiting, IP allowlisting, replay protection, and monitoring.

## Companion Artifacts

- A runnable signed client example exists.
- The env contract is documented.
- The production hardening checklist is documented.
- Focused tests cover the auth and validation boundary.

## Verification

- Run the targeted test command for the new helpers or bridge surface.
- Run the main build for the host app.
- Report any unrelated warnings separately instead of conflating them with the bridge implementation.
