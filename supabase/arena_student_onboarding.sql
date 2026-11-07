create or replace function public.complete_arena_student_profile(p_grade_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_claims jsonb := auth.jwt();
  v_email text;
  v_full_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_grade_id is null or not exists (
    select 1 from public.grades where id = p_grade_id
  ) then
    raise exception 'Choose a valid grade';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = v_user_id
      and (is_teacher or is_platform_admin)
  ) then
    raise exception 'Student onboarding is not available for this account';
  end if;

  v_email := v_claims ->> 'email';
  v_full_name := coalesce(
    nullif(pg_catalog.btrim(v_claims -> 'user_metadata' ->> 'full_name'), ''),
    nullif(pg_catalog.split_part(coalesce(v_email, ''), '@', 1), ''),
    'طالب ilogia'
  );

  insert into public.profiles as current_profile (
    id,
    email,
    full_name,
    grade_id,
    is_active,
    is_platform_admin,
    is_teacher,
    role
  )
  values (
    v_user_id,
    v_email,
    v_full_name,
    p_grade_id,
    true,
    false,
    false,
    'user'
  )
  on conflict (id) do update
  set grade_id = excluded.grade_id,
      updated_at = pg_catalog.now()
  where not current_profile.is_teacher
    and not current_profile.is_platform_admin;

  if not found then
    raise exception 'Student onboarding is not available for this account';
  end if;
end;
$$;

revoke all on function public.complete_arena_student_profile(bigint) from public;
revoke all on function public.complete_arena_student_profile(bigint) from anon;
grant execute on function public.complete_arena_student_profile(bigint) to authenticated;

notify pgrst, 'reload schema';
