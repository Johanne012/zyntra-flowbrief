# ZYNTRA Payment and Financial Operations

**Last verified:** 2026-11-11

## Current state

ZYNTRA does not currently offer a verified live payment method. No asset or provider in the platform catalogue is enabled. The public order form is an enquiry intake only.

Do not send money to any hard-coded wallet address or personal account. No BTC address is published as an active ZYNTRA payment destination.

## Internal payment intent

The authenticated `zyntra-create-payment-intent` Edge Function:
- Requires a valid Supabase JWT.
- Requires active organization membership with owner/admin/finance/operations role.
- Accepts only a server-enabled asset.
- Uses integer amount atoms and organization-scoped idempotency.
- Creates an internal intent only.

It does not create a checkout session, charge a card, move crypto, settle funds, or prove that assets are held.

## Provider domains

- Fiat card/bank/local methods: separate PSP/acquirer relationships and provider-specific underwriting.
- Crypto/stablecoin: non-custodial protocol/wallet integrations with chain-specific confirmation and risk controls.
- FX: reference-rate and executable-quote services must be distinguished.
- Securities: separate regulated broker integration and eligibility checks.
- Settlement and reconciliation: must be independently recorded and matched to provider statements.

## Before enabling a provider

1. Verify legal entity, beneficial ownership and supported markets.
2. Complete provider underwriting and contractual onboarding.
3. Verify API and webhook signature specifications from official documentation.
4. Implement idempotency, replay prevention, retries, state-machine validation and refund handling.
5. Match amount, asset, network, provider reference and customer/order before posting.
6. Reconcile provider settlement reports to the internal ledger.
7. Test failure, duplicate, delayed, out-of-order and partial events.
8. Activate only after security and legal release gates pass.

## Prohibited shortcuts

- Never treat a customer redirect or submitted TxID as proof of payment.
- Never accept an amount or settlement asset directly from an untrusted browser.
- Never represent ledger balances as safeguarded customer funds.
- Never let an AI agent sign, transfer, withdraw or trade.
