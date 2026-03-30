-- 1. ASEGURAR TABLAS EN SCHEMA PUBLIC (Standardized names)

-- Productos (Stock)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  category text,
  stock numeric(10,2) default 0,
  min_stock numeric(10,2) default 0,
  unit text,
  cost_price numeric(10,2),
  sell_price numeric(10,2),
  supplier_id uuid, -- Referencia manual o a public.suppliers
  created_at timestamptz default now()
);

-- Proveedores
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  contact text,
  phone text,
  email text,
  products text,
  notes text,
  created_at timestamptz default now()
);

-- Turnos / Citas
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  pet_id uuid, -- Referencia opcional (o manual)
  vet_id uuid,
  display_name text,
  phone text,
  date date not null,
  time time not null,
  reason text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Ventas
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  owner_id uuid,
  total numeric(10,2) default 0,
  discount numeric(10,2) default 0,
  payment_method text,
  description text,
  category_id int,
  notes text,
  date timestamptz default now(),
  created_at timestamptz default now()
);

-- Items de Venta
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  sale_id uuid references public.sales(id) on delete cascade,
  product_id uuid,
  service_name text,
  quantity numeric(10,2),
  price numeric(10,2),
  created_at timestamptz default now()
);

-- Costos
create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  date date not null,
  description text not null,
  type text,
  category text,
  amount numeric(10,2) not null,
  frequency text,
  supplier text,
  is_recurring int default 0,
  notes text,
  created_at timestamptz default now()
);

-- 2. HABILITAR RLS EN TODAS LAS TABLAS
alter table public.products enable row level security;
alter table public.suppliers enable row level security;
alter table public.appointments enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.costs enable row level security;

-- 3. POLÍTICAS DE AISLAMIENTO (TENANT ISOLATION)
-- Nota: Usamos tenant_id de app_metadata para garantizar que cada cliente vea solo lo suyo.

do $$
declare
  t text;
begin
  for t in select table_name from information_schema.tables 
           where table_schema = 'public' 
           and table_name in ('products', 'suppliers', 'appointments', 'sales', 'sale_items', 'costs')
  loop
    execute format('drop policy if exists "Aislamiento por tenant" on public.%I', t);
    execute format('create policy "Aislamiento por tenant" on public.%I 
                    for all using (tenant_id::text = auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')
                    with check (tenant_id::text = auth.jwt() -> ''app_metadata'' ->> ''tenant_id'')', t);
  end loop;
end;
$$;

-- 4. POLÍTICA PARA EL ROL DE SERVICIO (Bypass RLS para el backend)
do $$
declare
  t text;
begin
  for t in select table_name from information_schema.tables 
           where table_schema = 'public' 
           and table_name in ('products', 'suppliers', 'appointments', 'sales', 'sale_items', 'costs')
  loop
    execute format('drop policy if exists "Service role bypass" on public.%I', t);
    execute format('create policy "Service role bypass" on public.%I 
                    for all using (auth.role() = ''service_role'')', t);
  end loop;
end;
$$;

-- 5. ASIGNAR DATOS EXISTENTES (Si los hay) AL TENANT ACTUAL
-- Esto asegura que el usuario no pierda sus datos de prueba en el pasaje a RLS.
update public.products set tenant_id = 'ff06ffb4-1674-4f60-b3bf-2053d3438281' where tenant_id is null;
update public.suppliers set tenant_id = 'ff06ffb4-1674-4f60-b3bf-2053d3438281' where tenant_id is null;
update public.appointments set tenant_id = 'ff06ffb4-1674-4f60-b3bf-2053d3438281' where tenant_id is null;
update public.sales set tenant_id = 'ff06ffb4-1674-4f60-b3bf-2053d3438281' where tenant_id is null;
update public.sale_items set tenant_id = 'ff06ffb4-1674-4f60-b3bf-2053d3438281' where tenant_id is null;
update public.costs set tenant_id = 'ff06ffb4-1674-4f60-b3bf-2053d3438281' where tenant_id is null;
