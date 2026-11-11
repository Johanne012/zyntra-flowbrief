# ZYNTRA Order Intake v1

## Current implementation

- Website form: `order.html`
- Supabase Edge Function: `zyntra-order-intake`
- Database table: `public.zyntra_orders`
- Rate-limit state: `private.zyntra_order_rate_limits`
- Rate-limit RPC: `public.check_zyntra_order_rate_limit(text)`

The Edge Function is deployed to project `ijbmdftluptwnglryaqx`. It uses the project's managed Supabase secret key in the function runtime; no service-role or secret key is stored in GitHub or Vercel. The browser sends only the publishable key, which is designed for public clients and is checked by the function.

## Request lifecycle

1. Browser submits JSON to `/functions/v1/zyntra-order-intake`.
2. Function checks origin, method, body size, publishable key, honeypot, and required fields.
3. A per-client hash is rate limited to five accepted attempts per 15 minutes.
4. Function inserts the order using a server-only secret key.
5. The customer receives a generated `ZYN-XXXXXXXXXX` order number.
6. If a TxID is supplied, its status remains `submitted_unverified`; it is never treated as proof of payment.
7. Optional email notifications can be enabled with Edge Function secrets: `RESEND_API_KEY`, `ORDER_NOTIFICATION_EMAIL`, and `EMAIL_FROM`.

## Security

- RLS is enabled on `public.zyntra_orders`.
- No anon/authenticated policies or table grants are provided. The service role/secret key is used only by the Edge Function.
- The rate-limit table is in the non-exposed `private` schema.
- The rate-limit RPC is executable only by `service_role`.
- Never put a Supabase secret/service-role key in browser code, GitHub, or Vercel client variables.
- A TxID is not automatically verified. Manual chain verification and reconciliation are still required before marking an order paid.
- The public endpoint has basic origin checking, a honeypot, and rate limiting. Add CAPTCHA/WAF before paid advertising or high traffic.

## Deployment and verification

- Function name: `zyntra-order-intake`
- Function URL: `https://ijbmdftluptwnglryaqx.supabase.co/functions/v1/zyntra-order-intake`
- JWT gateway verification is disabled for this public intake endpoint; the function performs its own publishable-key check and privileged operations use the managed secret key.
- Database migrations were applied and recorded in Supabase migration history:
  - `zyntra_orders_intake_v1`
  - `zyntra_order_intake_rate_limit`
  - `expose_service_only_order_rate_rpc`

## Remaining checks

- Deploy the website branch to a Vercel Preview and run end-to-end browser tests.
- Submit one controlled test order, verify the returned order number and row, then delete or mark the test record.
- Configure Resend only after verifying the sending domain and sender identity.
- Add an authenticated admin view before exposing order records to staff.
