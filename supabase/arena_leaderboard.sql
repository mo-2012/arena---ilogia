create or replace view public.arena_leaderboard
with (security_barrier = true)
as
select
  rank() over (order by ap.total_points desc, ap.level desc)::integer as rank,
  coalesce(nullif(btrim(pp.full_name), ''), 'طالب') as full_name,
  coalesce(nullif(btrim(g.name), ''), nullif(btrim(p.grade_level), ''), 'غير محدد') as grade_name,
  g.stage as grade_stage,
  ap.level,
  ap.total_points
from public.arena_points ap
join public.profiles p on p.id = ap.user_id
left join public.public_profiles pp on pp.id = ap.user_id
left join public.grades g on g.id = p.grade_id
where p.is_active
  and not coalesce(p.is_teacher, false)
  and not coalesce(p.is_platform_admin, false);

revoke all on public.arena_leaderboard from public;
grant select on public.arena_leaderboard to anon, authenticated;

notify pgrst, 'reload schema';
