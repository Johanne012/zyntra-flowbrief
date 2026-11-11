alter table public.zyntra_payment_intents
  add column if not exists created_by uuid references auth.users(id) on delete set null;
create index if not exists zyntra_payment_intents_created_by_idx
  on public.zyntra_payment_intents(created_by);
