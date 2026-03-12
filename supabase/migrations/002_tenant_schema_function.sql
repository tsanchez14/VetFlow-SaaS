-- FUNCIÓN PARA PROVISIONAR UN NUEVO TENANT (SCHEMA + TABLAS)

create or replace function public.crear_schema_tenant(p_tenant_id uuid, p_schema text)
returns void language plpgsql security definer as $$
begin
  -- 1. Crear el schema
  execute format('create schema if not exists %I', p_schema);

  -- 2. Módulo: Calendario (turnos)
  execute format('create table if not exists %I.turnos (
    id uuid primary key default gen_random_uuid(),
    titulo text not null,
    fecha_hora timestamptz not null,
    duracion_minutos int default 30,
    paciente text,
    propietario text,
    telefono text,
    estado text default ''pendiente'',
    notas text,
    created_at timestamptz default now()
  )', p_schema);

  -- 3. Módulo: Stock (productos)
  execute format('create table if not exists %I.productos (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    categoria text,
    stock_actual numeric(10,2) default 0,
    stock_minimo numeric(10,2) default 0,
    unidad text,
    precio_costo numeric(10,2),
    precio_venta numeric(10,2),
    proveedor_id uuid,
    created_at timestamptz default now()
  )', p_schema);

  -- 4. Módulo: Proveedores
  execute format('create table if not exists %I.proveedores (
    id uuid primary key default gen_random_uuid(),
    nombre text not null,
    contacto text,
    telefono text,
    email text,
    notas text,
    created_at timestamptz default now()
  )', p_schema);

  -- 5. Módulo: Ventas
  execute format('create table if not exists %I.ventas (
    id uuid primary key default gen_random_uuid(),
    fecha timestamptz default now(),
    cliente text,
    total numeric(10,2) default 0,
    estado text default ''completada'',
    notas text,
    created_at timestamptz default now()
  )', p_schema);

  execute format('create table if not exists %I.ventas_items (
    id uuid primary key default gen_random_uuid(),
    venta_id uuid references %I.ventas(id) on delete cascade,
    producto_id uuid, -- Referencia manual (no foreign key cruzada de schemas por simplicidad inicial)
    descripcion text,
    cantidad numeric(10,2),
    precio_unitario numeric(10,2),
    subtotal numeric(10,2)
  )', p_schema, p_schema);

  -- 6. Módulo: Costos
  execute format('create table if not exists %I.costos (
    id uuid primary key default gen_random_uuid(),
    descripcion text not null,
    categoria text,
    monto numeric(10,2) not null,
    fecha date default current_date,
    recurrente boolean default false,
    notas text,
    created_at timestamptz default now()
  )', p_schema);

  -- 7. Actualizar el registro del tenant con su schema asignado
  update public.tenants set schema_name = p_schema where id = p_tenant_id;

  -- 8. Permisos para que el rol autenticado use este schema
  -- Importante: El aislamiento real se logra por el Search Path que setearemos en JS
  execute format('grant usage on schema %I to authenticated', p_schema);
  execute format('grant all on all tables in schema %I to authenticated', p_schema);
  execute format('grant all on all sequences in schema %I to authenticated', p_schema);

end;
$$;
