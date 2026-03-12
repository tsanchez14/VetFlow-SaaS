import { supabase } from '../supabaseClient.js';
import { tenantSession } from '../tenant-session.js';

const plans = {
    async render(container) {
        const tenant = tenantSession.getTenant();
        const trialRestante = this.getTrialDays(tenant.trialHasta);

        container.innerHTML = `
            <div class="module-wrapper px-4">
                <div class="module-header mb-4 py-1">
                    <h1 class="h3 font-weight-bold mb-1">Mi Plan y Suscripción</h1>
                    <p class="text-muted">Gestioná tu acceso a VetFlow y los métodos de pago</p>
                </div>

                <div class="row g-4">
                    <!-- Estado Actual -->
                    <div class="col-md-4">
                        <div class="card border-0 shadow-sm h-100" style="border-radius: 20px;">
                            <div class="card-body p-4 text-center">
                                <div class="mb-3">
                                    <span class="badge bg-primary-light text-primary px-3 py-2" style="font-size: 0.9rem; text-transform: uppercase; font-weight: 700;">
                                        Plan ${tenant.plan.toUpperCase()}
                                    </span>
                                </div>
                                <h2 class="fw-bold mb-2">${tenant.estado === 'trial' ? 'Período de Prueba' : 'Suscripción Activa'}</h2>
                                <p class="text-muted small mb-4">
                                    ${tenant.estado === 'trial'
                ? `Te quedan <strong>${trialRestante} días</strong> de prueba gratuita.`
                : 'Tu suscripción se renueva automáticamente cada mes.'}
                                </p>
                                
                                ${tenant.estado === 'trial' ? `
                                    <div class="progress mb-3" style="height: 10px; border-radius: 5px;">
                                        <div class="progress-bar bg-primary" role="progressbar" style="width: ${Math.max(0, (trialRestante / 30) * 100)}%"></div>
                                    </div>
                                ` : ''}
                                
                                <div class="mt-4 p-3 bg-light rounded-3">
                                    <small class="text-muted d-block">Próximo Vencimiento</small>
                                    <span class="fw-bold">${new Date(tenant.trialHasta).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Selección de Planes -->
                    <div class="col-md-8">
                        <div class="row g-3">
                            ${this.renderPlanCard('PRO', 'Ideal para clínicas en crecimiento', '4500', ['Dashboard Avanzado', 'Reportes Financieros', 'Control de Costos', 'Soporte Prioritario'], tenant.plan === 'pro')}
                            ${this.renderPlanCard('ANUAL', 'Ahorrá un 20% pagando el año', '45000', ['Todo lo del plan PRO', '2 meses de regalo', 'Capacitación personalizada', 'Exportación masiva'], tenant.plan === 'anual')}
                        </div>
                    </div>
                </div>

                <div class="card mt-4 border-0 shadow-sm" style="border-radius: 20px;">
                    <div class="card-body p-4">
                        <h5 class="fw-bold mb-3"><i class="fas fa-history me-2"></i>Historial de Pagos</h5>
                        <div id="payments-history" class="text-muted small py-3 text-center">
                            No se registran pagos previos todavía.
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .bg-primary-light { background-color: #e7f5ff; }
                .plan-card { border-radius: 20px; transition: all 0.3s ease; border: 2px solid transparent; }
                .plan-card.active { border-color: #0d6efd; background-color: #f8fbff; }
                .plan-card:hover { transform: translateY(-5px); }
                .btn-mp { background-color: #009ee3; color: white; border: none; font-weight: 700; }
                .btn-mp:hover { background-color: #007eb5; color: white; }
            </style>
        `;

        this.attachEvents();
    },

    renderPlanCard(name, desc, price, features, isActive) {
        return `
            <div class="col-md-6">
                <div class="card h-100 plan-card ${isActive ? 'active shadow' : 'shadow-sm border-0'}">
                    <div class="card-body p-4">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h4 class="fw-bold mb-0">${name}</h4>
                                <small class="text-muted">${desc}</small>
                            </div>
                            ${isActive ? '<span class="badge bg-success">Tu Plan Actual</span>' : ''}
                        </div>
                        <div class="mb-4">
                            <span class="h1 fw-bold">$${price}</span>
                            <span class="text-muted">/${name === 'ANUAL' ? 'año' : 'mes'}</span>
                        </div>
                        <ul class="list-unstyled mb-4">
                            ${features.map(f => `<li class="mb-2 small"><i class="fas fa-check text-success me-2"></i>${f}</li>`).join('')}
                        </ul>
                        ${!isActive ? `
                            <button class="btn btn-mp w-100 py-3" onclick="window.plansModule.subscribe('${name}')">
                                <i class="fas fa-credit-card me-2"></i> SUSCRIBIRME AHORA
                            </button>
                        ` : `
                            <button class="btn btn-outline-primary w-100 py-3" disabled>PLAN ACTUAL</button>
                        `}
                    </div>
                </div>
            </div>
        `;
    },

    getTrialDays(vto) {
        const diffTime = new Date(vto) - new Date();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    attachEvents() {
        window.plansModule = this;
    },

    async subscribe(planName) {
        const tenant = tenantSession.getTenant();
        const btn = event.target.closest('button');
        const originalText = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Procesando...';

        try {
            // SIMULACIÓN DE MERCADO PAGO
            // En una app real, aquí llamaríamos a una Edge Function para crear la preferencia
            // y abriríamos el Checkout Pro.

            await new Promise(resolve => setTimeout(resolve, 2000)); // Simular latencia de red

            const confirmacion = confirm(`Estás por suscribirte al plan ${planName}.\n\nPara esta demo, simularemos un pago exitoso.\n¿Deseas continuar?`);

            if (confirmacion) {
                // 1. Actualizar el tenant en la base de datos (public schema)
                const nuevoEstado = 'activo';
                const { error } = await supabase
                    .from('tenants')
                    .update({
                        plan: planName.toLowerCase(),
                        estado: nuevoEstado,
                        trial_hasta: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() // Extender 1 año
                    })
                    .eq('id', tenant.id);

                if (error) throw error;

                // 2. Registrar la suscripción
                await supabase.from('suscripciones').insert([{
                    tenant_id: tenant.id,
                    plan_id: planName.toLowerCase(),
                    estado: 'auto_recurring',
                    fecha_inicio: new Date().toISOString()
                }]);

                // 3. Actualizar la sesión local
                await tenantSession.init(supabase);

                alert('¡Suscripción exitosa! Tu cuenta ha sido actualizada al plan ' + planName);
                this.render(document.getElementById('module-container'));
            }
        } catch (err) {
            alert('Error al procesar la suscripción: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};

export default plans;
