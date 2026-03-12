/**
 * Guard de Acceso Multitenant
 * Este script debe incluirse en el <head> de todas las páginas privadas.
 * Se encarga de redirigir si no hay sesión o si la suscripción está vencida.
 */

// Importamos la lógica de sesión (usamos import dinámico si es necesario o asumimos que se carga antes)
// Como es un guard de head, lo ideal es que sea auto-ejecutable y rápido.

async function checkAccess() {
    const publicPages = ['/index.html', '/registro.html', '/login.html', '/', '/pago-pendiente.html'];
    const currentPath = window.location.pathname;

    if (publicPages.some(page => currentPath.endsWith(page))) {
        return;
    }

    const tenantDataRaw = sessionStorage.getItem('vetflow_tenant_data');

    if (!tenantDataRaw) {
        console.warn('Acceso denegado: No se encontró sesión de tenant.');
        window.location.href = 'login.html';
        return;
    }

    const tenant = JSON.parse(tenantDataRaw);

    // 3. Validar estado del Tenant
    const ahora = new Date();
    const trialVencido = tenant.estado === 'trial' && new Date(tenant.trialHasta) < ahora;
    const suspendido = tenant.estado === 'suspendido' || tenant.estado === 'cancelado';
    const pendienteOnboarding = tenant.config?.onboardingDone === false;

    if (trialVencido || suspendido) {
        console.warn('Acceso bloqueado: Suscripción inactiva o vencida.');
        if (!currentPath.endsWith('pago-pendiente.html')) {
            window.location.href = 'pago-pendiente.html';
        }
        return;
    }

    // 4. Validar Onboarding
    if (pendienteOnboarding && !currentPath.endsWith('onboarding.html')) {
        console.info('Redirigiendo a onboarding...');
        window.location.href = 'onboarding.html';
        return;
    }
}

// Ejecutar inmediatamente
checkAccess();
