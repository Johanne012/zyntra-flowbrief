# Payment intent route binding

When a payment intent is created, ZYNTRA resolves an approved, enabled provider route for the organization's legal merchant country, requested asset, customer country, payment method, and amount bounds.

The selected route ID is stored on `zyntra_payment_intents.provider_route_id`. This is an auditable routing decision only. It does **not** mean that ZYNTRA has called the provider, created a provider-side payment session, collected funds, or received settlement.

The payment intent remains in the internal `created` state until a separately implemented, authenticated provider adapter and verified webhook lifecycle advance it. Provider activation remains subject to account approval, legal eligibility, route verification, and operational testing.

Idempotency conflict recovery reads the amount as text so integer atom precision is preserved across the full numeric range.
