# Payment Intent API

Edge Function: `zyntra-create-payment-intent`

- Requires a valid Supabase JWT (gateway verification enabled) and independently resolves the user via Auth.
- Only active organizations and members with owner/admin/finance/operations roles may create intents.
- Only enabled assets are accepted; the function never trusts a client-supplied asset UUID.
- Amount is an integer decimal string in the asset's smallest unit; no floating-point values.
- Organization-scoped idempotency key prevents duplicate intent creation.
- This function creates an internal payment intent only. It does not charge, settle, custody, transfer, sign or trade anything.
- No provider adapter is invoked here; a separate orchestrator will select an eligible provider after capability checks and quote approval.

Required Edge Function environment variables: `SUPABASE_URL`, publishable/anon key and secret/service-role key. Supabase-managed defaults are read first, with legacy env names as fallbacks.
