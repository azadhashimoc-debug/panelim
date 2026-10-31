begin;

create table public.employment_terms (
  membership_id uuid primary key,
  company_id uuid not null references public.companies,
  started_on date not null check (started_on <= current_date),
  pay_type text not null check (pay_type in ('monthly','hourly')),
  base_pay_qepik bigint not null check (base_pay_qepik >= 0),
  payday_day integer not null check (payday_day between 1 and 28),
  updated_at timestamptz not null default now(),
  foreign key (membership_id, company_id) references public.memberships(id, company_id)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies,
  membership_id uuid not null,
  request_type text not null check (request_type in ('leave','permission')),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on and ends_on <= starts_on + 366),
  reason text not null check (length(trim(reason)) between 3 and 1000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references auth.users,
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  foreign key (membership_id, company_id) references public.memberships(id, company_id),
  check ((status = 'pending' and decided_by is null and decided_at is null) or (status <> 'pending' and decided_by is not null and decided_at is not null and length(trim(decision_reason)) >= 3))
);
create index leave_requests_member_history on public.leave_requests(membership_id, created_at desc);

alter table public.employment_terms enable row level security;
alter table public.leave_requests enable row level security;
create policy employment_terms_read on public.employment_terms for select to authenticated using(public.can_read_member(membership_id));
create policy leave_requests_read on public.leave_requests for select to authenticated using(public.can_read_member(membership_id));
revoke all on public.employment_terms, public.leave_requests from anon, authenticated;
grant select on public.employment_terms, public.leave_requests to authenticated;
grant all on public.employment_terms, public.leave_requests to service_role;

create function public.request_leave(p_actor uuid, p_type text, p_start date, p_end date, p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare m public.memberships; result_id uuid;
begin
  if p_type not in ('leave','permission') or p_start is null or p_end is null or p_start < current_date or p_end < p_start or p_end > p_start + 366 or p_reason is null or length(trim(p_reason)) not between 3 and 1000 then raise exception 'INVALID_INPUT'; end if;
  select * into m from public.memberships where user_id = p_actor and archived_at is null order by id limit 1 for update;
  if not found then raise exception 'FORBIDDEN'; end if;
  if exists(select 1 from public.leave_requests where membership_id = m.id and status = 'pending' and daterange(starts_on, ends_on, '[]') && daterange(p_start, p_end, '[]')) then raise exception 'DUPLICATE_REQUEST'; end if;
  insert into public.leave_requests(company_id,membership_id,request_type,starts_on,ends_on,reason) values(m.company_id,m.id,p_type,p_start,p_end,trim(p_reason)) returning id into result_id;
  return result_id;
end $$;
revoke all on function public.request_leave(uuid,text,date,date,text) from public, anon, authenticated;
grant execute on function public.request_leave(uuid,text,date,date,text) to service_role;
commit;
