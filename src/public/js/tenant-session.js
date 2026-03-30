const SESSION_KEY = 'vetflow_tenant_data';

export const tenantSession = {
    /**
     * Inicializa la sesión del tenant (Standalone Demo)
     */
    async init() {
        // En la demo, siempre usamos el perfil de "VetFlow"
        const tenantData = {
            id: 1,
            nombre: 'VetFlow',
            slug: 'vetflow',
            plan: 'pro',
            estado: 'activo',
            schemaName: 'public',
            config: {
                welcome_message: 'Bienvenido al panel de control'
            }
        };

        sessionStorage.setItem(SESSION_KEY, JSON.stringify(tenantData));
        return tenantData;
    },

    /**
     * Obtiene los datos del tenant actual (Standalone)
     */
    getTenant() {
        const data = sessionStorage.getItem(SESSION_KEY);
        // Si no hay datos, inicializamos por defecto para la demo
        if (!data) {
            return {
                id: 1,
                nombre: 'VetFlow',
                plan: 'pro',
                config: {}
            };
        }
        return JSON.parse(data);
    },

    getSchema() { return 'public'; },
    isTrialActivo() { return true; },
    checkPermisoModulo(modulo) { return true; },
    clear() { sessionStorage.removeItem(SESSION_KEY); }
};
