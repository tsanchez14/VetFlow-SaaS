import { supabase } from './supabaseClient.js'
import { tenantSession } from './tenant-session.js'

async function initOnboarding() {
    const tenant = tenantSession.getTenant();
    if (!tenant) {
        window.location.href = 'login.html';
        return;
    }

    // Si ya completó el onboarding, no debería estar acá
    if (tenant.config?.onboardingDone) {
        window.location.href = 'dashboard.html';
        return;
    }

    const finishBtn = document.getElementById('finish-btn');

    finishBtn.addEventListener('click', async () => {
        finishBtn.disabled = true;
        finishBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Configurando tu clínica...';

        try {
            const logo = document.getElementById('ob-logo').value;
            const welcome = document.getElementById('ob-welcome').value;

            // 1. Crear el schema del tenant usando RPC
            // La función SQL: crear_schema_tenant(p_tenant_id uuid, p_schema text)
            const schemaSlug = `vet_${tenant.slug}`;

            const { error: rpcError } = await supabase.rpc('crear_schema_tenant', {
                p_tenant_id: tenant.id,
                p_schema: schemaSlug
            });

            if (rpcError) throw new Error('Error al crear la base de datos: ' + rpcError.message);

            // 2. Actualizar configuración del tenant en public.tenants
            const { error: updateError } = await supabase
                .from('tenants')
                .update({
                    schema_name: schemaSlug,
                    config: {
                        ...tenant.config,
                        logo_url: logo,
                        welcome_message: welcome,
                        onboardingDone: true,
                        setupDate: new Date().toISOString()
                    }
                })
                .eq('id', tenant.id);

            if (updateError) throw updateError;

            // 3. Actualizar la sesión local y redirigir
            await tenantSession.init(supabase);
            alert('¡Configuración completada con éxito!');
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Error en onboarding:', error);
            alert('Hubo un error configurando tu clínica: ' + error.message);
            finishBtn.disabled = false;
            finishBtn.innerHTML = 'Ir al Dashboard';
        }
    });
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initOnboarding);
