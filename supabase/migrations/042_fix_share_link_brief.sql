-- El Portal del Cliente (016_client_share_links.sql) quedó huérfano desde que
-- el Brief se rediseñó a la tabla real `brief_documents` (013): la función
-- get_share_link_brief() seguía apuntando a una tabla `brief` (singular) que
-- nunca existió con columnas planas executive_summary/priorities/plan_90d,
-- cuando la forma real es JSONB por sección (arrays de items con `approved`).
-- Resultado: el Portal nunca mostraba Resumen ejecutivo/Prioridades/Plan,
-- sin importar qué tuviera el Brief real. También faltaban plan_6m/plan_1a/
-- plan_3a — el Portal solo pedía plan_90d.

drop function if exists get_share_link_brief(uuid);

create function get_share_link_brief(p_token uuid)
returns table (
  executive_summary text,
  priorities        jsonb,
  plan_90d          jsonb,
  plan_6m           jsonb,
  plan_1a           jsonb,
  plan_3a           jsonb
)
language sql
security definer
stable
as $$
  select
    b.executive_summary,
    b.priorities,
    b.plan_90d,
    b.plan_6m,
    b.plan_1a,
    b.plan_3a
  from client_share_links sl
  join brief_documents b on b.case_id = sl.case_id
  where sl.token = p_token
    and sl.active = true
    and sl.expires_at > now()
    and b.status = 'published'
  limit 1;
$$;
