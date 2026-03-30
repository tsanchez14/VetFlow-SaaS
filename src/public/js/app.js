import { tenantSession } from './tenant-session.js';

const app = {
    modules: {},
    currentModule: null,
    tenant: null,

    async init() {
        this.container = document.getElementById('module-container');
        this.navItems = document.querySelectorAll('.nav-item');
        this.sidebar = document.querySelector('.sidebar');
        this.mobileToggle = document.querySelector('.mobile-toggle');

        // Botón Menú Móvil
        if (this.mobileToggle) {
            this.mobileToggle.addEventListener('click', () => {
                if (this.sidebar) {
                    this.sidebar.classList.toggle('show');
                }
            });
        }

        // 1. Inicializar sesión del tenant
        try {
            this.tenant = await tenantSession.init();

            if (!this.tenant) {
                console.warn('No se pudo inicializar la sesión. Redirigiendo al login...');
                window.location.href = 'login.html';
                return;
            }
        } catch (err) {
            console.error('Excepción en App Init:', err);
            window.location.href = 'login.html';
            return;
        }

        // 2. Actualizar identidad visual en la UI
        this.updateTenantUI();

        this.initRouter();
        this.loadModuleFromHash();

        console.log('App initialized (Standalone Demo)');
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
        window.addEventListener('hashchange', () => {
            this.loadModuleFromHash();
            // Cerrar sidebar en móvil al cambiar de ruta
            if (this.sidebar && window.innerWidth <= 768) {
                this.sidebar.classList.remove('show');
            }
        });
    },

    async loadModuleFromHash() {
        const hash = window.location.hash.substring(1) || 'dashboard';

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
