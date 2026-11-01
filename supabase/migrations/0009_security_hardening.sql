begin;
revoke all on function public.register_company(uuid,text,text,text,double precision,double precision,integer) from public,anon,authenticated;
grant execute on function public.register_company(uuid,text,text,text,double precision,double precision,integer) to service_role;
drop function public.process_subscription_payment(text,text,uuid,text,bigint,integer);
create or replace function public.record_advance(
  p_actor uuid,
  p_membership uuid,
  p_amount_qepik bigint,
  p_date date,
  p_note text
)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  m_actor public.memberships;
  m_target public.memberships;
  result_id uuid;
begin
  if p_amount_qepik is null or p_amount_qepik <= 0 or p_date is null or p_date > current_date + 31 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into m_target from public.memberships where id = p_membership for update;
  if not found or m_target.archived_at is not null then
    raise exception 'FORBIDDEN';
  end if;

  select * into m_actor from public.memberships
  where user_id = p_actor and company_id = m_target.company_id and role in ('owner', 'manager', 'accountant') and archived_at is null;
  if not found then
    raise exception 'FORBIDDEN';
  end if;

  if m_actor.role = 'manager' and not exists (
    select 1 from public.branch_assignments a join public.branch_assignments b on b.branch_id=a.branch_id
    where a.membership_id=m_actor.id and b.membership_id=m_target.id
  ) then raise exception 'FORBIDDEN'; end if;
  insert into public.salary_advances (company_id, membership_id, amount_qepik, issued_on, recorded_by, note)
  values (m_target.company_id, m_target.id, p_amount_qepik, p_date, p_actor, nullif(trim(p_note), ''))
  returning id into result_id;

  insert into public.audit_events (company_id, actor_id, action, entity_id, new_value, reason)
  values (
    m_target.company_id,
    p_actor,
    'advance.recorded',
    result_id,
    jsonb_build_object('membership_id', m_target.id, 'amount_qepik', p_amount_qepik, 'issued_on', p_date),
    trim(p_note)
  );

  return result_id;
end $$;

create or replace function public.process_subscription_payment(
  p_idempotency_key text,
  p_provider_tx_id text,
  p_company_id uuid,
  p_plan text,
  p_amount_qepik bigint,
  p_extra_branches int default 0, p_actor uuid default null
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  tx public.payment_transactions;
  sub public.subscriptions;
  expected_price bigint;
begin
  if not exists(select 1 from public.memberships where user_id=p_actor and company_id=p_company_id and role='owner' and archived_at is null) then raise exception 'FORBIDDEN'; end if;
  perform 1 from public.companies where id=p_company_id for update;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) not between 1 and 100 then raise exception 'INVALID_INPUT'; end if;
  if (p_plan='business' and p_extra_branches > 1) or (p_plan='growth' and p_extra_branches <> 0) then raise exception 'INVALID_INPUT'; end if;
  if p_plan not in ('start', 'business', 'growth') or p_extra_branches not between 0 and 2 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into tx from public.payment_transactions where idempotency_key = p_idempotency_key;
  if found then
    if tx.company_id <> p_company_id or tx.amount_qepik <> p_amount_qepik then raise exception 'INVALID_INPUT'; end if;
    return jsonb_build_object('success', true, 'idempotent', true, 'transaction_id', tx.id);
  end if;

  case p_plan
    when 'start' then expected_price := 1500 + p_extra_branches * 500;
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
    p_actor,
    'subscription.activated',
    sub.id,
    jsonb_build_object('plan', p_plan, 'amount_qepik', p_amount_qepik, 'tx_id', tx.id),
    'Abunə ödənişi təsdiqləndi'
  );

  return jsonb_build_object('success', true, 'idempotent', false, 'transaction_id', tx.id);
end $$;

revoke all on function public.process_subscription_payment(text,text,uuid,text,bigint,integer,uuid) from public,anon,authenticated;
grant execute on function public.process_subscription_payment(text,text,uuid,text,bigint,integer,uuid) to service_role;
create table public.free_subscription_commands (
  company_id uuid not null references public.companies,
  idempotency_key text not null check(length(trim(idempotency_key)) between 1 and 100),
  result jsonb not null,
  primary key(company_id,idempotency_key)
);
alter table public.free_subscription_commands enable row level security;
revoke all on public.free_subscription_commands from public,anon,authenticated;
grant all on public.free_subscription_commands to service_role;
create function public.switch_to_free(p_actor uuid, p_company uuid, p_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sub public.subscriptions; previous jsonb; saved jsonb;
begin
  if not exists(select 1 from public.memberships where user_id=p_actor and company_id=p_company and role='owner' and archived_at is null) then raise exception 'FORBIDDEN'; end if;
  if p_key is null or length(trim(p_key)) not between 1 and 100 then raise exception 'INVALID_INPUT'; end if;
  perform 1 from public.companies where id=p_company for update;
  select result into saved from public.free_subscription_commands where company_id=p_company and idempotency_key=p_key;
  if found then return saved || jsonb_build_object('idempotent',true); end if;
  select * into sub from public.subscriptions where company_id=p_company for update;
  if not found then raise exception 'INVALID_INPUT'; end if;
  previous := to_jsonb(sub);
  if sub.plan_tier='free' and sub.status='active' then
    saved := jsonb_build_object('success',true,'transaction_id',sub.id,'idempotent',true);
    insert into public.free_subscription_commands values(p_company,p_key,saved);
    return saved;
  end if;
  update public.subscriptions set plan_tier='free', status='active',extra_branches=0,updated_at=now() where id=sub.id returning * into sub;
  insert into public.audit_events(company_id,actor_id,action,entity_id,old_value,new_value,reason)
  values(p_company,p_actor,'subscription.free',sub.id,previous,to_jsonb(sub),'Sahibin paket dəyişikliyi');
  saved := jsonb_build_object('success',true,'transaction_id',sub.id,'idempotent',false);
  insert into public.free_subscription_commands values(p_company,p_key,saved);
  return saved;
end $$;
revoke all on function public.switch_to_free(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.switch_to_free(uuid,uuid,text) to service_role;
commit;
