# ZYNTRA Order Intake

The public form submits enquiries to the Supabase Edge Function `zyntra-order-intake`.

## Security boundary
- Public endpoint performs origin, method, publishable-key, payload-size, honeypot and per-client rate-limit checks.
- It writes only an enquiry/order record using server-side credentials.
- No payment is initiated and no customer-supplied TxID is accepted by the current form.
- A request number is an acknowledgement of intake only, not acceptance, invoice, payment confirmation or contract.
- Staff-only order records remain inaccessible to browser roles.

## Operations
- Function: `zyntra-order-intake`
- Function JWT verification is disabled because this is a public enquiry form; the function implements its own publishable-key and origin checks.
- Notifications are optional and require server-side Resend configuration.
- CAPTCHA/WAF, an authenticated staff inbox, retention policy and abuse monitoring remain release tasks.
