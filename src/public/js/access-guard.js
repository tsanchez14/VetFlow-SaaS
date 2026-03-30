/**
 * Guard de Acceso VetFlow
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
        console.warn('Acceso denegado: No se encontró sesión.');
        window.location.href = 'login.html';
        return;
    }
}

// Ejecutar inmediatamente
checkAccess();
