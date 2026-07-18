create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key,
  data jsonb not null,
  image_path text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key,
  data jsonb not null,
  video_path text,
  poster_path text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_admins enable row level security;
alter table public.site_content enable row level security;
alter table public.projects enable row level security;
alter table public.videos enable row level security;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.portfolio_admins where user_id = (select auth.uid())
  );
$$;

drop policy if exists "Admins can read their role" on public.portfolio_admins;
create policy "Admins can read their role"
on public.portfolio_admins for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content"
on public.site_content for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage site content" on public.site_content;
create policy "Admins manage site content"
on public.site_content for all
to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects"
on public.projects for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage projects" on public.projects;
create policy "Admins manage projects"
on public.projects for all
to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

drop policy if exists "Public can read videos" on public.videos;
create policy "Public can read videos"
on public.videos for select
to anon, authenticated
using (true);

drop policy if exists "Admins manage videos" on public.videos;
create policy "Admins manage videos"
on public.videos for all
to authenticated
using ((select public.is_portfolio_admin()))
with check ((select public.is_portfolio_admin()));

grant select on public.site_content, public.projects, public.videos to anon, authenticated;
grant insert, update, delete on public.site_content, public.projects, public.videos to authenticated;
grant select on public.portfolio_admins to authenticated;
grant execute on function public.is_portfolio_admin() to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view portfolio media" on storage.objects;
create policy "Public can view portfolio media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'portfolio-media');

drop policy if exists "Admins upload portfolio media" on storage.objects;
create policy "Admins upload portfolio media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portfolio-media' and (select public.is_portfolio_admin()));

drop policy if exists "Admins update portfolio media" on storage.objects;
create policy "Admins update portfolio media"
on storage.objects for update
to authenticated
using (bucket_id = 'portfolio-media' and (select public.is_portfolio_admin()))
with check (bucket_id = 'portfolio-media' and (select public.is_portfolio_admin()));

drop policy if exists "Admins delete portfolio media" on storage.objects;
create policy "Admins delete portfolio media"
on storage.objects for delete
to authenticated
using (bucket_id = 'portfolio-media' and (select public.is_portfolio_admin()));

-- After creating the administrator in Authentication > Users, run:
-- insert into public.portfolio_admins (user_id)
-- select id from auth.users where email = 'your-admin-email@example.com';
