-- 1. Permitir que cualquier usuario (incluso anon) pueda insertar en tenants (para el registro)
drop policy if exists "Permitir registro de nuevos tenants" on public.tenants;
create policy "Permitir registro de nuevos tenants" 
    on public.tenants 
    for insert 
    with check (true);

-- 2. Permitir que el usuario (autenticado) vea su propio registro (basado en app_metadata)
-- Nota: Esta ya existía pero aseguramos que cubra todos los casos.
drop policy if exists "Usuarios pueden ver su propio tenant" on public.tenants;
create policy "Usuarios pueden ver su propio tenant"
    on public.tenants
    for select
    using ( id::text = auth.jwt() -> 'app_metadata' ->> 'tenant_id' );

-- 3. Permitir que el usuario (autenticado) actualice su propio registro (onboarding)
drop policy if exists "Usuarios pueden actualizar su propio tenant" on public.tenants;
create policy "Usuarios pueden actualizar su propio tenant"
    on public.tenants
    for update
    using ( id::text = auth.jwt() -> 'app_metadata' ->> 'tenant_id' )
    with check ( id::text = auth.jwt() -> 'app_metadata' ->> 'tenant_id' );

-- 4. Permitir bypass total para el rol de servicio (por si acaso RLS aun se interpone)
drop policy if exists "Service role bypass" on public.tenants;
create policy "Service role bypass"
    on public.tenants
    for all
    using (auth.role() = 'service_role');
