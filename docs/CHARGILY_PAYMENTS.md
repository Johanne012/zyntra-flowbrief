# ZYNTRA — Chargily Pay integration

## Provider decision
Stripe is not an available onboarding route for an Algeria-registered business according to Stripe's published country availability. ZYNTRA uses Chargily Pay as the local gateway for CIB and EDAHABIA. The JavaScript SDK is MIT-licensed; this integration uses the documented REST API directly from a Supabase Edge Function.

## Architecture
- Customer submits an order using `order.html`.
- Staff reviews the order and sets `payment_amount_dzd` and `order_status='awaiting_payment'` in the protected Supabase table.
- Customer presses the Chargily payment button. The Edge Function reads the server-approved amount from the order row; the browser cannot set or change the amount.
- Checkout is created server-side and the customer is redirected to Chargily's hosted checkout.
- `/webhook` verifies the HMAC-SHA256 signature over the raw request body, checks mode, currency, amount, order metadata and checkout ID, then marks payment as verified.
- The success/return page is informational only. It never marks an order as paid.

## Required Supabase Edge Function secrets
Set these in Supabase Dashboard → Edge Functions → Secrets:
- `CHARGILY_API_SECRET_KEY`: API secret from the ZYNTRA application in Chargily Pay.
- `CHARGILY_MODE`: `test` first; change to `live` only after Chargily approves the merchant and the test checklist passes.
- `ZYNTRA_PUBLIC_URL`: canonical site URL (for example `https://zyntra-flowbrief.vercel.app`).

Supabase's built-in `SUPABASE_URL` and `SUPABASE_SECRET_KEYS` are used by the function. Never place the Chargily secret key in GitHub, browser code, or chat.

## Chargily dashboard setup
1. Create/verify the merchant account and application at https://pay.chargily.com.
2. Complete the business verification requested by Chargily.
3. Create a **test** API secret key.
4. Set the Supabase secrets above with `CHARGILY_MODE=test`.
5. Register this webhook URL in the Chargily Developers Corner:
   `https://ijbmdftluptwnglryaqx.supabase.co/functions/v1/zyntra-chargily-payments/webhook`
6. Use the same test application and test secret for checkout and webhook signatures.
7. Run a test payment and verify the order row before considering Live mode.

## Staff approval of an order amount
The payment endpoint accepts only an order number. It never accepts an amount from the customer.
For an approved order, an authorized operator must set:
```sql
update public.zyntra_orders
set payment_amount_dzd = 5000, order_status = 'awaiting_payment'
where order_number = 'ZYN-XXXXXXXXXX';
```
Replace the example amount with the actual agreed amount in DZD. Do not run the example unchanged.

## Endpoints
- Create checkout: POST `/functions/v1/zyntra-chargily-payments` with `{"order_number":"ZYN-..."}`, public Supabase apikey header.
- Webhook: POST `/functions/v1/zyntra-chargily-payments/webhook`, signature header required, raw-body HMAC-SHA256.
- Customer return: `/payment-result.html`; this is not payment confirmation.

## Release status
The schema and code are prepared. Live acceptance is not enabled until the merchant's test/live API keys are provisioned and the signed webhook is verified end-to-end. Do not claim a payment is received from a redirect alone.
