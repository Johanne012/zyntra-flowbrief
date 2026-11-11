-- Seed only disabled global agent definitions. This creates no runtime, credentials, or tool grants.
insert into public.zyntra_ai_agents (
  organization_id, agent_key, display_name, purpose, status, policy_version,
  max_daily_runs, max_daily_cost_micro_usd, max_runtime_seconds,
  human_approval_required, allowed_data_classification, configuration
)
select null, v.agent_key, v.display_name, v.purpose, 'disabled', '2026-11-11.1',
       v.max_daily_runs, v.max_daily_cost_micro_usd, v.max_runtime_seconds,
       true, 'internal',
       jsonb_build_object(
         'execution_mode', 'registry_only',
         'allowed_actions', jsonb_build_array('research','draft','classify','recommend'),
         'external_writes', false,
         'financial_execution', false
       )
from (values
  ('marketing', 'Marketing Research Agent', 'Research market segments and draft campaign concepts for human review.', 40, 2000000::bigint, 180),
  ('support', 'Customer Support Drafting Agent', 'Classify support requests and draft replies for staff review.', 60, 2000000::bigint, 120),
  ('research', 'Research and Development Agent', 'Compare technical options, summarize evidence, and draft implementation proposals.', 30, 3000000::bigint, 240),
  ('profit', 'Profit Analytics Agent', 'Analyze aggregate operational metrics and draft profitability insights without initiating financial actions.', 30, 3000000::bigint, 180)
) as v(agent_key,display_name,purpose,max_daily_runs,max_daily_cost_micro_usd,max_runtime_seconds)
where not exists (
  select 1 from public.zyntra_ai_agents a
  where a.organization_id is null and a.agent_key = v.agent_key
);
