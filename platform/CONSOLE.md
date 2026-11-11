# ZYNTRA Console

Static console entry point: `/console/`.

## Authentication
- Uses Supabase Auth email/password endpoints.
- Requires a password of at least 12 characters in the UI.
- Access tokens remain in memory only and are cleared on page refresh/sign-out.
- No service-role or secret API key is shipped to the browser.
- The user must confirm email if the Supabase Auth project requires confirmation.

## Organization onboarding
- Calls the JWT-protected `zyntra-my-organizations`, `zyntra-create-organization` and `zyntra-org-dashboard` functions.
- New organizations start with `pending` status.
- Organization membership is checked server-side before dashboard data is returned.
- No browser access to platform tables is granted.

## Security
- Strict Content Security Policy and browser security headers are applied to the console routes.
- CORS allowlists only the ZYNTRA Vercel production host and the ZYNTRA v2 preview host family.
- The UI shows payment, ledger and provider modules as unavailable or foundational until enabled.
- No payment, payout, crypto signing or securities execution controls are exposed.

## Remaining
- Verify email delivery and signup settings in Supabase Auth.
- Add a staff approval interface and controlled organization activation.
- Add full bilingual localization and accessibility review.
- Add E2E browser tests after a dedicated test user and test organization are available.
