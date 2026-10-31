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
