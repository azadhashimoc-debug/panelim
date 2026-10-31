begin;

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

  -- 1. Create company
  insert into public.companies (name)
  values (v_clean_company)
  returning id into v_company_id;

  -- 2. Create primary branch
  insert into public.branches (company_id, name, latitude, longitude, radius_m)
  values (v_company_id, v_clean_branch, coalesce(p_latitude, 40.3756), coalesce(p_longitude, 49.8465), coalesce(p_radius_m, 100))
  returning id into v_branch_id;

  -- 3. Create owner membership
  insert into public.memberships (company_id, user_id, display_name, role)
  values (v_company_id, p_user_id, v_clean_display, 'owner')
  returning id into v_membership_id;

  -- 4. Assign owner to primary branch
  insert into public.branch_assignments (membership_id, branch_id, company_id)
  values (v_membership_id, v_branch_id, v_company_id);

  -- 5. Initialize 14-day Business trial subscription
  insert into public.subscriptions (
    company_id, plan_tier, status, trial_ends_at, current_period_ends_at, extra_branches
  )
  values (
    v_company_id, 'business', 'trialing', now() + interval '14 days', now() + interval '14 days', 0
  );

  -- 6. Log audit event
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

grant execute on function public.register_company to authenticated, service_role;

commit;
