---
name: build-paperclip-payload-bridge
description: Build, review, or harden a secure server-side bridge between Paperclip agents and Payload CMS, usually inside a Next.js app that hosts Payload locally. Use when Codex needs to let trusted Paperclip agents read or mutate approved Payload collections without direct database credentials, raw SQL, or a broad admin token, especially when the work involves HMAC-signed requests, allowlisted operations, audit logging, companion docs, or focused security tests.
---

# Build Paperclip Payload Bridge

Inspect the repo before making assumptions. Confirm the app actually hosts Payload and can call the Payload local API from a server runtime. If the request assumes a co-located Next.js and Payload app and the repo does not match, stop and call out the mismatch before writing code.

## Workflow

1. Inspect the integration surface.

- Find the Payload config, collection definitions, existing server routes, auth utilities, logging conventions, and test/build commands.
- Prefer existing route placement, utility patterns, and repo conventions over inventing a parallel structure.
- If the repo already has a bridge, tighten or extend it instead of replacing it.

2. Preserve the security invariants.

- Keep the bridge server-side only.
- Use the Payload local API, not raw SQL and not direct database credentials.
- Authenticate every request with a shared-secret HMAC over `timestamp + "." + rawBody`.
- Reject missing auth headers, unknown agents, stale timestamps, bad signatures, malformed JSON, oversized bodies, invalid collections, invalid operations, and unexpected top-level keys.
- Use explicit allowlists for agents, collections, operations, readable fields, writable fields, max limits, and max depth.
- Default to `overrideAccess: false` unless the user explicitly approves stronger access and explains why.
- Add audit logs without logging secrets or sensitive document bodies.
- Leave clear TODO hooks for rate limiting, IP allowlisting, replay protection, and error monitoring.

3. Implement a narrow RPC contract.

- Prefer one route handler over many CRUD routes.
- Support only `find`, `findByID`, `create`, `update`, and `delete`.
- Keep request typing strict and clamp `limit` and `depth`.
- Sanitize returned documents to the approved readable fields before responding.

4. Deliver the companion artifacts.

- Add a small signed client example that another agent or operator can run.
- Document the environment contract and production hardening checklist.
- Add focused tests for signature validation, stale timestamp rejection, allowlist rejection, limit clamping, and malformed body handling.
- Run the repo's relevant validation commands and the main build before closing the task.

5. Close the loop clearly.

- Summarize what changed, what remains as hardening work, and any repo-to-plan mismatch.
- If the repo cannot safely support the requested bridge shape, say so explicitly rather than forcing a half-fit implementation.

## References

- Read `references/contract.md` before implementing or reviewing the bridge.
- Read `references/acceptance-checklist.md` before final verification or code review.

## Output Expectations

- Favor additive changes.
- Keep the site or app as the canonical system; the bridge is infrastructure, not a backdoor.
- Make the auth and allowlist logic easy to swap later if the team moves from shared secrets to service accounts or signed JWTs.
