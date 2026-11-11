-- Cover foreign-key lookups used by AI governance and provider routing.
-- These indexes address Supabase advisor findings without changing access policy.
create index if not exists zyntra_ai_agent_runs_approval_id_idx
  on public.zyntra_ai_agent_runs (approval_id);
create index if not exists zyntra_ai_agent_runs_initiated_by_idx
  on public.zyntra_ai_agent_runs (initiated_by);
create index if not exists zyntra_ai_tool_grants_approved_by_idx
  on public.zyntra_ai_tool_grants (approved_by);
create index if not exists zyntra_provider_routes_asset_id_idx
  on public.zyntra_provider_routes (asset_id);
create index if not exists zyntra_provider_routes_settlement_asset_id_idx
  on public.zyntra_provider_routes (settlement_asset_id);
