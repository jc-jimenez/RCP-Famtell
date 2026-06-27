-- Portal del Cliente: links compartibles para que el directivo muestre avances a sus clientes

create table if not exists client_share_links (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references cases(id) on delete cascade,
  token       uuid not null default gen_random_uuid() unique,
  created_by  uuid not null references auth.users(id) on delete cascade,
  label       text,
  expires_at  timestamptz not null default (now() + interval '30 days'),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists client_share_links_case_id_idx on client_share_links(case_id);
create index if not exists client_share_links_token_idx   on client_share_links(token);

-- Solo el consultor del caso puede crear/ver/eliminar sus links
alter table client_share_links enable row level security;

create policy "Consultor gestiona sus links"
  on client_share_links
  for all
  using (
    exists (
      select 1 from case_users
      where case_users.case_id = client_share_links.case_id
        and case_users.user_id = auth.uid()
        and case_users.role = 'consultant'
    )
  );

-- Acceso público por token (sin autenticación) via función SECURITY DEFINER
create or replace function get_share_link_data(p_token uuid)
returns table (
  case_id      uuid,
  company_name text,
  industry     text,
  token        uuid,
  label        text,
  expires_at   timestamptz
)
language sql
security definer
stable
as $$
  select
    c.id,
    c.company_name,
    c.industry,
    sl.token,
    sl.label,
    sl.expires_at
  from client_share_links sl
  join cases c on c.id = sl.case_id
  where sl.token = p_token
    and sl.active = true
    and sl.expires_at > now();
$$;

create or replace function get_share_link_modules(p_token uuid)
returns table (
  module_code  text,
  status       text,
  completed_at timestamptz
)
language sql
security definer
stable
as $$
  select m.module_code, m.status, m.completed_at
  from client_share_links sl
  join modules m on m.case_id = sl.case_id
  where sl.token = p_token
    and sl.active = true
    and sl.expires_at > now()
  order by m.module_code;
$$;

create or replace function get_share_link_brief(p_token uuid)
returns table (
  executive_summary text,
  priorities        text,
  plan_90d          text
)
language sql
security definer
stable
as $$
  select
    b.executive_summary,
    b.priorities,
    b.plan_90d
  from client_share_links sl
  join brief b on b.case_id = sl.case_id
  where sl.token = p_token
    and sl.active = true
    and sl.expires_at > now()
  limit 1;
$$;
