# Furry Image Studio Web Application

## Product and Technical Specification

| Field | Value |
| --- | --- |
| Status | Proposed |
| Version | 0.1 |
| Date | 2026-07-30 |
| Owner | The Arcades |
| Implementation status | Not started |

## 1. Purpose

Furry Image Studio is a private-by-default web application for creating,
transforming, and repairing furry, anthro, toon, and creature character images.
Users define reusable character identity profiles, choose a rendering style,
describe an image, and spend prepaid credits to run an image-generation job.

The application turns the existing Furry Image Studio Codex plugin into a
customer-facing product. The plugin remains the reference contract for character
identity, rendering style, source-image preservation, localized repair, and
evaluation. It is not the production runtime. The web application implements
those contracts as versioned server-side domain logic and invokes a supported
image generation and editing API.

## 2. Product principles

1. **Identity and style are separate.** A character profile defines who appears.
   A style profile defines how the image is rendered.
2. **The server is authoritative.** Prices, credit costs, prompt composition,
   job state, and payment results cannot be supplied by the browser.
3. **Credits are auditable.** Every balance change is an immutable ledger entry.
4. **Failure does not cost the user.** A job that produces no accepted output
   automatically releases its credits.
5. **Photo edits preserve the photograph.** Subject-only transformations retain
   the original crop, scene, objects, text, other people, and interactions.
6. **Repairs are localized.** A repair changes one named defect and preserves
   non-defective areas.
7. **Private by default.** Characters, references, source photos, prompts, and
   outputs are never public unless a future, separately specified feature makes
   them public.
8. **Accessible by construction.** The primary workflow must work with central
   vision loss, keyboard navigation, zoom, and screen readers.
9. **One provider is not the domain model.** Generation runs through an internal
   provider adapter so product records survive a future provider change.

## 3. Proposed product decisions

These decisions are the working baseline. They become approved requirements only
after product review.

| Decision | Proposed baseline |
| --- | --- |
| Deployment | Standalone application and repository |
| Public location | `studio.arcadeprofile.com` |
| Database | Dedicated PostgreSQL database |
| Asset storage | Dedicated private Vercel Blob store |
| Payments | One-time PayPal credit packs |
| Subscription plans | Out of scope for MVP |
| Asset visibility | Private to the owner and administrators |
| Authentication | Google OpenID Connect and email/password |
| Source-photo retention | 30 days by default; user may delete sooner |
| Generated-output retention | Until user deletion or account deletion |
| Refund after credits are spent | Negative balance and generation lock |
| Content tier | General-audience beta; explicit sexual content prohibited |
| Minimum user age | 18 |
| Initial image provider | OpenAI image generation/editing API through an adapter |
| Initial currency | USD |
| Initial sales region | United States beta |

## 4. Goals

### 4.1 MVP goals

- Let a user create a reusable character profile with reference images.
- Let a user register and sign in with Google or email/password.
- Let one account safely link both sign-in methods.
- Let a user choose one bundled rendering style.
- Generate a new image from a character, style, and scene request.
- Transform one selected adult in an uploaded photo into the character.
- Repair one named defect in an existing generated image.
- Sell fixed credit packs through PayPal Checkout.
- Maintain an exact, reproducible credit and payment history.
- Let a user review, download, repair, and delete their results.
- Give administrators enough visibility to reconcile payments, investigate
  failures, moderate reports, and issue explicit adjustments.
- Measure provider cost, generation success, latency, credit consumption,
  refunds, and support demand during beta.

### 4.2 Non-goals for MVP

- Recurring subscriptions or automatic credit renewal
- Public galleries, feeds, likes, comments, or social profiles
- Character or style marketplaces
- Team accounts or shared workspaces
- User-to-user credit transfers
- Cash redemption or transferable credits
- Native mobile applications
- Multiple simultaneous image providers
- Public API access
- Batch generation
- User-defined global style packs
- Full manual evaluation and regression-review UI
- Automatic localized repair without user direction

## 5. Success metrics

The MVP is ready for a bounded beta when all release gates in Section 18 pass.
During beta, the product tracks:

| Metric | Initial target |
| --- | --- |
| Duplicate credit grants | 0 |
| Duplicate job charges | 0 |
| Unreconciled completed PayPal captures | 0 |
| Failed jobs without automatic credit release | 0 |
| Cross-user asset access incidents | 0 |
| Generation jobs reaching a terminal state | 100% |
| Successful jobs producing a stored output | At least 85% |
| Median successful-job completion time | Measured before setting a launch SLO |
| User-reported unusable outputs | Measured by action and style |
| Keyboard-complete core workflow | 100% |
| WCAG target | WCAG 2.2 AA plus Section 13 requirements |

No public reliability or latency promise is made until beta supplies a
representative baseline.

## 6. Users and roles

### 6.1 Customer

A signed-in customer can:

- Manage their account.
- Create, edit, archive, and delete their character profiles.
- Upload and delete private reference images.
- Buy credits.
- Submit generation, transformation, and repair jobs.
- View their balance, ledger history, jobs, and outputs.
- Download or delete their outputs.
- Report an output.
- Delete their account and request deletion of stored assets.

### 6.2 Administrator

An administrator can:

- View users, jobs, payments, webhook processing, and ledger entries.
- Retry eligible failed infrastructure operations without charging again.
- Suspend or restore an account.
- Hide or remove prohibited content.
- Issue a signed manual adjustment with a required reason.
- Initiate or record a refund.
- Inspect the exact profile snapshots and prompt used by a disputed job.

Administrators cannot edit or delete ledger entries.

### 6.3 System worker

The worker can:

- Claim queued jobs.
- Read the job's immutable input snapshot.
- Call the configured image provider.
- Store outputs and provider metadata.
- Complete or fail a job.
- Release credits when a job fails without an accepted output.

The worker cannot grant purchase credits or change product pricing.

### 6.4 Authentication and identity

The application supports two first-class customer authentication methods:

- Google sign-in through OpenID Connect
- Local email and password

A user has one application account and zero or more authentication identities.
Payment, credit, character, asset, and job ownership always reference the
application user ID, never a Google identity or email address directly.

#### Google sign-in

Google authentication uses the server-side authorization-code flow through a
maintained OpenID Connect library.

The implementation must:

- Request only `openid`, `email`, and `profile` scopes for sign-in.
- Validate issuer, audience, signature, expiration, `state`, and `nonce`.
- Require Google's `email_verified` claim before creating a verified account.
- Store the Google `sub` claim as the immutable provider identity.
- Never use the Google email address as the provider's stable identifier.
- Avoid storing Google access or refresh tokens when basic sign-in is the only
  authorized use.
- Use an exact allowlist of production and preview redirect URIs.

If a Google identity is already linked, the application signs in its owner. If
the identity is new and its email is unused, the application creates a user and
links the identity. If the verified Google email matches an existing user but
the Google identity is not linked, the application does not merge automatically.
It asks the person to sign in through the existing method and link Google from
account settings.

#### Email and password

Local registration requires:

- A normalized, unique email address
- Email verification
- A password of at least 12 characters
- Support for at least 64 characters, password managers, and paste
- Server-managed password hashing through a maintained authentication library
- Rate-limited registration, verification, sign-in, and recovery attempts

The interface does not impose arbitrary composition rules such as requiring one
symbol and one uppercase letter. Known-compromised and commonly used passwords
should be rejected through a privacy-preserving control.

Password reset:

1. Always returns a non-enumerating response.
2. Sends a single-use, time-limited reset link.
3. Invalidates the reset token after use.
4. Revokes other active sessions after a successful reset.
5. Records a security audit event without storing the password or token.

#### Linking and unlinking

- Linking a new method requires a recent authenticated session and reauthentication
  with an existing method.
- A Google identity can belong to only one application user.
- An email/password credential can belong to only one application user.
- Unlinking is blocked when it would leave the account with no usable sign-in
  method.
- Adding a password to a Google-only account requires email verification.
- Changing the account email requires verification and cannot silently change
  the Google `sub` association.
- Security-sensitive identity changes generate a transactional notification.

#### Sessions

Both authentication methods create the same application session type. Sessions:

- Use secure, HTTP-only, same-site cookies.
- Rotate after sign-in, reauthentication, password change, and identity linking.
- Have documented idle and absolute expiration.
- Can be listed and revoked by the user.
- Are revoked when the account is suspended or deleted.

## 7. Primary user journeys

### 7.1 Create a character

1. The user selects **New character**.
2. The application asks for a name and species.
3. The user selects:
   - Paw style: `human-like-hands`, `hybrid-hands`, or `full-paws`
   - Finger count: `auto`, `five`, or `toon-four`
4. The user enters 3–12 concrete visual traits.
5. The user may enter known drift risks in an avoid list.
6. The user uploads up to the configured reference-image limit.
7. Each reference receives a role such as face, body, markings, clothing, or
   accessory.
8. The application validates the profile.
9. The user saves version 1 of the character.

The interface does not require the user to write a production prompt.

### 7.2 Register and sign in

For Google:

1. The user selects **Continue with Google**.
2. The application starts the server-side OpenID Connect flow.
3. Google authenticates the user and returns an authorization code.
4. The server exchanges and validates the response.
5. The application signs in the linked user, creates a new user, or routes an
   existing-email collision to the explicit linking flow.

For email/password:

1. The user enters email and password.
2. The application creates an unverified account and sends a verification link.
3. Verification activates purchasing and generation.
4. The user signs in through the shared application session.

Google and email/password appear as equally available choices. Neither is hidden
behind a secondary menu.

### 7.3 Generate a new image

1. The user selects a character.
2. The user selects a style.
3. The user chooses an intended use: portrait, full body, scene, sticker,
   banner, icon, or reference-like image.
4. The user describes the scene, action, and mood.
5. The interface displays the exact credit cost.
6. The user confirms.
7. The server debits the credits and queues the job atomically.
8. The job page displays a text status and remains recoverable after refresh.
9. On success, the output appears in the user's library.
10. On failure without an output, the system releases the credits.

### 7.4 Transform a person in a photo

1. The user uploads a source photo.
2. The user attests that every selected recognizable person is an adult and that
   they have permission to transform the image.
3. If the photo contains multiple plausible people, the user identifies the
   target subject.
4. The user selects a character and an allowed subject-only style.
5. The interface summarizes what will change and what must be preserved.
6. The user confirms the credit cost.
7. The job runs as an image edit, not a fresh generation.
8. The result page provides a source/output comparison.

For `toon-in-real-world`, the application must enforce `subject-only` scope and
`preserve-exactly` background policy.

### 7.5 Repair an image

1. The user opens an output and selects **Repair**.
2. The user chooses or describes exactly one defect.
3. The application displays the credit cost and preservation rule.
4. The repair job references the parent output and its character/style snapshot.
5. The provider receives the parent image as the edit target.
6. The result is stored as a new child asset. The parent remains unchanged.
7. Failure releases the repair credit.

### 7.6 Buy credits

1. The user opens **Buy credits**.
2. The application displays fixed packs with credits, USD price, and plain
   refund language.
3. The user selects a pack.
4. The server resolves the SKU and creates a PayPal order.
5. PayPal collects approval.
6. The browser sends the PayPal order ID to the server.
7. The server captures and verifies the order.
8. One database transaction records the capture and grants credits.
9. The updated balance and receipt appear.

Refreshes, duplicate callbacks, and webhook retries must not grant credits twice.

## 8. Character and style contracts

### 8.1 Character profile

A character profile defines identity, not rendering style.

Required fields:

- `id`
- `ownerId`
- `displayName`
- `species`
- `pawStyle`
- `fingerCount`
- `requiredTraits`
- `avoid`
- `version`
- `status`

Optional fields:

- `bodyType`
- `defaultStyleId`
- `aliases`
- `pronouns`
- `personalityTags`

Validation rules:

- `id` is unique per user and uses lowercase kebab-case.
- `requiredTraits` contains 3–12 concrete visual traits.
- `pawStyle` is one of the three supported values.
- `fingerCount` is `auto`, `five`, or `toon-four`.
- A reference image belongs to exactly one user.
- Missing canon remains missing; the application does not invent traits.
- Editing an in-use character creates a new version.

### 8.2 Style profile

A style defines rendering behavior and cannot override character identity.

Required fields:

- `id`
- `displayName`
- `defaultScope`
- `allowedScopes`
- `backgroundPolicy`
- `rendering`
- `preserve`
- `avoid`
- `version`
- `status`

Supported background policies:

- `preserve-exactly`
- `match-mode`
- `stylize-allowed`
- `transparent-or-simple`

The bundled styles are:

- `toon-in-real-world`
- `anime`
- `cartoon-world`
- `photorealism`
- `storybook`
- `sticker`

Bundled styles are administrator-managed and versioned.

### 8.3 Snapshot rule

Every submitted job stores immutable snapshots of:

- Character profile
- Style profile
- Reference asset IDs and hashes
- User request
- Composed provider prompt
- Provider settings
- Credit price
- Applicable policy version

A later character or style edit cannot change an existing job record.

## 9. Prompt composition

Prompt composition occurs only on the server.

The prompt builder combines:

1. Use case
2. Primary goal
3. Input-image roles
4. Character lock
5. Style lock
6. User scene and composition request
7. Preservation rules
8. Allowed change
9. Anatomy rules
10. Avoid list

For visible hands, the prompt includes the selected `pawStyle` and
`fingerCount`. Pawpads are allowed only on visible palm-side surfaces. Object
contact and believable gestures take priority over inventing visible digits.

The browser may preview a plain-language summary of the prompt contract, but it
does not receive hidden safety instructions, provider credentials, or internal
abuse controls.

## 10. Credit system

### 10.1 Initial credit schedule

| Operation | Proposed cost |
| --- | ---: |
| Standard generation, one output | 1 credit |
| Subject transformation, one output | 2 credits |
| Localized repair, one output | 1 credit |
| Higher quality or larger output | To be priced after cost testing |
| Multiple outputs | Out of scope for MVP |

The server resolves the cost from a versioned operation-price table when the job
is created. The UI never sends the authoritative cost.

Credits are closed-loop usage units. They are non-transferable, have no cash
value, and may be spent only on Furry Image Studio operations. Product counsel
must confirm the terms, refund language, expiration behavior, and jurisdictional
treatment before production sales.

### 10.2 Ledger model

The credit balance is the sum of immutable signed ledger entries.

Supported entry types:

- `purchase_grant`
- `job_debit`
- `job_release`
- `payment_reversal`
- `admin_adjustment`
- `promotional_grant`
- `expiration` reserved for future use

Every entry contains:

- User ID
- Signed credit amount
- Entry type
- Source type and source ID
- Unique idempotency key
- Human-readable description
- Actor
- Timestamp
- Optional metadata

The application may cache a balance for performance, but the ledger is
authoritative and the cache must be transactionally updated and reconcilable.

### 10.3 Job debit invariant

Job creation runs in one database transaction:

1. Lock or transactionally guard the user's spendable balance.
2. Confirm the account is allowed to generate.
3. Confirm sufficient credits.
4. Insert the `GenerationJob`.
5. Insert one `job_debit`.
6. Commit.

If any step fails, neither the job nor debit exists.

If the job reaches `failed` or `cancelled` without an accepted output, the
system inserts one `job_release` with an idempotency key derived from the job.

An accepted output means the provider returned a technically valid,
policy-permitted image that the application successfully stored and associated
with the job. Subjective dissatisfaction does not automatically release a
credit. The user may report the output, and a documented support policy may
authorize a separate adjustment.

### 10.4 Negative balances

A payment refund, reversal, or chargeback inserts a `payment_reversal` for the
full credit quantity originally granted. If this produces a negative balance:

- Existing assets remain available.
- New paid jobs are blocked.
- The account displays the balance and resolution path.
- A later purchase first offsets the negative balance.

The system never silently deletes job history to manufacture a non-negative
balance.

## 11. PayPal integration

### 11.1 Product catalog

Credit packs are server-managed SKUs. Each active SKU contains:

- SKU
- Display name
- Credit quantity
- Price as an exact decimal string
- Currency
- Active dates
- Status

The browser submits only the SKU. The server supplies PayPal with the
authoritative item, amount, and currency.

Pack quantities and prices remain open until provider-cost testing establishes:

- Average provider cost per successful operation
- Failed and retried operation cost
- Storage and delivery cost
- PayPal fees
- Refund and dispute allowance
- Support allowance
- Target contribution margin

### 11.2 Order states

Internal PayPal order states:

- `created`
- `approved`
- `capture_pending`
- `captured`
- `failed`
- `refunded`
- `reversed`
- `disputed`

Terminal financial states do not become non-terminal.

### 11.3 Create order

The create-order endpoint must:

1. Require an authenticated, non-suspended user.
2. Validate the SKU against the active server catalog.
3. Create an internal order with expected credits, amount, and currency.
4. Call PayPal Orders v2 with `intent: CAPTURE`.
5. Attach the internal order ID through supported reference metadata.
6. Store the PayPal order ID.
7. Return only the data required to start approval.

### 11.4 Capture order

The capture endpoint must:

1. Require the authenticated owner of the internal order.
2. Reject an unknown or mismatched PayPal order ID.
3. Call PayPal server-to-server to capture the order.
4. Verify completed capture status.
5. Verify merchant, amount, currency, and internal SKU.
6. In one transaction:
   - Mark the order captured.
   - Store the unique capture ID.
   - Insert exactly one `purchase_grant`.
7. Return the authoritative balance and receipt data.

The PayPal capture ID and ledger idempotency key each have unique database
constraints.

### 11.5 Webhooks

The webhook endpoint must:

1. Preserve the request data required for PayPal verification.
2. Verify the event through PayPal's supported signature-verification flow.
3. Reject unverified events without changing financial state.
4. Deduplicate by PayPal webhook event ID.
5. Persist the verified event and processing result.
6. Reconcile relevant completed captures, refunds, reversals, and disputes.
7. Return a successful response only after the event is durably recorded or
   recognized as an already processed duplicate.

The webhook is a reconciliation rail. A browser callback is never sufficient
evidence to mint credits.

### 11.6 Refunds and disputes

- Refund and reversal processing is idempotent.
- The system stores the external transaction and reason.
- A full payment reversal removes the original granted credit quantity.
- Partial-refund behavior is out of scope until PayPal and product rules are
  explicitly defined.
- Administrators may not erase or rewrite the original grant.
- Disputed accounts may be suspended pending review.

### 11.7 Tax and commercial review

Before production sales:

- Confirm whether and where digital-service sales tax must be calculated,
  collected, and remitted.
- Confirm the initial sales region and block unsupported regions.
- Publish credit, refund, dispute, expiration, and account-closure terms.
- Confirm how promotional credits and purchased credits are treated.
- Confirm PayPal seller-protection and digital-goods evidence requirements.
- Record the terms version accepted with each purchase.

PayPal is the payment rail; the specification does not assume that using PayPal
automatically satisfies the application's tax or consumer-law obligations.

## 12. Generation jobs

### 12.1 Job types

- `generate`
- `transform`
- `repair`

### 12.2 Job states

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

Only the following transitions are allowed:

```text
queued -> running
queued -> cancelled
running -> succeeded
running -> failed
```

Terminal states are immutable. A retry creates a new attempt record associated
with the same job or a new child job according to the failure class; it never
charges again unless the user explicitly submits a new paid operation.

### 12.3 Worker behavior

The MVP uses a durable asynchronous job runner. Vercel Workflow is the proposed
default, subject to a bounded infrastructure spike before implementation.

For each claimed job, the worker:

1. Acquires an idempotent execution lease.
2. Loads immutable job inputs.
3. Runs policy and file validation.
4. Builds the provider request.
5. Calls the provider adapter.
6. Stores provider request metadata without credentials.
7. Writes output bytes to private Blob storage.
8. Creates an asset record containing hash, dimensions, type, and provenance.
9. Marks the job succeeded.

If no accepted output exists, the worker marks the job failed and releases the
credit. An infrastructure timeout must eventually resolve through retry or a
terminal reconciliation task.

### 12.4 Provider adapter

The internal adapter exposes:

- `generate(request)`
- `edit(request)`
- `normalizeError(error)`
- `extractUsage(response)`
- `extractSafetyResult(response)`

Product code must not depend directly on provider response objects.

The adapter records:

- Provider
- Model
- Provider request ID, when available
- Size and quality
- Input count
- Usage information, when available
- Latency
- Normalized outcome

Provider API keys are server-only secrets.

## 13. Accessibility requirements

Accessibility requirements apply to public pages, authentication, checkout,
character creation, job submission, job status, library, and account settings.

### 13.1 Visual presentation

- Default body text is at least 20 CSS pixels.
- Primary headings are at least 32 CSS pixels.
- Text and meaningful controls meet WCAG 2.2 AA contrast.
- Important state is never conveyed by color alone.
- Controls have visible boundaries and persistent text labels.
- Focus indicators are thick, high contrast, and never removed.
- The interface remains usable at 200% browser zoom without horizontal reading
  for primary content.
- Essential controls are not placed over images.
- Image comparison uses large panels and an explicit source/output toggle in
  addition to any slider.
- Dense thumbnail grids are avoided; the user can switch to a large list view.

### 13.2 Interaction

- The complete core workflow is keyboard operable.
- Touch targets are at least 44 by 44 CSS pixels.
- One primary decision is presented per step.
- Long forms are divided into clearly named steps.
- Progress is represented with text such as **Queued**, **Generating**, or
  **Ready**, not a spinner alone.
- Errors identify the field, cause, and next action.
- Destructive actions require clear confirmation and identify what will be
  deleted.
- Status updates use appropriate live regions without excessive announcements.

### 13.3 Images

- User-supplied alt text is supported for saved outputs.
- Decorative thumbnails use empty alt text.
- Generated alt-text suggestions are labeled as suggestions and are editable.
- Character traits and job metadata remain available as text; the image is not
  the only record of important information.

## 14. Privacy, consent, and safety

### 14.1 Asset privacy

- All user assets use private storage.
- Reads require an authenticated authorization check and time-bounded signed
  access.
- Blob URLs are not treated as authorization.
- Asset ownership is checked server-side for every read, edit, download, repair,
  and delete action.
- Administrators access private assets only for support, safety, payment
  disputes, or abuse investigation, and access is logged.

### 14.2 Consent

Before transforming a recognizable person, the user must attest:

- The selected person is at least 18.
- The user is the person or has permission to transform the image.
- The image is not being used for impersonation, harassment, fraud, or
  non-consensual sexual content.

The attestation version and timestamp are stored with the job.

### 14.3 Content baseline

The beta prohibits:

- Sexual content involving minors or age-ambiguous characters
- Explicit sexual content
- Non-consensual intimate imagery
- Harassment, fraud, impersonation, or deceptive identity use
- Graphic abuse or torture
- Copyright or trademark infringement presented as authorized
- Attempts to bypass provider or product safeguards

Provider safety decisions are enforced in addition to product rules. A provider
refusal does not automatically prove user misconduct.

### 14.4 Retention and deletion

- Source photos default to automatic deletion 30 days after the latest dependent
  job completes.
- The user may delete a source earlier when no active job requires it.
- Generated outputs remain until the user deletes them.
- Deleting an asset removes the Blob object and tombstones the database record.
- Financial, security, and ledger records are retained as required for audit and
  legal obligations but must not retain image bytes unnecessarily.
- Account deletion starts a documented deletion workflow and blocks new jobs.
- Backups and provider retention are documented in the privacy notice.

## 15. Data model

The implementation should use separate collections or equivalent tables for:

- `Users`
- `AuthIdentities`
- `Sessions`
- `EmailVerificationTokens`
- `PasswordResetTokens`
- `Characters`
- `CharacterVersions`
- `CharacterReferences`
- `Styles`
- `StyleVersions`
- `GenerationJobs`
- `GenerationAttempts`
- `Assets`
- `CreditLedger`
- `CreditProducts`
- `PayPalOrders`
- `PayPalWebhookEvents`
- `ConsentRecords`
- `ContentReports`
- `AdminAuditEvents`

### 15.1 Required uniqueness constraints

- User email
- Authentication provider plus provider subject
- Authentication identity owner plus provider
- Character owner plus character slug
- Character ID plus version
- Style ID plus version
- Ledger idempotency key
- PayPal order ID
- PayPal capture ID
- PayPal webhook event ID
- Job idempotency key
- Asset content hash within the appropriate ownership boundary

Schema changes require explicit migrations with `up()` and `down()` behavior.

## 16. HTTP API

All custom routes live under the frontend API route group, not the Payload
catch-all route group.

### 16.1 Authentication

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/studio/auth/register` | Create a local account |
| `POST` | `/api/studio/auth/verify-email` | Verify a local email |
| `POST` | `/api/studio/auth/login` | Start a local session |
| `POST` | `/api/studio/auth/logout` | Revoke the current session |
| `POST` | `/api/studio/auth/password/forgot` | Request password recovery |
| `POST` | `/api/studio/auth/password/reset` | Complete password recovery |
| `GET` | `/api/studio/auth/google` | Start Google OpenID Connect |
| `GET` | `/api/studio/auth/google/callback` | Validate Google's callback |
| `POST` | `/api/studio/auth/identities/google/link` | Link Google after reauthentication |
| `DELETE` | `/api/studio/auth/identities/google` | Unlink Google safely |
| `GET` | `/api/studio/auth/sessions` | List active sessions |
| `DELETE` | `/api/studio/auth/sessions/:id` | Revoke an active session |

Exact HTTP methods for library-owned callbacks may vary, but the ownership,
validation, and linking behavior in Section 6.4 is required.

### 16.2 Characters and styles

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/studio/characters` | List the user's characters |
| `POST` | `/api/studio/characters` | Create a character |
| `GET` | `/api/studio/characters/:id` | Read an owned character |
| `PATCH` | `/api/studio/characters/:id` | Create a new character version |
| `DELETE` | `/api/studio/characters/:id` | Archive or delete a character |
| `GET` | `/api/studio/styles` | List active bundled styles |

### 16.3 Assets and jobs

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/studio/assets/upload` | Create an authorized private upload |
| `GET` | `/api/studio/assets/:id` | Get authorized asset metadata/access |
| `DELETE` | `/api/studio/assets/:id` | Delete an owned asset |
| `POST` | `/api/studio/jobs` | Validate, debit, and queue a job |
| `GET` | `/api/studio/jobs` | List the user's jobs |
| `GET` | `/api/studio/jobs/:id` | Read job status and results |
| `POST` | `/api/studio/jobs/:id/cancel` | Cancel an eligible queued job |
| `POST` | `/api/studio/jobs/:id/report` | Report an output |

### 16.4 Credits and PayPal

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/studio/credits` | Return balance and ledger history |
| `GET` | `/api/studio/credit-products` | List active server-priced packs |
| `POST` | `/api/studio/paypal/orders` | Create a PayPal order |
| `POST` | `/api/studio/paypal/orders/:id/capture` | Capture and grant credits |
| `POST` | `/api/studio/paypal/webhook` | Verify and reconcile PayPal events |

Mutation routes require authentication, CSRF protection appropriate to the
session mechanism, schema validation, rate limits, and structured audit logs.

## 17. Security and abuse controls

- Use secure, HTTP-only, same-site session cookies.
- Use a maintained OpenID Connect client rather than hand-rolling Google token
  parsing or signature validation.
- Store Google `sub`, not email, as the provider identity key.
- Validate OAuth/OIDC `state` and `nonce` and enforce exact redirect URIs.
- Do not automatically link accounts solely because email addresses match.
- Prevent user enumeration in registration, sign-in recovery, and linking
  errors where practical.
- Rate-limit and audit account linking, unlinking, password reset, and session
  revocation.
- Require verified email before purchasing or generating.
- Rate-limit authentication, uploads, job creation, capture, and report routes.
- Validate file signatures rather than trusting extensions or MIME headers.
- Set upload byte, dimension, and count limits.
- Strip unnecessary image metadata, including location metadata, during ingest.
- Reject malformed or decompression-bomb images.
- Encrypt secrets through the deployment platform.
- Never log credentials, full PayPal access tokens, or raw private image bytes.
- Use stable, privacy-preserving provider safety identifiers when supported.
- Apply Content Security Policy and restrictive asset-origin rules.
- Log administrative reads and mutations of sensitive records.
- Run dependency, secret, and migration checks in CI.
- Keep PayPal sandbox and production credentials strictly separated.

Threat-model review must cover:

- Forged or replayed PayPal callbacks
- Duplicate capture and webhook processing
- Cross-user asset enumeration
- Credit race conditions
- Worker retries and double execution
- Prompt injection through profile fields
- Malicious image uploads
- Unauthorized person transformations
- Admin-account compromise
- Signed-URL leakage
- OAuth login CSRF, callback replay, and redirect manipulation
- Account takeover through unsafe email-based identity linking
- Password spraying, credential stuffing, and reset-token theft

## 18. Release plan and acceptance gates

Each slice is a separate feature branch and pull request. A later slice does not
expand an earlier PR.

### Slice 0: Product contract and cost spike

Deliverables:

- Approved decisions from Section 3
- Provider request spike for all three job types
- Measured cost and latency samples
- Credit-pack proposal
- Privacy and acceptable-use baseline

Pass when:

- At least one representative request per job type succeeds.
- Actual provider cost is captured.
- Proposed pack economics cover measured cost and stated allowances.
- Tax and commercial review identifies the supported sales region and required
  checkout terms.
- Product decisions have named approval.

### Slice 1: Application foundation

Deliverables:

- Standalone repository and deployment
- Authentication
- Google OpenID Connect
- Email verification, password recovery, identity linking, and session management
- PostgreSQL and private Blob configuration
- Baseline accessible layout
- Environment validation and CI

Pass when:

- A verified user can sign in and sign out.
- A new user can register and verify an email/password account.
- A new user can register and sign in through Google.
- Google ID tokens are keyed by `sub`, with issuer, audience, signature,
  expiration, `state`, and `nonce` validated.
- Matching email alone cannot link Google to an existing account.
- An authenticated user can safely link both methods and cannot remove their
  final usable method.
- Password recovery is non-enumerating, single-use, time-limited, and revokes
  other sessions.
- A user cannot access another user's fixture.
- Production fails closed when required secrets are absent.
- Keyboard and 200% zoom smoke tests pass.

### Slice 2: Characters and styles

Deliverables:

- Character wizard
- Reference uploads
- Bundled styles
- Profile validation and versioning

Pass when:

- Every plugin profile fixture imports or maps without losing required fields.
- Invalid paw style, finger count, references, and trait counts fail clearly.
- Editing a used profile creates a new version.

### Slice 3: Ledger

Deliverables:

- Credit products
- Immutable ledger
- Transactional debit and release
- Customer and admin history views

Pass when:

- Concurrent job submissions cannot overspend.
- Duplicate idempotency keys cannot change the balance.
- A complete balance can be reconstructed from entries.
- Ledger entries cannot be updated or deleted through application APIs.

### Slice 4: PayPal sandbox

Deliverables:

- PayPal JavaScript checkout
- Server create and capture routes
- Verified webhook reconciliation
- Refund and reversal handling

Pass when:

- A valid capture grants the configured credits exactly once.
- Browser price or currency tampering fails.
- Duplicate capture calls and webhooks are harmless.
- Invalid webhook signatures change no financial state.
- A refund or reversal creates one matching ledger reversal.

### Slice 5: Generation

Deliverables:

- Durable worker
- Provider adapter
- Generate flow
- Private output library
- Automatic failure release

Pass when:

- A job survives browser refresh and process restart.
- Every job reaches a terminal state through normal or reconciliation paths.
- Success stores one authorized output and retains the debit.
- Failure without output releases credits exactly once.
- Cross-user job and asset access tests pass.

### Slice 6: Transform and repair

Deliverables:

- Source-photo consent
- Subject selection
- Source/output comparison
- Localized child repair jobs

Pass when:

- `toon-in-real-world` cannot be submitted with full-image scope.
- The source and output remain distinct immutable assets.
- A repair names one defect and links to its parent.
- Automated checks and human fixtures show no systematic background redraw.

### Slice 7: Beta readiness

Deliverables:

- Privacy, terms, acceptable-use, and refund pages
- Account and asset deletion
- Admin support and moderation tools
- Metrics, alerts, and reconciliation jobs
- Accessibility audit
- Incident and refund runbooks

Pass when:

- All payment, ledger, privacy, security, and accessibility tests pass.
- No critical or high-severity security findings remain open.
- A sandbox-to-production PayPal checklist is signed off.
- Alerts exist for stuck jobs, webhook failures, and ledger mismatch.
- Beta limits, support channel, and stopping criteria are documented.

## 19. Observability and operations

Track structured events for:

- Account created, verified, suspended, and deleted
- Character created and versioned
- Job submitted, started, succeeded, failed, cancelled, and released
- Provider latency, usage, refusal, and normalized failure class
- PayPal order created, captured, refunded, reversed, and disputed
- Webhook received, verified, duplicated, processed, and failed
- Ledger grant, debit, release, reversal, and adjustment
- Asset created, accessed administratively, and deleted

Dashboards must expose:

- Stuck jobs by state and age
- Success and failure rate by job type and style
- Average measured provider cost per successful output
- Credits sold, spent, released, and reversed
- Captures without grants and grants without captures
- Webhook verification and processing failures
- Negative-balance and suspended accounts
- Storage growth and scheduled deletion backlog

Logs use internal IDs and normalized metadata. They do not include provider
credentials, private image bytes, full prompts containing unnecessary personal
data, or PayPal access tokens.

## 20. Reconciliation jobs

At least daily, the application verifies:

- Every captured PayPal order has exactly one matching purchase grant.
- Every purchase grant has one valid captured PayPal order or documented
  administrator source.
- Every terminal failed/cancelled job with a debit has one release.
- No successful job has a failure release.
- Cached balances equal ledger sums.
- Queued and running jobs older than their operational threshold are resolved or
  flagged.
- Expired source assets are deleted or have a documented retention hold.

Reconciliation reports differences; it does not silently rewrite history.

## 21. Open decisions

The following decisions block implementation or pricing:

1. Approve standalone deployment versus an ArcadeProfile route.
2. Approve the public name and domain.
3. Approve the 18+ general-audience content baseline.
4. Approve a United States-only initial sales region or define another region.
5. Approve 30-day source-photo retention.
6. Approve negative balance plus generation lock after payment reversal.
7. Select the initial provider model and quality setting after the cost spike.
8. Set credit-pack quantities and prices from measured unit economics.
9. Decide whether promotional credits expire.
10. Define customer-initiated partial refund policy.
11. Select the beta size and per-user generation limit.
12. Decide whether any identity provider beyond Google is required after MVP.

## 22. Stopping criteria

Planning stops when the product owner approves or changes the proposed decisions
and the specification has no unresolved contradiction between payment state,
credit state, job state, privacy, and deletion behavior.

Implementation stops at the end of each slice for verification. A slice is not
complete because its code exists; it is complete only when its stated pass
conditions have evidence.

## 23. References

- Furry Image Studio plugin contracts:
  `generate-character-image`, `transform-person-to-character`,
  `repair-furry-image`, `add-furry-character`, `add-furry-style`, and
  `record-eval-trace`
- [OpenAI GPT Image 2 model and supported endpoints](https://developers.openai.com/api/docs/models/gpt-image-2)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OpenID Connect API claims](https://developers.google.com/identity/openid-connect/reference)
- [Google OAuth security practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [PayPal Orders v2 integration](https://developer.paypal.com/api/rest/integration/orders-api/)
- [PayPal JavaScript SDK](https://developer.paypal.com/sdk/js/reference/)
- [PayPal webhook overview and verification](https://developer.paypal.com/api/rest/webhooks)
- Repository conventions in `AGENTS.md`, including route-group placement,
  migration requirements, npm-only tooling, and accessibility requirements

External API behavior must be rechecked against current official documentation
at implementation time.

## 24. Ratchet log

### Version 0.1 — 2026-07-30

- Established the standalone MVP boundary.
- Translated plugin identity, style, transformation, repair, and trace concepts
  into versioned web-application contracts.
- Defined immutable credit, PayPal, job, privacy, accessibility, and operational
  requirements.
- Added slice-level acceptance gates.
- Consistency pass removed an unused job state, aligned debit terminology, and
  distinguished infrastructure failure from subjective output dissatisfaction.
- Added closed-loop credit terms and tax/commercial review as production gates.
- Added Google OpenID Connect and email/password as linkable first-class
  authentication methods with shared sessions and explicit anti-takeover rules.
- Current best: this document.
- Next verification: product-owner decisions in Section 21.
