# ZYNTRA Order Lifecycle — Implementation Specification

**Status:** Design approved for implementation planning; not deployed.  
**Evidence source:** Current Supabase schema and the deployed `zyntra-admin-orders` Edge Function inspected on 2026-11-11.

## Current verified state

- `public.zyntra_orders` exists and currently contains **0 rows**.
- `order_status` is text constrained to: `received`, `reviewing`, `awaiting_payment`, `paid`, `in_progress`, `delivered`, `cancelled`.
- `payment_status` is text constrained to: `not_submitted`, `submitted_unverified`, `verified`, `rejected`.
- The table currently has no order-audit/event table and no triggers attached to it.
- The current `zyntra-admin-orders` function is a read-only inbox. It verifies the user through Supabase Auth and requires `app_metadata.zyntra_platform_admin === true`.
- The public order-intake function is intentionally unauthenticated at the user-session layer; it uses a public-key check, bounded payload, rate limit RPC and server-side insert. Preserve this separation.

## Proposed order state graph

Only the following transitions should be considered for the first controlled workflow:

| From | To | Required condition |
|---|---|---|
| received | reviewing | Admin claims/reviews the order |
| received | cancelled | Admin cancellation reason required |
| reviewing | awaiting_payment | Scope/package and payable amount have been reviewed and recorded |
| reviewing | cancelled | Admin cancellation reason required |
| awaiting_payment | cancelled | No payment has been verified; reason required |
| paid | in_progress | Payment verification and order acceptance are independently evidenced |
| in_progress | delivered | Delivery evidence/reference and actor recorded |

Terminal states: `delivered` and `cancelled`.

**Important unresolved business invariant:** the present schema has no explicit `payment_required`, `payment_waived`, refund, or complimentary-order concept. Therefore do not implement a blanket rule that every `paid`/fulfillment state must have a verified payment until product policy defines how free, waived, refunded, and exceptional orders are represented. Never infer payment completion from a customer-supplied transaction ID.

## Proposed payment state graph

| From | To | Required condition |
|---|---|---|
| not_submitted | submitted_unverified | Customer supplies a reference; this is not proof of payment |
| submitted_unverified | verified | Server-side provider evidence or approved reconciliation confirms amount, currency, destination, reference and finality |
| submitted_unverified | rejected | Authorized reviewer records a reason |
| rejected | submitted_unverified | New reference submitted; retain prior audit event |

`verified` is terminal in the first version. Corrections/refunds require a separate governed workflow and must not rewrite history.

## Required audit design

Create an append-only order event record, written in the same database transaction as every accepted state change. Minimum fields:

- event UUID, order UUID and stable order number
- actor user UUID and actor role/source
- action/event type and request/correlation ID
- old/new order status and old/new payment status
- reason code plus bounded operator note
- timestamp assigned by the database
- evidence reference/hash where relevant (never raw secrets)

Do not duplicate customer contact details, payment secrets, full briefs or raw webhook payloads in the audit record. Keep the current order row as the operational snapshot and the event stream as the history.

Security requirements:
- No direct INSERT/UPDATE/DELETE grants for `anon` or ordinary `authenticated` users.
- Only a server-side privileged workflow can append events and change states.
- Revoke UPDATE/DELETE on the event table from application roles; add a trigger rejecting UPDATE/DELETE as defense in depth.
- Any SECURITY DEFINER routine must have a fixed `search_path`, narrow EXECUTE grants, explicit authorization checks, and a private/non-exposed schema where feasible.
- Authorization must use trusted `app_metadata`/server-verified claims, never user-editable `user_metadata`.
- Tenant and platform-admin scopes must be checked server-side on every request.

## Mutation API contract

Keep `zyntra-admin-orders` read-only. Add a separate state-transition endpoint only after the database transaction is ready.

Request should include:
- order ID
- expected current status (optimistic concurrency)
- requested next status
- reason code and bounded note
- idempotency key / request ID

The database operation must:
1. Lock the order row (`SELECT ... FOR UPDATE`).
2. Reject stale expected state and invalid transitions.
3. Verify actor authorization and any cross-state payment invariant.
4. Update the operational snapshot.
5. Append the audit event.
6. Commit both changes atomically.

Do not expose a generic PATCH endpoint over arbitrary order columns.

## Verification matrix

Required before deployment:
- unauthenticated request -> 401
- authenticated non-admin -> 403
- admin without required step-up/MFA (if enabled by policy) -> reject sensitive mutation
- invalid/terminal transition -> 409/422 without row or event mutation
- stale expected status -> 409
- duplicate idempotency key -> same logical result, no duplicate event
- tenant-crossing request -> 404/403 without data leakage
- customer-supplied TxID alone never changes payment status to verified
- direct app-role write to audit table -> denied
- UPDATE/DELETE audit event -> denied
- PII/secrets absent from logs and audit event payload
- atomic rollback leaves neither partial status update nor orphan event

Use transaction rollback or a non-production project for fixtures. Production currently has zero orders; do not leave test records there.

## Release sequence

1. Confirm package pricing, free/waived order policy, refund policy, cancellation cutoffs and actor roles.
2. Generate the migration using the Supabase CLI workflow; inspect the complete SQL before applying.
3. Add database contract tests and Edge Function tests to GitHub; CI must pass.
4. Validate on a non-production Supabase project or transaction-rollback harness.
5. Review advisors, grants, RLS, function ACLs, concurrency and rollback plan.
6. Deploy migration and function intentionally, then perform non-destructive smoke checks.
7. Keep the read-only inbox available until the mutation workflow passes all acceptance tests.

## Explicit non-actions

No migration was applied, no production function was replaced, no admin user was created, no order was inserted, and no payment was verified during this review.
