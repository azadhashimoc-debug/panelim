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
