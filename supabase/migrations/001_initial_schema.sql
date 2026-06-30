-- ArchMind AI — Supabase schema (run in SQL editor or via supabase db push)

-- Profiles (synced from auth.users via trigger)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  plan text not null default 'hobby',
  analyses_used int not null default 0,
  analyses_limit int not null default 10,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Workspaces
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'hobby',
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor',
  unique (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create policy "Members can view workspace" on public.workspaces
  for select using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspaces.id and wm.user_id = auth.uid()
    )
  );

create policy "Members can view membership" on public.workspace_members
  for select using (user_id = auth.uid() or exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid()
  ));

-- Analyses
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  name text not null,
  source_type text not null,
  diagram_type text,
  status text not null default 'queued',
  file_path text,
  source_content text,
  scores jsonb not null default '{}',
  diagram_nodes jsonb not null default '[]',
  diagram_edges jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.analyses enable row level security;

create policy "Workspace members can view analyses" on public.analyses
  for select using (exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = analyses.workspace_id and wm.user_id = auth.uid()
  ));

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  agent text not null,
  severity text not null,
  title text not null,
  summary text not null,
  recommendation text not null,
  node_id text
);

alter table public.findings enable row level security;

create policy "Members can view findings" on public.findings
  for select using (exists (
    select 1 from public.analyses a
    join public.workspace_members wm on wm.workspace_id = a.workspace_id
    where a.id = findings.analysis_id and wm.user_id = auth.uid()
  ));

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid references public.profiles(id),
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage bucket for diagrams
insert into storage.buckets (id, name, public)
values ('diagrams', 'diagrams', false)
on conflict (id) do nothing;
