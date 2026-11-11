# Organization review and platform-admin boundary

- New organizations are created in `pending` status with an explicit pending approval record.
- The owner cannot approve their own organization.
- A server-only RPC enforces a separate approver, decision, reason and immutable audit event.
- The public Edge Function `zyntra-review-organization` requires a valid JWT and the server-managed `app_metadata.zyntra_platform_admin=true` claim.
- Users cannot set app_metadata through public signup.
- No platform administrator has been bootstrapped yet; do not grant this claim until the designated operator identity is verified through a trusted process.
