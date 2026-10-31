begin;

alter table public.audit_events alter column branch_id drop not null;

drop policy if exists audit_read on public.audit_events;
create policy audit_read on public.audit_events for select to authenticated
using(
  case
    when branch_id is not null then public.has_branch_access(auth.uid(), branch_id, true)
    else exists(select 1 from public.memberships m where m.company_id = audit_events.company_id and m.user_id = auth.uid() and m.role in ('owner', 'manager') and m.archived_at is null)
  end
);

create or replace function public.decide_leave(p_actor uuid, p_id uuid, p_decision text, p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  lr public.leave_requests;
  old_lr public.leave_requests;
  m_actor public.memberships;
  m_target public.memberships;
  b_id uuid;
begin
  select * into lr from public.leave_requests where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  
  select * into m_actor from public.memberships
  where user_id = p_actor and company_id = lr.company_id and role in ('owner', 'manager') and archived_at is null;
  if not found then raise exception 'FORBIDDEN'; end if;

  select * into m_target from public.memberships where id = lr.membership_id for update;
  if m_target.archived_at is not null then raise exception 'FORBIDDEN'; end if;

  if lr.status <> 'pending' then raise exception 'ALREADY_DECIDED'; end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') or p_reason is null or length(trim(p_reason)) not between 3 and 1000 then
    raise exception 'INVALID_INPUT';
  end if;

  old_lr := lr;
  update public.leave_requests
  set status = p_decision,
      decided_by = p_actor,
      decided_at = now(),
      decision_reason = trim(p_reason)
  where id = p_id
  returning * into lr;

  select branch_id into b_id from public.branch_assignments where membership_id = m_target.id limit 1;

  insert into public.audit_events(company_id, branch_id, actor_id, action, entity_id, old_value, new_value, reason)
  values(
    lr.company_id,
    b_id,
    p_actor,
    'leave.' || p_decision,
    p_id,
    to_jsonb(old_lr),
    to_jsonb(lr),
    trim(p_reason)
  );

  return p_id;
end $$;

revoke all on function public.decide_leave(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_leave(uuid, uuid, text, text) to service_role;

commit;
