# Organization onboarding and dashboard APIs

## `zyntra-create-organization`
- JWT gateway verification enabled.
- Independently validates the JWT against Supabase Auth.
- Creates the organization and owner membership atomically through a service-role-only RPC.
- New organizations start in `pending` status and cannot create payment intents until activated by an authorized internal process.
- Slugs are validated server-side.

## `zyntra-org-dashboard`
- JWT gateway verification enabled.
- Validates the user session and membership in the requested organization.
- Calls a service-role-only dashboard RPC only after membership verification.
- Returns aggregate counts and organization status, not raw customer data or payment credentials.

Both APIs are read/write bounded and do not move money, enable providers, or activate organizations.
