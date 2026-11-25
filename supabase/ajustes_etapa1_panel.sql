-- ============================================================================
-- Ajustes idempotentes para el Panel de Recepción (Etapa 1)
-- Ejecutalo en Supabase > SQL Editor. Es seguro correrlo más de una vez.
-- No crea tablas ni buckets nuevos: las políticas RLS existentes no cambian.
-- El panel opera con service_role desde el servidor, después de verificar el rol admin_recepcion.
-- ============================================================================

-- 0) (Opcional) Verificá qué columnas tiene hoy tu esquema:
-- select table_name, column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_schema = 'public' and table_name in ('usuarios', 'documentacion_medica')
--  order by table_name, ordinal_position;
--
-- select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--  where conrelid in ('public.usuarios'::regclass, 'public.documentacion_medica'::regclass);

-- 1) Teléfono del usuario (lo necesita WhatsApp en la Etapa 3)
alter table public.usuarios
  add column if not exists telefono text;

-- 2) Columnas que usa la bandeja de altas médicas
alter table public.documentacion_medica
  add column if not exists origen text,
  add column if not exists archivo_path text,
  add column if not exists archivo_nombre text,
  add column if not exists fecha_emision date,
  add column if not exists observaciones text,
  add column if not exists validado_en timestamptz;

-- 3) Un alta "pendiente" todavía no tiene fechas confirmadas, y una carga presencial puede no tener archivo
alter table public.documentacion_medica alter column fecha_vencimiento drop not null;
alter table public.documentacion_medica alter column archivo_path drop not null;

-- 4) Habilitar a un usuario de Supabase Auth como recepción (reemplazá el email).
--    Después de correrlo, esa persona tiene que cerrar sesión y volver a entrar.
-- update auth.users
--    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin_recepcion"}'::jsonb
--  where email = 'recepcion@tu-dominio.com';
