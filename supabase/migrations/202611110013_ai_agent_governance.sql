create table if not exists public.zyntra_ai_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.zyntra_organizations(id) on delete cascade,
  agent_key text not null,
  display_name text not null,
  purpose text not null,
  model_provider text,
  model_name text,
  status text not null default 'disabled' check (status in ('draft','disabled','active','suspended')),
  policy_version text not null,
  max_daily_runs integer not null default 20 check (max_daily_runs between 1 and 10000),
  max_daily_cost_micro_usd bigint not null default 1000000 check (max_daily_cost_micro_usd between 0 and 1000000000000),
  max_runtime_seconds integer not null default 120 check (max_runtime_seconds between 1 and 3600),
  human_approval_required boolean not null default true,
  allowed_data_classification text not null default 'internal'
    check (allowed_data_classification in ('public','internal','confidential')),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,agent_key),
  check (status <> 'active' or human_approval_required)
);

create table if not exists public.zyntra_ai_tool_grants (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.zyntra_ai_agents(id) on delete cascade,
  tool_name text not null,
  permission text not null check (permission in ('read_only','draft','write_with_approval')),
  status text not null default 'pending' check (status in ('pending','approved','revoked')),
  requires_human_approval boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  constraints jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (agent_id,tool_name),
  check (tool_name !~* '(payment_charge|payment_refund|ledger_post|wallet_sign|wallet_transfer|withdraw|payout|broker_order|trade_execute|custody)'),
  check (permission <> 'write_with_approval' or requires_human_approval),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null))
);

create table if not exists public.zyntra_ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.zyntra_ai_agents(id),
  organization_id uuid references public.zyntra_organizations(id),
  initiated_by uuid references auth.users(id) on delete set null,
  task_type text not null,
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed','cancelled','requires_approval')),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text check (output_hash is null or output_hash ~ '^[0-9a-f]{64}$'),
  model_provider text,
  model_name text,
  input_tokens bigint not null default 0 check (input_tokens >= 0),
  output_tokens bigint not null default 0 check (output_tokens >= 0),
  cost_micro_usd bigint not null default 0 check (cost_micro_usd >= 0),
  tool_calls_count integer not null default 0 check (tool_calls_count >= 0),
  approval_id uuid references public.zyntra_approvals(id),
  failure_code text,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (completed_at is null or started_at is not null),
  check (status not in ('succeeded','failed','cancelled') or completed_at is not null)
);

create index if not exists zyntra_ai_agents_org_status_idx
  on public.zyntra_ai_agents(organization_id,status);
create index if not exists zyntra_ai_tool_grants_agent_status_idx
  on public.zyntra_ai_tool_grants(agent_id,status);
create index if not exists zyntra_ai_agent_runs_org_created_idx
  on public.zyntra_ai_agent_runs(organization_id,created_at desc);
create index if not exists zyntra_ai_agent_runs_agent_status_idx
  on public.zyntra_ai_agent_runs(agent_id,status,created_at desc);

alter table public.zyntra_ai_agents enable row level security;
alter table public.zyntra_ai_tool_grants enable row level security;
alter table public.zyntra_ai_agent_runs enable row level security;
revoke all on table public.zyntra_ai_agents,public.zyntra_ai_tool_grants,public.zyntra_ai_agent_runs from anon,authenticated;
grant all on table public.zyntra_ai_agents,public.zyntra_ai_tool_grants,public.zyntra_ai_agent_runs to service_role;

comment on table public.zyntra_ai_agents is 'Agent registry only. All agents default disabled; no credentials or secrets are stored here.';
comment on table public.zyntra_ai_tool_grants is 'Explicit per-agent tool grants. Financial execution/signing tools are blocked by constraint and runtime policy.';
comment on table public.zyntra_ai_agent_runs is 'Metadata and hashes only; do not store raw prompts, secrets, or restricted personal data.';
