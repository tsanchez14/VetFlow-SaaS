import { supabase } from '../supabaseClient.js';

const adminDashboard = {
    async render(container) {
        const stats = await this.getGlobalStats();

        container.innerHTML = `
            <div class="mb-4">
                <h2 class="fw-bold">Rendimiento Global del Negocio</h2>
                <p class="text-muted">Métricas consolidadas de todas las clínicas</p>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-md-3">
                    <div class="stat-card-admin">
                        <div class="text-muted small fw-bold mb-1">CLÍNICAS TOTALES</div>
                        <div class="h2 fw-bold mb-0">${stats.totalTenants}</div>
                        <div class="text-success small mt-2"><i class="fas fa-arrow-up"></i> +${stats.newThisMonth} este mes</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card-admin">
                        <div class="text-muted small fw-bold mb-1">CLÍNICAS ACTIVAS</div>
                        <div class="h2 fw-bold mb-0 text-primary">${stats.activeTenants}</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card-admin">
                        <div class="text-muted small fw-bold mb-1">INGRESOS PROYECTADOS (MRR)</div>
                        <div class="h2 fw-bold mb-0 text-success">$${stats.mrr}</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card-admin">
                        <div class="text-muted small fw-bold mb-1">EN PERÍODO DE PRUEBA</div>
                        <div class="h2 fw-bold mb-0 text-warning">${stats.trialTenants}</div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-md-8">
                    <div class="table-container">
                        <h5 class="fw-bold mb-4">Últimas Clínicas Unidas</h5>
                        <table class="table table-hover align-middle">
                            <thead class="text-muted small">
                                <tr>
                                    <th>CLÍNICA</th>
                                    <th>PLAN</th>
                                    <th>ESTADO</th>
                                    <th>FECHA ALTA</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stats.latestTenants.map(t => `
                                    <tr>
                                        <td>
                                            <div class="fw-bold">${t.nombre}</div>
                                            <small class="text-muted">${t.slug}</small>
                                        </td>
                                        <td><span class="badge bg-light text-dark border text-uppercase">${t.plan}</span></td>
                                        <td>${this.getStatusBadge(t.estado)}</td>
                                        <td>${new Date(t.created_at).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="stat-card-admin h-100">
                        <h5 class="fw-bold mb-4">Distribución por Plan</h5>
                        <div class="d-grid gap-3">
                            ${this.renderPlanRow('Anual', stats.plansCount.anual, '#10b981')}
                            ${this.renderPlanRow('Pro', stats.plansCount.pro, '#3b82f6')}
                            ${this.renderPlanRow('Básico', stats.plansCount.basico, '#6366f1')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    async getGlobalStats() {
        const { data: tenants, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
        if (error) return { totalTenants: 0, activeTenants: 0, mrr: 0, latestTenants: [], plansCount: { anual: 0, pro: 0, basico: 0 } };

        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const counts = tenants.reduce((acc, t) => {
            if (t.estado === 'activo') acc.active++;
            if (t.estado === 'trial') acc.trial++;
            if (new Date(t.created_at) >= monthStart) acc.new++;
            acc.plans[t.plan] = (acc.plans[t.plan] || 0) + 1;

            // MRR Simple
            if (t.estado === 'activo') {
                if (t.plan === 'pro') acc.mrr += 4500;
                if (t.plan === 'anual') acc.mrr += (45000 / 12);
                if (t.plan === 'basico') acc.mrr += 2500; // Supongamos 2500 para básico
            }
            return acc;
        }, { active: 0, trial: 0, new: 0, mrr: 0, plans: { anual: 0, pro: 0, basico: 0 } });

        return {
            totalTenants: tenants.length,
            activeTenants: counts.active,
            trialTenants: counts.trial,
            newThisMonth: counts.new,
            mrr: Math.round(counts.mrr).toLocaleString('es-AR'),
            latestTenants: tenants.slice(0, 5),
            plansCount: counts.plans
        };
    },

    getStatusBadge(status) {
        switch (status) {
            case 'activo': return '<span class="badge bg-success-subtle text-success">Activada</span>';
            case 'trial': return '<span class="badge bg-warning-subtle text-warning">Prueba</span>';
            case 'suspendido': return '<span class="badge bg-danger-subtle text-danger">Mora</span>';
            default: return `<span class="badge bg-secondary-subtle text-secondary">${status}</span>`;
        }
    },

    renderPlanRow(label, count, color) {
        return `
            <div>
                <div class="d-flex justify-content-between mb-1">
                    <span class="small fw-bold">${label}</span>
                    <span class="small text-muted">${count} clínicas</span>
                </div>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar" style="width: ${count * 10}%; background-color: ${color}"></div>
                </div>
            </div>
        `;
    }
};

export default adminDashboard;
