# Provider route governance

Every payment route belongs to a specific ZYNTRA organization and is bound to:
- The merchant legal incorporation country.
- The customer country or a route-wide fallback.
- A provider, asset/network and payment method.
- Optional settlement asset and exact integer amount limits.
- A provider account reference, verification timestamp and approval state.

Routes default to `enabled=false` and `approval_status=pending`. The database rejects enabling a route unless it is approved, has a provider account reference and a verification timestamp. A route's merchant country must match the organization's incorporation country.

Payment-intent creation now requires:
1. An active organization and an authorized member.
2. An active asset.
3. A matching, enabled, approved provider route.
4. An enabled provider.
5. An amount within the route's exact integer min/max bounds.

No provider routes currently exist, and all providers/assets remain disabled. Therefore payment-intent creation correctly fails closed for every asset until an organization has an approved merchant route.

Provider API secrets must stay in Edge Function secrets or a dedicated secret manager, never in route rows or browser code.
