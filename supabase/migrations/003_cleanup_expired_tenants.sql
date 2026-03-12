-- 1. Crear la función de limpieza
CREATE OR REPLACE FUNCTION public.limpiar_tenants_expirados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
BEGIN
    -- Buscamos tenants en trial cuya fecha de vencimiento haya pasado
    FOR r IN 
        SELECT id, schema_name 
        FROM public.tenants 
        WHERE estado = 'trial' 
          AND trial_hasta < NOW()
    LOOP
        -- A. Eliminar el esquema del tenant de forma permanente
        IF r.schema_name IS NOT NULL AND r.schema_name != 'public' THEN
            EXECUTE 'DROP SCHEMA IF EXISTS ' || quote_ident(r.schema_name) || ' CASCADE';
            RAISE NOTICE 'Esquema % del tenant % eliminado.', r.schema_name, r.id;
        END IF;

        -- B. Eliminar registros en suscripciones vinculados (si existen)
        DELETE FROM public.suscripciones WHERE tenant_id = r.id;

        -- C. Eliminar el registro del tenant
        DELETE FROM public.tenants WHERE id = r.id;
        
        RAISE NOTICE 'Registro del tenant % eliminado de public.tenants.', r.id;
    END LOOP;
END;
$$;

-- 2. Programar la ejecución automática (requiere extensión pg_cron)
-- Nota: En Supabase, la extensión pg_cron está disponible por defecto.
-- La programamos para que corra todos los días a las 03:00 AM.

-- Primero nos aseguramos de que la extensión esté habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programamos la tarea (le damos un nombre para identificarla)
SELECT cron.schedule(
    'limpieza-diaria-trials', -- Nombre de la tarea
    '0 3 * * *',              -- Cada día a las 03:00 AM
    'SELECT public.limpiar_tenants_expirados()'
);
