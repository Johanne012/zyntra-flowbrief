# First Platform Administrator Bootstrap

## Status

Design and operational runbook only. No administrator has been created, no auth user has been promoted, and no endpoint or SQL function in this document is deployed.

## Security decision

Do not expose a public or authenticated Edge Function that accepts a user ID/email and sets `app_metadata.zyntra_platform_admin`. A caller-controlled bootstrap endpoint creates a privilege-escalation path. Do not use `user_metadata` for authorization.

The existing platform-admin checks use the trusted `app_metadata.zyntra_platform_admin === true` claim. Keep that authorization contract.

## Required bootstrap procedure

1. Create the intended owner account through the normal Supabase Auth invitation or signup flow, with MFA enabled before privileged access.
2. Verify the account's identity and mailbox through the normal Auth flow. Record the immutable Auth user UUID from the Auth dashboard; do not identify the account by an unverified email string at promotion time.
3. Confirm the project owner explicitly authorizes this exact UUID as the initial platform administrator. Record who approved it, when, and the reason in the organization's controlled change log.
4. An authorized project owner performs a one-time, out-of-band promotion using the Supabase Auth Admin API from a trusted administrative environment. Use the Admin API's update-user-by-ID operation to set only `app_metadata.zyntra_platform_admin: true`, preserving unrelated app metadata. Never put a service-role/secret key in browser code, this repository, an issue, or a chat.
5. Require the user to refresh/sign in again so the JWT contains the new trusted app-metadata claim.
6. Verify access with two negative/positive checks: the intended account can call a platform-admin read-only endpoint; a normal authenticated account receives 403. Verify unauthenticated access receives 401.
7. Record the promotion and the verification result in the controlled change log. Keep at least two independently controlled owner/admin recovery paths, protected by MFA.

## Revocation and recovery

- Revoke by setting the trusted app-metadata claim to false through the same out-of-band Auth Admin process.
- Revoke active sessions where strict immediate revocation is required; changing app metadata alone does not rewrite already-issued JWTs.
- Re-test that the former admin receives 403 after session refresh/revocation.
- Never provide a self-service route for privilege assignment or recovery.

## Operational controls

- Keep `zyntra-admin-orders` read-only and platform-admin-only.
- Keep PII out of logs and avoid copying customer records into tickets.
- Keep platform admin separate from organization membership roles.
- Require MFA and least-privilege access to the Supabase project itself.
- Rotate/review project secrets if they are ever exposed; never use a secret key as an application credential.
- Do not activate payment providers, ledger posting for real funds, or AI tool grants as part of administrator bootstrap.

## Acceptance checklist

- [ ] Intended Auth user UUID independently verified.
- [ ] Explicit project-owner authorization recorded.
- [ ] Promotion performed out-of-band by an authorized project owner.
- [ ] Trusted app metadata contains the exact boolean claim.
- [ ] Intended admin passes the read-only admin endpoint check.
- [ ] Ordinary authenticated user receives 403.
- [ ] Unauthenticated caller receives 401.
- [ ] MFA and recovery controls verified.
- [ ] Promotion event recorded without customer PII.

## Current ZYNTRA state

At the time this runbook was drafted, the project had zero Auth users. Therefore there is no eligible UUID to promote, and no promotion has been attempted. This document intentionally does not create an account, grant a role, or deploy a bootstrap mechanism.
