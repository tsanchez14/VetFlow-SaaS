import { supabase } from '../supabaseClient.js';

const adminTenants = {
    async render(container) {
        const { data: tenants, error } = await supabase.from('tenants').select('*').order('nombre', { ascending: true });

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="fw-bold">Gestión de Clínicas</h2>
                    <p class="text-muted">Control total sobre tus clientes multitenant</p>
                </div>
                <button class="btn btn-primary btn-lg" onclick="window.adminTenantsModule.refresh()">
                    <i class="fas fa-sync-alt me-2"></i> Actualizar Listado
                </button>
            </div>

            <div class="table-container">
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="text-muted small">
                            <tr>
                                <th>CLÍNICA / DUEÑO</th>
                                <th>PLAN</th>
                                <th>ESTADO</th>
                                <th>VTO TRIAL / PAGO</th>
                                <th>SCHEMA</th>
                                <th class="text-end">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tenants.map(t => `
                                <tr>
                                    <td>
                                        <div class="fw-bold">${t.nombre}</div>
                                        <small class="text-muted">${t.slug}</small>
                                    </td>
                                    <td><span class="badge bg-light text-dark border text-uppercase">${t.plan}</span></td>
                                    <td>${this.getStatusBadge(t.estado)}</td>
                                    <td>
                                        <div class="small fw-bold">${new Date(t.trial_hasta).toLocaleDateString()}</div>
                                        <small class="${new Date(t.trial_hasta) < new Date() ? 'text-danger' : 'text-muted'}">
                                            ${new Date(t.trial_hasta) < new Date() ? 'VENCIDO' : 'En curso'}
                                        </small>
                                    </td>
                                    <td><code>${t.schema_name || 'N/A'}</code></td>
                                    <td class="text-end">
                                        <div class="btn-group">
                                            <button class="btn btn-sm btn-outline-primary" onclick="window.adminTenantsModule.changePlan('${t.id}', '${t.plan}')">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-sm ${t.estado === 'suspendido' ? 'btn-success' : 'btn-outline-danger'}" 
                                                onclick="window.adminTenantsModule.toggleStatus('${t.id}', '${t.estado}')">
                                                <i class="fas ${t.estado === 'suspendido' ? 'fa-play' : 'fa-pause'}"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        window.adminTenantsModule = this;
    },

    getStatusBadge(status) {
        switch (status) {
            case 'activo': return '<span class="badge rounded-pill bg-success">Activo</span>';
            case 'trial': return '<span class="badge rounded-pill bg-info">Trial</span>';
            case 'suspendido': return '<span class="badge rounded-pill bg-danger">Suspendido</span>';
            default: return `<span class="badge rounded-pill bg-secondary">${status}</span>`;
        }
    },

    async toggleStatus(id, currentStatus) {
        const newStatus = currentStatus === 'suspendido' ? 'activo' : 'suspendido';
        if (!confirm(`¿Estás seguro de cambiar el estado a ${newStatus.toUpperCase()}?`)) return;

        const { error } = await supabase.from('tenants').update({ estado: newStatus }).eq('id', id);
        if (error) alert('Error: ' + error.message);
        else this.render(document.getElementById('admin-content'));
    },

    async changePlan(id, currentPlan) {
        const newPlan = prompt(`Cambiar plan (actual: ${currentPlan}). Ingresar: basico, pro, o anual:`, currentPlan);
        if (!newPlan || newPlan === currentPlan) return;

        const { error } = await supabase.from('tenants').update({ plan: newPlan }).eq('id', id);
        if (error) alert('Error: ' + error.message);
        else this.render(document.getElementById('admin-content'));
    },

    async refresh() {
        this.render(document.getElementById('admin-content'));
    }
};

export default adminTenants;
