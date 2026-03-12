/**
 * Módulo de Sesión Multitenant para VetFlow
 * Maneja la identidad del tenant y la configuración de búsqueda de base de datos.
 */

const SESSION_KEY = 'vetflow_tenant_data';

export const tenantSession = {
    /**
     * Inicializa la sesión del tenant al hacer login
     */
    async init(supabase) {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            this.clear();
            return null;
        }

        const user = session.user;
        const tenantId = user.app_metadata?.tenant_id;

        if (!tenantId) {
            console.error('El usuario no tiene un tenant_id asignado en app_metadata');
            return null;
        }

        // 1. Obtener datos del tenant desde el schema public
        const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single();

        if (tenantError || !tenant) {
            console.error('Error al obtener datos del tenant:', tenantError);
            return null;
        }

        // 2. Guardar en sessionStorage para persistencia rápida
        const tenantData = {
            id: tenant.id,
            nombre: tenant.nombre,
            slug: tenant.slug,
            plan: tenant.plan,
            estado: tenant.estado,
            trialHasta: tenant.trial_hasta,
            schemaName: tenant.schema_name,
            config: tenant.config || {}
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(tenantData));

        // 3. Configurar el search_path para esta sesión
        // Nota: En Supabase Web JS UI no hay una forma directa de hacer "SET search_path" 
        // globalmente para el cliente, por lo que usaremos .schema() en cada query.

        return tenantData;
    },

    /**
     * Obtiene los datos del tenant actual desde la memoria
     */
    getTenant() {
        const data = sessionStorage.getItem(SESSION_KEY);
        return data ? JSON.parse(data) : null;
    },

    /**
     * Obtiene el nombre del schema del tenant (ej: vet_001)
     */
    getSchema() {
        const tenant = this.getTenant();
        return tenant ? tenant.schemaName : 'public';
    },

    /**
     * Verifica si el trial sigue activo
     */
    isTrialActivo() {
        const tenant = this.getTenant();
        if (!tenant) return false;
        if (tenant.estado !== 'trial') return tenant.estado === 'activo';

        const vto = new Date(tenant.trialHasta);
        return vto > new Date();
    },

    /**
     * Verifica si el plan permite ver ciertos módulos
     */
    checkPermisoModulo(modulo) {
        const tenant = this.getTenant();
        if (!tenant) return false;

        const planes = {
            'basico': ['dashboard', 'calendario', 'stock', 'proveedores', 'ventas'],
            'pro': ['dashboard', 'calendario', 'stock', 'proveedores', 'ventas', 'costos', 'reportes'],
            'anual': ['dashboard', 'calendario', 'stock', 'proveedores', 'ventas', 'costos', 'reportes']
        };

        const permitidos = planes[tenant.plan] || planes['basico'];
        return permitidos.includes(modulo);
    },

    /**
     * Limpia la sesión (logout)
     */
    clear() {
        sessionStorage.removeItem(SESSION_KEY);
    }
};
