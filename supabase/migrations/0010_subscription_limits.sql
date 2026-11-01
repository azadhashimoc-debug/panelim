begin;

-- Package suspension is reversible and is not employment archival.
alter table public.memberships add column plan_disabled_at timestamptz;
alter table public.branches add column plan_disabled_at timestamptz;

create or replace function public.get_subscription_status(p_company_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  sub public.subscriptions; previous jsonb; actor uuid;
  employees integer; branches integer; max_employees integer; max_branches integer;
  effective text; days integer := 0;
begin
  -- All capacity changes, expiry, selection and billing share this lock.
  perform 1 from public.companies where id=p_company_id for update;
  if not found then raise exception 'FORBIDDEN'; end if;
  insert into public.subscriptions(company_id) values(p_company_id) on conflict(company_id) do nothing;
  select * into sub from public.subscriptions where company_id=p_company_id for update;
  if (sub.status='trialing' and sub.trial_ends_at<=now())
    or (sub.plan_tier<>'free' and (sub.status in ('past_due','canceled')
      or (sub.status='active' and sub.current_period_ends_at<=now()))) then
    previous := to_jsonb(sub);
    update public.subscriptions set plan_tier='free',status='active',extra_branches=0,updated_at=now()
      where id=sub.id returning * into sub;
    select user_id into actor from public.memberships where company_id=p_company_id and role='owner' and archived_at is null order by id limit 1;
    if actor is not null then
      insert into public.audit_events(company_id,actor_id,action,entity_id,old_value,new_value,reason)
      values(p_company_id,actor,'subscription.expired',sub.id,previous,to_jsonb(sub),'Müddət bitdiyi üçün avtomatik Free keçidi');
    end if;
  end if;
  effective := case when sub.status='trialing' then 'business' when sub.status='active' then sub.plan_tier else 'free' end;
  if sub.status='trialing' then
    days := greatest(0,ceil(extract(epoch from(sub.trial_ends_at-now()))/86400));
  elsif effective<>'free' then
    days := greatest(0,ceil(extract(epoch from(sub.current_period_ends_at-now()))/86400));
  end if;
  max_employees := case effective when 'start' then 10 when 'business' then 25 when 'growth' then 50 else 3 end;
  max_branches := case effective when 'start' then least(3,1+sub.extra_branches) when 'business' then least(3,2+sub.extra_branches) when 'growth' then 3 else 1 end;
  select count(*) into employees from public.memberships where company_id=p_company_id and archived_at is null and plan_disabled_at is null;
  select count(*) into branches from public.branches where company_id=p_company_id and archived_at is null and plan_disabled_at is null;
  return jsonb_build_object('plan_tier',sub.plan_tier,'effective_plan',effective,'status',sub.status,
    'days_left',days,'extra_branches',sub.extra_branches,'active_employees',employees,'max_employees',max_employees,
    'active_branches',branches,'max_branches',max_branches,'is_limit_exceeded',employees>max_employees or branches>max_branches);
end $$;

create function public.enforce_subscription_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
declare s jsonb; activation boolean;
begin
  if TG_OP='UPDATE' and new.company_id<>old.company_id then raise exception 'FORBIDDEN'; end if;
  activation := new.archived_at is null and new.plan_disabled_at is null;
  if TG_OP='UPDATE' then activation := activation and (old.archived_at is not null or old.plan_disabled_at is not null); end if;
  if not activation then return new; end if;
  s := public.get_subscription_status(new.company_id);
  if TG_TABLE_NAME='memberships' and (s->>'active_employees')::integer >= (s->>'max_employees')::integer then
    raise exception 'EMPLOYEE_LIMIT_REACHED';
  elsif TG_TABLE_NAME='branches' and (s->>'active_branches')::integer >= (s->>'max_branches')::integer then
    raise exception 'BRANCH_LIMIT_REACHED';
  end if;
  if (s->>'is_limit_exceeded')::boolean then raise exception 'PLAN_SELECTION_REQUIRED'; end if;
  return new;
end $$;
create trigger memberships_capacity before insert or update on public.memberships for each row execute function public.enforce_subscription_capacity();
create trigger branches_capacity before insert or update on public.branches for each row execute function public.enforce_subscription_capacity();

create function public.assert_subscription_operation(p_actor uuid,p_company uuid,p_member uuid default null,p_branch uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare s jsonb;
begin
  if p_company is null then raise exception 'FORBIDDEN'; end if;
  -- Acquire the company lock before membership/attendance locks.
  s := public.get_subscription_status(p_company);
  if p_actor is not null and not exists(select 1 from public.memberships where company_id=p_company and user_id=p_actor and archived_at is null and plan_disabled_at is null) then raise exception 'FORBIDDEN'; end if;
  if p_member is not null and not exists(select 1 from public.memberships where id=p_member and company_id=p_company and archived_at is null and plan_disabled_at is null) then raise exception 'FORBIDDEN'; end if;
  if p_branch is not null and not exists(select 1 from public.branches where id=p_branch and company_id=p_company and archived_at is null and plan_disabled_at is null) then raise exception 'FORBIDDEN'; end if;
  if (s->>'is_limit_exceeded')::boolean then raise exception 'PLAN_SELECTION_REQUIRED'; end if;
end $$;

-- Protect service-role writes and future command implementations too.
create function public.guard_subscription_write() returns trigger
language plpgsql security definer set search_path='' as $$
declare row_data jsonb := to_jsonb(new);
begin
  perform public.assert_subscription_operation(
    coalesce((row_data->>'recorded_by')::uuid,(row_data->>'decided_by')::uuid,(row_data->>'closed_by')::uuid),
    new.company_id,(row_data->>'membership_id')::uuid,(row_data->>'branch_id')::uuid);
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['attendance','corrections','leave_requests','shifts','salary_advances','payroll_periods','employment_terms','branch_assignments'] loop
    execute format('create trigger subscription_write before insert or update on public.%I for each row execute function public.guard_subscription_write()',t);
  end loop;
end $$;

-- Retain existing business logic and API signatures, adding checks before row locks.
do $$
declare command record; identity_args text;
begin
  for command in select * from (values
    ('record_attendance','p_actor uuid,p_branch uuid,p_direction text','p_actor,p_branch,p_direction', '(select company_id from public.branches where id=p_branch)','null','p_branch'),
    ('request_correction','p_actor uuid,p_branch uuid,p_attendance uuid,p_in timestamptz,p_out timestamptz,p_reason text','p_actor,p_branch,p_attendance,p_in,p_out,p_reason','(select company_id from public.branches where id=p_branch)','null','p_branch'),
    ('decide_correction','p_actor uuid,p_id uuid,p_decision text,p_reason text','p_actor,p_id,p_decision,p_reason','(select company_id from public.corrections where id=p_id)','(select membership_id from public.corrections where id=p_id)','(select branch_id from public.corrections where id=p_id)'),
    ('request_leave','p_actor uuid,p_type text,p_start date,p_end date,p_reason text','p_actor,p_type,p_start,p_end,p_reason','(select company_id from public.memberships where user_id=p_actor and archived_at is null order by id limit 1)','null','null'),
    ('decide_leave','p_actor uuid,p_id uuid,p_decision text,p_reason text','p_actor,p_id,p_decision,p_reason','(select company_id from public.leave_requests where id=p_id)','(select membership_id from public.leave_requests where id=p_id)','null'),
    ('record_advance','p_actor uuid,p_membership uuid,p_amount_qepik bigint,p_date date,p_note text','p_actor,p_membership,p_amount_qepik,p_date,p_note','(select company_id from public.memberships where id=p_membership)','p_membership','null'),
    ('close_payroll_period','p_actor uuid,p_membership uuid,p_month text,p_overtime_qepik bigint default 0','p_actor,p_membership,p_month,p_overtime_qepik','(select company_id from public.memberships where id=p_membership)','p_membership','null')
  ) as commands(name,parameters,arguments,company,member,branch) loop
    select pg_get_function_identity_arguments(p.oid) into identity_args from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=command.name;
    execute format('alter function public.%I(%s) rename to %I',command.name,identity_args,command.name||'_before_limits');
    execute format('revoke all on function public.%I(%s) from public,anon,authenticated,service_role',command.name||'_before_limits',identity_args);
    execute format('create function public.%I(%s) returns uuid language plpgsql security definer set search_path='''' as $body$ begin perform public.assert_subscription_operation(p_actor,%s,%s,%s); return public.%I(%s); end $body$',command.name,command.parameters,command.company,command.member,command.branch,command.name||'_before_limits',command.arguments);
    execute format('revoke all on function public.%I(%s) from public,anon,authenticated',command.name,identity_args);
    execute format('grant execute on function public.%I(%s) to service_role',command.name,identity_args);
  end loop;
end $$;

create table public.subscription_selections (
  company_id uuid not null references public.companies,
  idempotency_key text not null check(length(trim(idempotency_key)) between 1 and 100),
  member_ids uuid[] not null, branch_id uuid not null, result jsonb not null,
  primary key(company_id,idempotency_key)
);
alter table public.subscription_selections enable row level security;
revoke all on public.subscription_selections from public,anon,authenticated;
grant all on public.subscription_selections to service_role;

create function public.complete_free_selection(p_actor uuid,p_company uuid,p_members uuid[],p_branch uuid,p_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; saved public.subscription_selections; previous jsonb; result jsonb; owner_member uuid;
begin
  perform 1 from public.companies where id=p_company for update;
  select id into owner_member from public.memberships where user_id=p_actor and company_id=p_company and role='owner' and archived_at is null and plan_disabled_at is null;
  if not found then raise exception 'FORBIDDEN'; end if;
  if p_key is null or length(trim(p_key)) not between 1 and 100 or p_members is null or cardinality(p_members) not between 1 and 3 or p_branch is null then raise exception 'INVALID_INPUT'; end if;
  select * into saved from public.subscription_selections where company_id=p_company and idempotency_key=p_key;
  if found then
    if not (saved.member_ids @> p_members and saved.member_ids <@ p_members and cardinality(saved.member_ids)=cardinality(p_members)) or saved.branch_id<>p_branch then raise exception 'INVALID_INPUT'; end if;
    return saved.result || jsonb_build_object('idempotent',true);
  end if;
  s := public.get_subscription_status(p_company);
  if s->>'effective_plan'<>'free' then raise exception 'INVALID_INPUT'; end if;
  if not(owner_member=any(p_members)) or cardinality(p_members)<>(select count(distinct x) from unnest(p_members) x)
    or cardinality(p_members)<>(select count(*) from public.memberships where id=any(p_members) and company_id=p_company and archived_at is null and plan_disabled_at is null)
    or not exists(select 1 from public.branches where id=p_branch and company_id=p_company and archived_at is null and plan_disabled_at is null)
    then raise exception 'INVALID_INPUT'; end if;
  previous := jsonb_build_object(
    'members',(select jsonb_agg(to_jsonb(m)) from public.memberships m where company_id=p_company and archived_at is null and plan_disabled_at is null),
    'branches',(select jsonb_agg(to_jsonb(b)) from public.branches b where company_id=p_company and archived_at is null and plan_disabled_at is null));
  update public.memberships set plan_disabled_at=now() where company_id=p_company and archived_at is null and plan_disabled_at is null and not(id=any(p_members));
  update public.branches set plan_disabled_at=now() where company_id=p_company and archived_at is null and plan_disabled_at is null and id<>p_branch;
  -- Preserve old assignments for history and ensure retained staff can clock in.
  insert into public.branch_assignments(membership_id,branch_id,company_id)
    select x,p_branch,p_company from unnest(p_members) x on conflict do nothing;
  result := jsonb_build_object('success',true,'idempotent',false);
  insert into public.audit_events(company_id,actor_id,action,entity_id,old_value,new_value,reason)
    values(p_company,p_actor,'subscription.selection',p_company,previous,jsonb_build_object('members',p_members,'branch',p_branch),'Free paketində aktiv heyət və filial seçildi');
  insert into public.subscription_selections values(p_company,p_key,p_members,p_branch,result);
  return result;
end $$;

-- Capacity checks initialize subscriptions lazily. Registration now creates the
-- trial before branch/member/assignment writes instead of inserting it twice.
create or replace function public.register_company(
  p_user_id uuid,p_display_name text,p_company_name text,p_branch_name text default 'Baş Filial',
  p_latitude double precision default 40.3756,p_longitude double precision default 49.8465,p_radius_m int default 100
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_company_id uuid; v_branch_id uuid; v_membership_id uuid;
  v_clean_display text := trim(p_display_name); v_clean_company text := trim(p_company_name);
  v_clean_branch text := trim(coalesce(nullif(p_branch_name,''),'Baş Filial'));
begin
  if length(v_clean_display)<2 or length(v_clean_company)<2 then raise exception 'INVALID_INPUT'; end if;
  if exists(select 1 from public.memberships where user_id=p_user_id and archived_at is null) then raise exception 'ALREADY_EXISTS'; end if;
  insert into public.companies(name) values(v_clean_company) returning id into v_company_id;
  insert into public.subscriptions(company_id) values(v_company_id);
  insert into public.branches(company_id,name,latitude,longitude,radius_m)
    values(v_company_id,v_clean_branch,coalesce(p_latitude,40.3756),coalesce(p_longitude,49.8465),coalesce(p_radius_m,100)) returning id into v_branch_id;
  insert into public.memberships(company_id,user_id,display_name,role)
    values(v_company_id,p_user_id,v_clean_display,'owner') returning id into v_membership_id;
  insert into public.branch_assignments values(v_membership_id,v_branch_id,v_company_id);
  insert into public.audit_events(company_id,branch_id,actor_id,action,entity_id,new_value,reason)
    values(v_company_id,v_branch_id,p_user_id,'company_registered',v_company_id,
      jsonb_build_object('company_name',v_clean_company,'branch_name',v_clean_branch,'owner_name',v_clean_display,'plan','business','trial_days',14),
      'Yeni şirkət qeydiyyatı və 14 günlük sınaq başlandı');
  return jsonb_build_object('success',true,'company_id',v_company_id,'branch_id',v_branch_id,'membership_id',v_membership_id);
end $$;

create or replace function public.register_company(
  p_user_id uuid,
  p_display_name text,
  p_company_name text,
  p_branch_name text default 'Baş Filial',
  p_latitude double precision default 40.3756,
  p_longitude double precision default 49.8465,
  p_radius_m int default 100
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_company_id uuid;
  v_branch_id uuid;
  v_membership_id uuid;
  v_clean_display text;
  v_clean_company text;
  v_clean_branch text;
begin
  v_clean_display := trim(p_display_name);
  v_clean_company := trim(p_company_name);
  v_clean_branch := trim(coalesce(nullif(p_branch_name, ''), 'Baş Filial'));

  if length(v_clean_display) < 2 or length(v_clean_company) < 2 then
    raise exception 'INVALID_INPUT';
  end if;

  if exists (select 1 from public.memberships where user_id = p_user_id and archived_at is null) then
    raise exception 'ALREADY_EXISTS';
  end if;

  insert into public.companies (name)
  values (v_clean_company)
  returning id into v_company_id;

  insert into public.branches (company_id, name, latitude, longitude, radius_m)
  values (v_company_id, v_clean_branch, coalesce(p_latitude, 40.3756), coalesce(p_longitude, 49.8465), coalesce(p_radius_m, 100))
  returning id into v_branch_id;

  insert into public.memberships (company_id, user_id, display_name, role)
  values (v_company_id, p_user_id, v_clean_display, 'owner')
  returning id into v_membership_id;

  insert into public.branch_assignments (membership_id, branch_id, company_id)
  values (v_membership_id, v_branch_id, v_company_id);

  insert into public.subscriptions (
    company_id, plan_tier, status, trial_ends_at, current_period_ends_at, extra_branches
  )
  values (
    v_company_id, 'business', 'trialing', now() + interval '14 days', now() + interval '14 days', 0
  )
  on conflict (company_id) do update set
    plan_tier = 'business',
    status = 'trialing',
    trial_ends_at = now() + interval '14 days',
    current_period_ends_at = now() + interval '14 days',
    extra_branches = 0;

  insert into public.audit_events (
    company_id, branch_id, actor_id, action, entity_id, new_value, reason
  )
  values (
    v_company_id, v_branch_id, p_user_id, 'company_registered', v_company_id,
    jsonb_build_object(
      'company_name', v_clean_company,
      'branch_name', v_clean_branch,
      'owner_name', v_clean_display,
      'plan', 'business',
      'trial_days', 14
    ),
    'Yeni şirkət qeydiyyatı və 14 günlük sınaq başlandı'
  );

  return jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'branch_id', v_branch_id,
    'membership_id', v_membership_id
  );
end $$;

revoke all on function public.register_company from public, anon, authenticated;
grant execute on function public.register_company to service_role;

revoke all on function public.get_subscription_status(uuid), public.enforce_subscription_capacity(),public.guard_subscription_write(),public.assert_subscription_operation(uuid,uuid,uuid,uuid),public.complete_free_selection(uuid,uuid,uuid[],uuid,text) from public,anon,authenticated;
grant execute on function public.get_subscription_status(uuid),public.complete_free_selection(uuid,uuid,uuid[],uuid,text) to service_role;

commit;
