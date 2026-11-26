-- Suscripciones Web Push y almacenamiento de la planilla oficial.
-- Ejecutar en Supabase SQL Editor. El acceso a push_subscriptions queda limitado
-- al servidor (service_role); la identidad de Mi Credencial usa una cookie propia.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_usuario_id_idx
  on public.push_subscriptions(usuario_id);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;
grant all on table public.push_subscriptions to service_role;

create table if not exists public.push_notificaciones_enviadas (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('alta_medica', 'cuota')),
  hito_dias integer not null,
  fecha_referencia date not null,
  enviado_at timestamptz not null default now(),
  primary key (usuario_id, tipo, hito_dias, fecha_referencia)
);

alter table public.push_notificaciones_enviadas enable row level security;
revoke all on table public.push_notificaciones_enviadas from anon, authenticated;
grant all on table public.push_notificaciones_enviadas to service_role;

-- Permite que la recepción publique una planilla pública descargable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'planilla-inscripcion',
  'planilla-inscripcion',
  true,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

