import { supabase } from './supabaseClient.js';

const adminApp = {
    modules: {},
    currentModule: null,

    async init() {
        this.container = document.getElementById('admin-content');
        this.navLinks = document.querySelectorAll('.nav-link-admin');

        this.initRouter();
        this.loadModuleFromHash();
    },

    initRouter() {
        window.addEventListener('hashchange', () => this.loadModuleFromHash());
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    },

    async loadModuleFromHash() {
        const hash = window.location.hash.substring(1) || 'dashboard';
        const moduleName = `admin-${hash}`;

        this.container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

        try {
            if (!this.modules[moduleName]) {
                const module = await import(`./modules/${moduleName}.js?v=${new Date().getTime()}`);
                this.modules[moduleName] = module.default;
            }
            this.currentModule = this.modules[moduleName];
            await this.currentModule.render(this.container);
        } catch (error) {
            console.error('Error loading admin module:', error);
            this.container.innerHTML = `<div class="alert alert-danger">Error al cargar el módulo admin: ${moduleName}</div>`;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => adminApp.init());
