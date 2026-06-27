-- Tabla local de empresas DENUE/INEGI
-- Se pobla con CSVs descargados del portal de microdatos de INEGI
-- Permite búsqueda por nombre, SCIAN, municipio y tamaño sin depender de la API

create table if not exists public.denue_empresas (
  id                  text primary key,          -- Id del DENUE
  nombre              text,
  razon_social        text,
  codigo_actividad    text,                       -- Código SCIAN (6 dígitos)
  clase_actividad     text,                       -- Descripción de la actividad
  estrato             text,                       -- 1=Micro 2=Pequeña 3=Mediana 4=Grande
  tipo_vialidad       text,
  nombre_vialidad     text,
  numero_exterior     text,
  nombre_asentamiento text,
  municipio           text,
  entidad             text,
  estado_code         text,                       -- 01-32
  codigo_postal       text,
  telefono            text,
  correo_e            text,
  latitud             numeric(10,6),
  longitud            numeric(10,6),
  fecha_alta          text,
  created_at          timestamptz default now()
);

-- Índices para búsquedas frecuentes
create index if not exists denue_nombre_idx         on public.denue_empresas using gin(to_tsvector('spanish', coalesce(nombre,'') || ' ' || coalesce(razon_social,'')));
create index if not exists denue_actividad_idx      on public.denue_empresas (codigo_actividad);
create index if not exists denue_estado_idx         on public.denue_empresas (estado_code);
create index if not exists denue_estrato_idx        on public.denue_empresas (estrato);
create index if not exists denue_municipio_idx      on public.denue_empresas (municipio);

-- RLS: solo consultores autenticados pueden leer
alter table public.denue_empresas enable row level security;

create policy "Autenticados pueden leer DENUE"
  on public.denue_empresas for select
  using (auth.role() = 'authenticated');
