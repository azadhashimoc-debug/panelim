begin;

create table public.salary_advances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies,
  membership_id uuid not null,
  amount_qepik bigint not null check (amount_qepik > 0),
  issued_on date not null check (issued_on <= current_date + 31),
  recorded_by uuid not null references auth.users,
  note text check (note is null or length(trim(note)) <= 500),
  created_at timestamptz not null default now(),
  foreign key (membership_id, company_id) references public.memberships(id, company_id)
);
create index salary_advances_member_idx on public.salary_advances(membership_id, issued_on desc);

create table public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies,
  membership_id uuid not null,
  period_month text not null check (period_month ~ '^\d{4}-\d{2}$'),
  base_pay_qepik bigint not null check (base_pay_qepik >= 0),
  overtime_pay_qepik bigint not null default 0 check (overtime_pay_qepik >= 0),
  advances_qepik bigint not null default 0 check (advances_qepik >= 0),
  net_pay_qepik bigint not null check (net_pay_qepik >= 0),
  status text not null default 'draft' check (status in ('draft', 'closed')),
  closed_by uuid references auth.users,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (membership_id, company_id) references public.memberships(id, company_id),
  unique (membership_id, period_month)
);
create index payroll_periods_company_idx on public.payroll_periods(company_id, period_month);

alter table public.salary_advances enable row level security;
alter table public.payroll_periods enable row level security;

create policy salary_advances_read on public.salary_advances for select to authenticated
using (public.can_read_member(membership_id));

create policy payroll_periods_read on public.payroll_periods for select to authenticated
using (public.can_read_member(membership_id));

revoke all on public.salary_advances, public.payroll_periods from anon, authenticated;
grant select on public.salary_advances, public.payroll_periods to authenticated;
grant all on public.salary_advances, public.payroll_periods to service_role;

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

create or replace function public.close_payroll_period(
  p_actor uuid,
  p_membership uuid,
  p_month text,
  p_overtime_qepik bigint default 0
)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  m_actor public.memberships;
  m_target public.memberships;
  terms public.employment_terms;
  total_advances bigint;
  calculated_base bigint;
  net_pay bigint;
  result_id uuid;
  period public.payroll_periods;
begin
  if p_month is null or p_month !~ '^\d{4}-\d{2}$' or p_overtime_qepik < 0 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into m_target from public.memberships where id = p_membership for update;
  if not found or m_target.archived_at is not null then
    raise exception 'FORBIDDEN';
  end if;

  select * into m_actor from public.memberships
  where user_id = p_actor and company_id = m_target.company_id and role in ('owner', 'accountant') and archived_at is null;
  if not found then
    raise exception 'FORBIDDEN';
  end if;

  select * into terms from public.employment_terms where membership_id = m_target.id;
  if not found then
    raise exception 'TERMS_NOT_SET';
  end if;

  select * into period from public.payroll_periods where membership_id = m_target.id and period_month = p_month;
  if found and period.status = 'closed' then
    raise exception 'ALREADY_CLOSED';
  end if;

  select coalesce(sum(amount_qepik), 0) into total_advances
  from public.salary_advances
  where membership_id = m_target.id and to_char(issued_on, 'YYYY-MM') = p_month;

  calculated_base := terms.base_pay_qepik;
  net_pay := greatest(0, (calculated_base + coalesce(p_overtime_qepik, 0)) - total_advances);

  insert into public.payroll_periods (
    company_id, membership_id, period_month, base_pay_qepik, overtime_pay_qepik, advances_qepik, net_pay_qepik, status, closed_by, closed_at
  )
  values (
    m_target.company_id, m_target.id, p_month, calculated_base, coalesce(p_overtime_qepik, 0), total_advances, net_pay, 'closed', p_actor, now()
  )
  on conflict (membership_id, period_month)
  do update set
    base_pay_qepik = excluded.base_pay_qepik,
    overtime_pay_qepik = excluded.overtime_pay_qepik,
    advances_qepik = excluded.advances_qepik,
    net_pay_qepik = excluded.net_pay_qepik,
    status = 'closed',
    closed_by = excluded.closed_by,
    closed_at = excluded.closed_at
  returning id into result_id;

  insert into public.audit_events (company_id, actor_id, action, entity_id, new_value, reason)
  values (
    m_target.company_id,
    p_actor,
    'payroll.closed',
    result_id,
    jsonb_build_object('membership_id', m_target.id, 'period_month', p_month, 'net_pay_qepik', net_pay),
    'Aylıq maaş bağlandı'
  );

  return result_id;
end $$;

revoke all on function public.record_advance(uuid, uuid, bigint, date, text), public.close_payroll_period(uuid, uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.record_advance(uuid, uuid, bigint, date, text), public.close_payroll_period(uuid, uuid, text, bigint) to service_role;

commit;
