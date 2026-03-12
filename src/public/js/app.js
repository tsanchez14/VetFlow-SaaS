import { supabase } from './supabaseClient.js';
import { tenantSession } from './tenant-session.js';
import plans from './modules/plans.js'; // Importar el nuevo módulo

const app = {
    modules: {},
    currentModule: null,
    tenant: null,

    async init() {
        this.container = document.getElementById('module-container');
        this.navItems = document.querySelectorAll('.nav-item');

        // 1. Inicializar sesión del tenant
        this.tenant = await tenantSession.init(supabase);

        if (!this.tenant) {
            console.error('No se pudo inicializar la sesión del tenant. Redirigiendo al login...');
            window.location.href = 'login.html';
            return;
        }

        // 2. Actualizar identidad visual en la UI
        this.updateTenantUI();

        this.initRouter();
        this.loadModuleFromHash();

        console.log('App initialized for tenant:', this.tenant.nombre);
    },

    updateTenantUI() {
        // Actualizar nombre de la clínica en sidebar/header
        const clinicNameEls = document.querySelectorAll('.clinic-name');
        clinicNameEls.forEach(el => el.textContent = this.tenant.nombre);

        // Actualizar logo si existe
        if (this.tenant.config?.logo_url) {
            const logoEls = document.querySelectorAll('.clinic-logo');
            logoEls.forEach(el => el.src = this.tenant.config.logo_url);
        }
    },

    initRouter() {
        window.addEventListener('hashchange', () => this.loadModuleFromHash());

        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const module = item.dataset.module;
                // Al hacer clic, el hashchange se disparará automáticamente si el link es <a href="#module">
            });
        });
    },

    async loadModuleFromHash() {
        const hash = window.location.hash.substring(1) || 'dashboard';

        // Verificar permisos antes de cargar
        if (!tenantSession.checkPermisoModulo(hash)) {
            alert('Tu plan actual no permite el acceso a este módulo.');
            window.location.hash = 'dashboard';
            return;
        }

        this.setActiveNavItem(hash);

        // Show loader
        this.container.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
            </div>
        `;

        try {
            const moduleName = hash;
            // Forzar recarga o usar caché de módulos
            if (!this.modules[moduleName]) {
                const module = await import(`./modules/${moduleName}.js?v=${new Date().getTime()}`);
                this.modules[moduleName] = module.default;
            }

            this.currentModule = this.modules[moduleName];
            await this.currentModule.render(this.container);
        } catch (error) {
            console.error('Error loading module:', error);
            this.container.innerHTML = `<div class="error-msg">Error al cargar el módulo: ${hash}</div>`;
        }
    },

    setActiveNavItem(hash) {
        this.navItems.forEach(item => {
            if (item.dataset.module === hash) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    initGlobalEvents() {
        window.onclick = (event) => {
            if (!event.target.matches('.btn-dots') && !event.target.closest('.btn-dots')) {
                const dropdowns = document.getElementsByClassName('dropdown-menu-custom');
                for (let i = 0; i < dropdowns.length; i++) {
                    dropdowns[i].classList.remove('show');
                }
            }
        };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
    app.initGlobalEvents();
});

export default app;
export { API_BASE };
