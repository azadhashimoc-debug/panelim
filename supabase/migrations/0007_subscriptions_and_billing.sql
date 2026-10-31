begin;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies,
  plan_tier text not null default 'business' check (plan_tier in ('free', 'start', 'business', 'growth')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz not null default now() + interval '14 days',
  current_period_ends_at timestamptz not null default now() + interval '14 days',
  extra_branches integer not null default 0 check (extra_branches between 0 and 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies,
  amount_qepik bigint not null check (amount_qepik > 0),
  provider text not null default 'sandbox',
  provider_tx_id text not null unique,
  idempotency_key text not null unique,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
alter table public.payment_transactions enable row level security;

create policy subscriptions_read on public.subscriptions for select to authenticated
using (exists (
  select 1 from public.memberships m
  where m.company_id = subscriptions.company_id and m.user_id = auth.uid() and m.archived_at is null
));

create policy transactions_read on public.payment_transactions for select to authenticated
using (exists (
  select 1 from public.memberships m
  where m.company_id = payment_transactions.company_id and m.user_id = auth.uid() and m.role in ('owner', 'accountant') and m.archived_at is null
));

revoke all on public.subscriptions, public.payment_transactions from anon, authenticated;
grant select on public.subscriptions, public.payment_transactions to authenticated;
grant all on public.subscriptions, public.payment_transactions to service_role;

create or replace function public.get_subscription_status(p_company_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  sub public.subscriptions;
  v_active_employees int;
  v_active_branches int;
  v_max_employees int;
  v_max_branches int;
  v_effective_plan text;
  v_days_left int;
begin
  select * into sub from public.subscriptions where company_id = p_company_id;
  if not found then
    insert into public.subscriptions(company_id, plan_tier, status, trial_ends_at, current_period_ends_at)
    values (p_company_id, 'business', 'trialing', now() + interval '14 days', now() + interval '14 days')
    returning * into sub;
  end if;

  select count(*) into v_active_employees from public.memberships where company_id = p_company_id and archived_at is null;
  select count(*) into v_active_branches from public.branches where company_id = p_company_id and archived_at is null;

  if sub.status = 'trialing' and now() <= sub.trial_ends_at then
    v_effective_plan := 'business';
    v_days_left := greatest(0, ceil(extract(epoch from (sub.trial_ends_at - now())) / 86400));
  elsif sub.status = 'active' and now() <= sub.current_period_ends_at then
    v_effective_plan := sub.plan_tier;
    v_days_left := greatest(0, ceil(extract(epoch from (sub.current_period_ends_at - now())) / 86400));
  else
    v_effective_plan := 'free';
    v_days_left := 0;
  end if;

  case v_effective_plan
    when 'start' then
      v_max_employees := 10;
      v_max_branches := 1;
    when 'business' then
      v_max_employees := 25;
      v_max_branches := least(3, 2 + sub.extra_branches);
    when 'growth' then
      v_max_employees := 50;
      v_max_branches := 3;
    else
      v_max_employees := 3;
      v_max_branches := 1;
  end case;

  return jsonb_build_object(
    'plan_tier', sub.plan_tier,
    'effective_plan', v_effective_plan,
    'status', sub.status,
    'days_left', v_days_left,
    'extra_branches', sub.extra_branches,
    'active_employees', v_active_employees,
    'max_employees', v_max_employees,
    'active_branches', v_active_branches,
    'max_branches', v_max_branches,
    'is_limit_exceeded', (v_active_employees > v_max_employees or v_active_branches > v_max_branches)
  );
end $$;

create or replace function public.process_subscription_payment(
  p_idempotency_key text,
  p_provider_tx_id text,
  p_company_id uuid,
  p_plan text,
  p_amount_qepik bigint,
  p_extra_branches int default 0
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  tx public.payment_transactions;
  sub public.subscriptions;
  expected_price bigint;
begin
  if p_plan not in ('start', 'business', 'growth') or p_extra_branches not between 0 and 2 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into tx from public.payment_transactions where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('success', true, 'idempotent', true, 'transaction_id', tx.id);
  end if;

  case p_plan
    when 'start' then expected_price := 1500;
    when 'business' then expected_price := 2900 + (p_extra_branches * 500);
    when 'growth' then expected_price := 4900;
  end case;

  if p_amount_qepik <> expected_price then
    raise exception 'INVALID_AMOUNT';
  end if;

  insert into public.payment_transactions (
    company_id, amount_qepik, provider, provider_tx_id, idempotency_key, status
  )
  values (
    p_company_id, p_amount_qepik, 'sandbox', p_provider_tx_id, p_idempotency_key, 'completed'
  )
  returning * into tx;

  insert into public.subscriptions (
    company_id, plan_tier, status, current_period_ends_at, extra_branches, updated_at
  )
  values (
    p_company_id, p_plan, 'active', now() + interval '30 days', p_extra_branches, now()
  )
  on conflict (company_id)
  do update set
    plan_tier = excluded.plan_tier,
    status = 'active',
    current_period_ends_at = now() + interval '30 days',
    extra_branches = excluded.extra_branches,
    updated_at = now()
  returning * into sub;

  insert into public.audit_events (company_id, actor_id, action, entity_id, new_value, reason)
  values (
    p_company_id,
    '10000000-0000-4000-8000-000000000001',
    'subscription.activated',
    sub.id,
    jsonb_build_object('plan', p_plan, 'amount_qepik', p_amount_qepik, 'tx_id', tx.id),
    'Abunə ödənişi təsdiqləndi'
  );

  return jsonb_build_object('success', true, 'idempotent', false, 'transaction_id', tx.id);
end $$;

revoke all on function public.get_subscription_status(uuid), public.process_subscription_payment(text, text, uuid, text, bigint, int) from public, anon, authenticated;
grant execute on function public.get_subscription_status(uuid), public.process_subscription_payment(text, text, uuid, text, bigint, int) to service_role;

commit;
