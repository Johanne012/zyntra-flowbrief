# Regional payment adapter status

The previous Chargily/DZD checkout Edge Function has been replaced with a disabled response and JWT gateway verification is enabled.

Reason:
- The connector is regional and DZD-specific.
- Merchant credentials and webhook test evidence were not available.
- ZYNTRA's global payment core is provider-neutral and this connector is not the canonical path.

Do not re-enable until merchant eligibility, exact webhook signature contract, idempotency/replay behavior, reconciliation, refunds, and end-to-end test-mode evidence are reviewed.
