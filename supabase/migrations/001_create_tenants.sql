-- TABLAS PARA GESTIÓN DE TENANTS EN SCHEMA PUBLIC

-- 1. Tabla de Tenants (Clínicas)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text unique not null,
  plan text not null default 'libre' check (plan in ('libre', 'basico', 'pro', 'anual')),
  estado text not null default 'trial' check (estado in ('trial', 'activo', 'suspendido', 'cancelado')),
  trial_hasta timestamptz default now() + interval '14 days',
  schema_name text unique,
  config jsonb default '{}',
  created_at timestamptz default now()
);

-- 2. Tabla de Suscripciones (Pagos MercadoPago)
create table if not exists public.suscripciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  mp_preapproval_id text,
  estado text default 'pendiente',
  monto_usd numeric(8,2),
  proximo_cobro timestamptz,
  created_at timestamptz default now()
);

-- Habilitar RLS
alter table public.tenants enable row level security;
alter table public.suscripciones enable row level security;

-- Política inicial: El usuario solo puede ver el tenant al que pertenece
-- Nota: Usamos app_metadata porque el usuario NO puede editarlo (a diferencia de user_metadata).
drop policy if exists "Usuarios pueden ver su propio tenant" on public.tenants;
create policy "Usuarios pueden ver su propio tenant"
  on public.tenants
  for select
  using ( id::text = auth.jwt() -> 'app_metadata' ->> 'tenant_id' );

drop policy if exists "Usuarios pueden ver su propia suscripcion" on public.suscripciones;
create policy "Usuarios pueden ver su propia suscripcion"
  on public.suscripciones
  for select
  using ( tenant_id::text = auth.jwt() -> 'app_metadata' ->> 'tenant_id' );
