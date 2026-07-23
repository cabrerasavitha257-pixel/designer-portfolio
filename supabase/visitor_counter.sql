create table if not exists public.site_metrics (
  id text primary key,
  visit_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_metrics (id, visit_count)
values ('main', 0)
on conflict (id) do nothing;

alter table public.site_metrics enable row level security;

drop policy if exists "Public can read site metrics" on public.site_metrics;
create policy "Public can read site metrics"
on public.site_metrics
for select
to anon, authenticated
using (id = 'main');

create or replace function public.increment_site_visit()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count bigint;
begin
  insert into public.site_metrics (id, visit_count, updated_at)
  values ('main', 1, now())
  on conflict (id) do update
    set visit_count = public.site_metrics.visit_count + 1,
        updated_at = now()
  returning visit_count into next_count;

  return next_count;
end;
$$;

revoke all on function public.increment_site_visit() from public;
grant execute on function public.increment_site_visit() to anon, authenticated;
grant select on public.site_metrics to anon, authenticated;
