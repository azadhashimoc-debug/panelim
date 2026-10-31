-- Source: supabase/migrations/0001_identity_attendance.sql

begin;
create table public.companies (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 1 and 120), created_at timestamptz not null default now()
);
create table public.branches (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies,
  name text not null, latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180), radius_m integer not null check (radius_m between 20 and 500),
  archived_at timestamptz, unique(id, company_id)
);
create table public.memberships (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies,
  user_id uuid not null references auth.users, display_name text not null,
  role text not null check(role in ('owner','manager','employee','accountant')), archived_at timestamptz,
  unique(user_id, company_id), unique(id,company_id)
);
create table public.branch_assignments (
  membership_id uuid not null, branch_id uuid not null, company_id uuid not null,
  primary key(membership_id,branch_id),
  foreign key(membership_id,company_id) references public.memberships(id,company_id),
  foreign key(branch_id,company_id) references public.branches(id,company_id)
);
create table public.shifts (
  id uuid primary key default gen_random_uuid(), membership_id uuid not null, branch_id uuid not null, company_id uuid not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  check(ends_at>starts_at and ends_at<=starts_at+interval '36 hours'),
  foreign key(membership_id,company_id) references public.memberships(id,company_id),
  foreign key(branch_id,company_id) references public.branches(id,company_id),
  unique(id,membership_id,branch_id,company_id)
);
create table public.attendance (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, branch_id uuid not null, membership_id uuid not null,
  shift_id uuid, work_date date not null, check_in timestamptz not null, check_out timestamptz,
  source text not null default 'qr' check(source in ('qr','correction')), location_verified boolean not null default false,
  check(check_out is null or check_out>check_in),
  foreign key(membership_id,company_id) references public.memberships(id,company_id),
  foreign key(branch_id,company_id) references public.branches(id,company_id),
  foreign key(shift_id,membership_id,branch_id,company_id) references public.shifts(id,membership_id,branch_id,company_id),
  unique(id,membership_id,branch_id,company_id)
);
create unique index attendance_one_open on public.attendance(membership_id) where check_out is null;
create index attendance_history on public.attendance(membership_id,check_in desc);
create table public.corrections (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, branch_id uuid not null, membership_id uuid not null,
  attendance_id uuid, requested_in timestamptz not null, requested_out timestamptz, reason text not null check(length(trim(reason)) between 3 and 1000),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  decided_by uuid references auth.users, decided_at timestamptz, decision_reason text,
  created_at timestamptz not null default now(),
  check(requested_out is null or (requested_out>requested_in and requested_out<=requested_in+interval '36 hours')),
  foreign key(membership_id,company_id) references public.memberships(id,company_id),
  foreign key(branch_id,company_id) references public.branches(id,company_id),
  foreign key(attendance_id,membership_id,branch_id,company_id) references public.attendance(id,membership_id,branch_id,company_id),
  check((status='pending' and decided_by is null and decided_at is null) or (status<>'pending' and decided_by is not null and decided_at is not null and length(trim(decision_reason))>=3))
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies,
  branch_id uuid not null, actor_id uuid not null references auth.users, action text not null,
  entity_id uuid not null, old_value jsonb, new_value jsonb, reason text, created_at timestamptz not null default now(),
  foreign key(branch_id,company_id) references public.branches(id,company_id)
);
create table public.rate_limits (key text primary key, attempts integer not null, resets_at timestamptz not null);

-- Definer helpers avoid recursive membership RLS. All names are schema-qualified.
create function public.has_branch_access(p_actor uuid,p_branch uuid,p_manage boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships m join public.branches b on b.company_id=m.company_id
 where m.user_id=p_actor and m.archived_at is null and b.id=p_branch and b.archived_at is null
 and (m.role='owner' or (m.role in ('manager','employee') and (not p_manage or m.role='manager')
 and exists(select 1 from public.branch_assignments a where a.membership_id=m.id and a.branch_id=b.id))))
$$;
create function public.can_read_member(p_member uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships target join public.memberships actor on actor.company_id=target.company_id
 where target.id=p_member and actor.user_id=auth.uid() and actor.archived_at is null and
 (target.user_id=auth.uid() or actor.role='owner' or (actor.role='manager' and exists(
 select 1 from public.branch_assignments a join public.branch_assignments b on a.branch_id=b.branch_id
 where a.membership_id=actor.id and b.membership_id=target.id))))
$$;
create function public.can_read_attendance(p_member uuid,p_branch uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.has_branch_access(auth.uid(),p_branch,false) and
 (public.has_branch_access(auth.uid(),p_branch,true) or exists(select 1 from public.memberships where id=p_member and user_id=auth.uid() and archived_at is null))
$$;
revoke all on function public.has_branch_access(uuid,uuid,boolean),public.can_read_member(uuid),public.can_read_attendance(uuid,uuid) from public;
grant execute on function public.has_branch_access(uuid,uuid,boolean),public.can_read_member(uuid),public.can_read_attendance(uuid,uuid) to authenticated,service_role;

alter table public.companies enable row level security;
alter table public.branches enable row level security;
alter table public.memberships enable row level security;
alter table public.branch_assignments enable row level security;
alter table public.shifts enable row level security;
alter table public.attendance enable row level security;
alter table public.corrections enable row level security;
alter table public.audit_events enable row level security;
alter table public.rate_limits enable row level security;
create policy company_read on public.companies for select to authenticated using(exists(select 1 from public.memberships m where m.company_id=companies.id and m.user_id=auth.uid() and m.archived_at is null));
create policy branch_read on public.branches for select to authenticated using(public.has_branch_access(auth.uid(),id,false));
create policy member_read on public.memberships for select to authenticated using(public.can_read_member(id));
create policy assignment_read on public.branch_assignments for select to authenticated using(public.can_read_member(membership_id) and public.has_branch_access(auth.uid(),branch_id,false));
create policy shift_read on public.shifts for select to authenticated using(public.can_read_attendance(membership_id,branch_id));
create policy attendance_read on public.attendance for select to authenticated using(public.can_read_attendance(membership_id,branch_id));
create policy correction_read on public.corrections for select to authenticated using(public.can_read_attendance(membership_id,branch_id));
create policy audit_read on public.audit_events for select to authenticated using(public.has_branch_access(auth.uid(),branch_id,true));
revoke all on public.companies,public.branches,public.memberships,public.branch_assignments,public.shifts,public.attendance,public.corrections,public.audit_events,public.rate_limits from anon,authenticated;
grant select on public.companies,public.branches,public.memberships,public.branch_assignments,public.shifts,public.attendance,public.corrections,public.audit_events to authenticated;
grant all on public.companies,public.branches,public.memberships,public.branch_assignments,public.shifts,public.attendance,public.corrections,public.audit_events,public.rate_limits to service_role;
commit;


-- Source: supabase/migrations/0002_attendance_commands.sql

begin;
-- Only server-verified actors may reach these commands through the service role.
create function public.record_attendance(p_actor uuid,p_branch uuid,p_direction text)
returns uuid language plpgsql security definer set search_path='' as $$
declare m public.memberships; a public.attendance; s public.shifts; result_id uuid;
begin
 if not public.has_branch_access(p_actor,p_branch,false) then raise exception 'FORBIDDEN'; end if;
 select * into m from public.memberships where user_id=p_actor and archived_at is null
 and company_id=(select company_id from public.branches where id=p_branch) for update;
 if not found then raise exception 'FORBIDDEN'; end if;
 select * into a from public.attendance where membership_id=m.id and check_out is null for update;
 if p_direction='in' then
   if a.id is not null then raise exception 'ALREADY_CHECKED_IN'; end if;
   select * into s from public.shifts where membership_id=m.id and branch_id=p_branch
   and now() between starts_at-interval '4 hours' and ends_at
   order by abs(extract(epoch from(now()-starts_at))) limit 1;
   insert into public.attendance(company_id,branch_id,membership_id,shift_id,work_date,check_in,location_verified)
   values(m.company_id,p_branch,m.id,s.id,((coalesce(s.starts_at,now())) at time zone 'Asia/Baku')::date,now(),true) returning id into result_id;
 elsif p_direction='out' then
   if a.id is null then raise exception 'NOT_CHECKED_IN'; end if;
   if a.branch_id<>p_branch then raise exception 'FORBIDDEN'; end if;
   update public.attendance set check_out=now() where id=a.id returning id into result_id;
 else raise exception 'INVALID_INPUT';
 end if;
 insert into public.audit_events(company_id,branch_id,actor_id,action,entity_id,old_value,new_value)
 values(m.company_id,p_branch,p_actor,'attendance.'||p_direction,result_id,case when a.id is null then null else to_jsonb(a) end,
 (select to_jsonb(t) from public.attendance t where id=result_id));
 return result_id;
end $$;

create function public.consume_rate_limit(p_key text,p_limit integer,p_window integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare count_now integer;
begin
 if p_limit<1 or p_window<1 or p_window>86400 or length(p_key)>160 then raise exception 'INVALID_INPUT'; end if;
 insert into public.rate_limits as r(key,attempts,resets_at) values(p_key,1,now()+make_interval(secs=>p_window))
 on conflict(key) do update set attempts=case when r.resets_at<=now() then 1 else r.attempts+1 end,
 resets_at=case when r.resets_at<=now() then now()+make_interval(secs=>p_window) else r.resets_at end
 returning attempts into count_now;
 return count_now<=p_limit;
end $$;
revoke all on function public.record_attendance(uuid,uuid,text),public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.record_attendance(uuid,uuid,text),public.consume_rate_limit(text,integer,integer) to service_role;
commit;


-- Source: supabase/migrations/0003_attendance_corrections.sql

begin;
create function public.request_correction(p_actor uuid,p_branch uuid,p_attendance uuid,p_in timestamptz,p_out timestamptz,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare m public.memberships; result_id uuid;
begin
 if not public.has_branch_access(p_actor,p_branch,false) then raise exception 'FORBIDDEN'; end if;
 if p_in is null or p_in>now() or (p_out is not null and (p_out<=p_in or p_out>now() or p_out>p_in+interval '36 hours'))
 or p_reason is null or length(trim(p_reason)) not between 3 and 1000 then raise exception 'INVALID_INPUT'; end if;
 select * into m from public.memberships where user_id=p_actor and archived_at is null
 and company_id=(select company_id from public.branches where id=p_branch) for update;
 if not found then raise exception 'FORBIDDEN'; end if;
 if p_attendance is not null and not exists(select 1 from public.attendance where id=p_attendance and membership_id=m.id and branch_id=p_branch) then raise exception 'FORBIDDEN'; end if;
 if exists(select 1 from public.corrections where membership_id=m.id and status='pending' and
 ((p_attendance is not null and attendance_id=p_attendance) or (p_attendance is null and attendance_id is null and requested_in=p_in))) then raise exception 'DUPLICATE_REQUEST'; end if;
 insert into public.corrections(company_id,branch_id,membership_id,attendance_id,requested_in,requested_out,reason)
 values(m.company_id,p_branch,m.id,p_attendance,p_in,p_out,trim(p_reason)) returning id into result_id;
 insert into public.audit_events(company_id,branch_id,actor_id,action,entity_id,new_value,reason)
 values(m.company_id,p_branch,p_actor,'correction.requested',result_id,(select to_jsonb(c) from public.corrections c where id=result_id),trim(p_reason));
 return result_id;
end $$;

create function public.decide_correction(p_actor uuid,p_id uuid,p_decision text,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.corrections; old_c public.corrections; old_row public.attendance; result_id uuid; m public.memberships; s public.shifts;
begin
 select * into c from public.corrections where id=p_id;
 if not found or not public.has_branch_access(p_actor,c.branch_id,true) then raise exception 'FORBIDDEN'; end if;
 -- Membership lock serializes approvals with clock-in/out, including two missing-entry requests.
 select * into m from public.memberships where id=c.membership_id for update;
 if m.archived_at is not null then raise exception 'FORBIDDEN'; end if;
 select * into c from public.corrections where id=p_id for update;
 old_c:=c;
 if c.status<>'pending' then raise exception 'ALREADY_DECIDED'; end if;
 if p_decision is null or p_decision not in ('approved','rejected') or p_reason is null or length(trim(p_reason)) not between 3 and 1000 then raise exception 'INVALID_INPUT'; end if;
 if c.attendance_id is not null then select * into old_row from public.attendance where id=c.attendance_id for update; end if;
 result_id:=c.attendance_id;
 if p_decision='approved' then
   if exists(select 1 from public.attendance a where a.membership_id=c.membership_id
     and a.id is distinct from c.attendance_id and a.check_in<coalesce(c.requested_out,'infinity'::timestamptz)
     and coalesce(a.check_out,'infinity'::timestamptz)>c.requested_in) then raise exception 'OVERLAPPING_ATTENDANCE'; end if;
   if c.attendance_id is null then
     select * into s from public.shifts where membership_id=c.membership_id and branch_id=c.branch_id
     and c.requested_in between starts_at-interval '4 hours' and ends_at
     order by abs(extract(epoch from(c.requested_in-starts_at))) limit 1;
     insert into public.attendance(company_id,branch_id,membership_id,shift_id,work_date,check_in,check_out,source)
     values(c.company_id,c.branch_id,c.membership_id,s.id,(coalesce(s.starts_at,c.requested_in) at time zone 'Asia/Baku')::date,c.requested_in,c.requested_out,'correction') returning id into result_id;
   else
     update public.attendance set check_in=c.requested_in,check_out=c.requested_out,source='correction',location_verified=false,
     work_date=(coalesce((select starts_at from public.shifts where id=old_row.shift_id),c.requested_in) at time zone 'Asia/Baku')::date
     where id=c.attendance_id;
   end if;
 end if;
 update public.corrections set status=p_decision,decided_by=p_actor,decided_at=now(),decision_reason=trim(p_reason),attendance_id=coalesce(attendance_id,result_id) where id=p_id returning * into c;
 insert into public.audit_events(company_id,branch_id,actor_id,action,entity_id,old_value,new_value,reason)
 values(c.company_id,c.branch_id,p_actor,'correction.'||p_decision,p_id,
 jsonb_build_object('correction',to_jsonb(old_c),'attendance',case when old_row.id is null then null else to_jsonb(old_row) end),
 jsonb_build_object('correction',to_jsonb(c),'attendance',(select to_jsonb(a) from public.attendance a where id=result_id)),trim(p_reason));
 return p_id;
end $$;
revoke all on function public.request_correction(uuid,uuid,uuid,timestamptz,timestamptz,text),public.decide_correction(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.request_correction(uuid,uuid,uuid,timestamptz,timestamptz,text),public.decide_correction(uuid,uuid,text,text) to service_role;
commit;

