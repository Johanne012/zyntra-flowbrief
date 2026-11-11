import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Disabled by design. Re-enable only after provider eligibility, merchant setup,
// webhook contract verification, reconciliation and end-to-end tests are complete.
Deno.serve((_req: Request) => new Response(
  JSON.stringify({
    error: "This regional checkout adapter is disabled pending provider eligibility and end-to-end security validation.",
    code: "PROVIDER_ADAPTER_DISABLED",
  }),
  {
    status: 410,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  },
));
