create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  avatar_seed bigint not null,
  content text not null check (char_length(content) between 1 and 500),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.feedback_messages enable row level security;

drop policy if exists "Anyone can submit private feedback" on public.feedback_messages;
create policy "Anyone can submit private feedback"
on public.feedback_messages
for insert
to anon, authenticated
with check (
  is_public = false
  and char_length(content) between 1 and 500
);

drop policy if exists "Public feedback is readable and admins read all" on public.feedback_messages;
create policy "Public feedback is readable and admins read all"
on public.feedback_messages
for select
to anon, authenticated
using (
  is_public = true
  or exists (
    select 1
    from public.portfolio_admins
    where portfolio_admins.user_id = auth.uid()
  )
);

drop policy if exists "Admins can update feedback" on public.feedback_messages;
create policy "Admins can update feedback"
on public.feedback_messages
for update
to authenticated
using (
  exists (
    select 1
    from public.portfolio_admins
    where portfolio_admins.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.portfolio_admins
    where portfolio_admins.user_id = auth.uid()
  )
);

drop policy if exists "Admins can delete feedback" on public.feedback_messages;
create policy "Admins can delete feedback"
on public.feedback_messages
for delete
to authenticated
using (
  exists (
    select 1
    from public.portfolio_admins
    where portfolio_admins.user_id = auth.uid()
  )
);

create index if not exists feedback_messages_created_at_idx
on public.feedback_messages (created_at desc);
