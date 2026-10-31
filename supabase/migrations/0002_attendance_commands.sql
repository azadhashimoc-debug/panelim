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
