import { supabase } from '../supabaseClient.js';
import { tenantSession } from '../tenant-session.js';

const costs = {
    async render(container) {
        console.log('Rendering Costs Module (Multitenant)');
        container.innerHTML = `
            <div class="module-wrapper px-4">
                <div class="module-header d-flex justify-content-between align-items-center mb-1 py-1">
                    <div>
                        <h1 class="h3 font-weight-bold mb-1">Gestión de Costos</h1>
                        <p class="text-muted mb-0">Registro de gastos fijos y variables</p>
                    </div>
                    <button class="btn btn-danger" id="btn-add-cost">
                        <i class="fas fa-plus me-2"></i>Nuevo Gasto
                    </button>
                </div>

                <div class="row">
                    <div class="col-12">
                        <div class="card shadow-sm border-0 mb-4">
                            <div class="card-body p-0">
                                <div class="d-flex justify-content-between align-items-center mb-0 p-4">
                                    <h5 class="card-title mb-0">Listado de Gastos</h5>
                                    <div class="d-flex gap-2">
                                    <select id="filter-month" class="form-select form-select-sm">
                                        <option value="1">Enero</option><option value="2">Febrero</option>
                                        <option value="3">Marzo</option><option value="4">Abril</option>
                                        <option value="5">Mayo</option><option value="6">Junio</option>
                                        <option value="7">Julio</option><option value="8">Agosto</option>
                                        <option value="9">Septiembre</option><option value="10">Octubre</option>
                                        <option value="11">Noviembre</option><option value="12">Diciembre</option>
                                    </select>
                                    <select id="filter-year" class="form-select form-select-sm">
                                        <option value="2024">2024</option><option value="2025">2025</option>
                                        <option value="2026">2026</option>
                                    </select>
                                </div>
                            </div>
                            
                            <table class="table table-hover align-middle mb-0">
                                <thead class="bg-light">
                                    <tr>
                                        <th class="ps-4">Fecha</th>
                                        <th>Descripción</th>
                                        <th>Tipo</th>
                                        <th>Categoría</th>
                                        <th class="text-end">Monto</th>
                                        <th class="text-end pe-4">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="costs-list">
                                    <tr><td colspan="6" class="text-center py-4 text-muted">Cargando gastos...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            </div>

            <!-- Modal para Nuevo Gasto -->
            <div class="modal fade" id="costModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg" style="border-radius: 20px;">
                        <div class="modal-header border-0 pb-0 pt-4 px-4">
                            <h5 class="modal-title fw-bold">Registrar Nuevo Gasto</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <form id="cost-form" autocomplete="off">
                                <div class="row g-3">
                                    <div class="col-md-6 mb-2">
                                        <label class="form-label font-weight-bold small text-muted text-uppercase" style="letter-spacing: 0.05em;">Fecha *</label>
                                        <input type="date" id="cost-date" class="form-control" required>
                                    </div>
                                    <div class="col-md-6 mb-2">
                                        <label class="form-label font-weight-bold small text-muted text-uppercase" style="letter-spacing: 0.05em;">Categoría *</label>
                                        <select id="cost-cat" class="form-select" required>
                                            <option value="Alquiler">Alquiler</option>
                                            <option value="Sueldos">Sueldos</option>
                                            <option value="Servicios">Servicios (Luz, Agua, etc.)</option>
                                            <option value="Insumos">Insumos</option>
                                            <option value="Marketing">Marketing</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6 mb-2">
                                        <label class="form-label font-weight-bold small text-muted text-uppercase" style="letter-spacing: 0.05em;">Tipo de Gasto *</label>
                                        <select id="cost-type" class="form-select" required>
                                            <option value="Variable">Variable</option>
                                            <option value="Fijo">Fijo</option>
                                        </select>
                                    </div>
                                    <div class="col-12 mb-2">
                                        <label class="form-label font-weight-bold small text-muted text-uppercase" style="letter-spacing: 0.05em;">Descripción *</label>
                                        <input type="text" id="cost-desc" class="form-control" placeholder="Ej: Pago de alquiler marzo" required>
                                    </div>
                                    <div class="col-12 mb-2">
                                        <label class="form-label font-weight-bold small text-muted text-uppercase" style="letter-spacing: 0.05em;">Monto *</label>
                                        <div class="input-group">
                                            <span class="input-group-text bg-white border-end-0 text-muted">$</span>
                                            <input type="number" id="cost-amount" class="form-control border-start-0" required step="0.01">
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer border-0 p-4 pt-0">
                            <button type="button" class="btn btn-light px-4 py-2" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" form="cost-form" class="btn btn-danger px-4 py-2 font-weight-bold shadow-sm">Guardar Gasto</button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .btn-danger { background-color: #ef4444; border-color: #ef4444; }
                .btn-danger:hover { background-color: #dc2626; border-color: #dc2626; }
                .text-danger { color: #ef4444 !important; }
            </style>
        `;

        this.initEventListeners();
        this.loadCosts();
    },

    initEventListeners() {
        const modalElement = document.getElementById('costModal');
        const modal = new bootstrap.Modal(modalElement);
        document.getElementById('btn-add-cost').onclick = () => {
            this.editingId = null;
            document.getElementById('cost-form').reset();
            document.querySelector('#costModal .modal-title').innerText = 'Registrar Nuevo Gasto';
            modal.show();
        };

        const now = new Date();
        document.getElementById('cost-date').value = now.toISOString().split('T')[0];
        document.getElementById('filter-month').value = now.getMonth() + 1;
        document.getElementById('filter-year').value = now.getFullYear();

        document.getElementById('filter-month').onchange = () => this.loadCosts();
        document.getElementById('filter-year').onchange = () => this.loadCosts();

        document.getElementById('cost-form').onsubmit = async (e) => {
            e.preventDefault();
            await this.saveCost();
            modal.hide();
        };
    },

    async loadCosts() {
        const month = parseInt(document.getElementById('filter-month').value);
        const year = parseInt(document.getElementById('filter-year').value);
        const schema = tenantSession.getSchema();

        const firstDay = new Date(year, month - 1, 1).toISOString();
        const lastDay = new Date(year, month, 0, 23, 59, 59).toISOString();

        try {
            const { data, error } = await supabase.schema(schema)
                .from('costs')
                .select('*')
                .gte('date', firstDay)
                .lte('date', lastDay)
                .order('date', { ascending: false });

            if (error) throw error;

            const list = document.getElementById('costs-list');
            if (data.length === 0) {
                list.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No hay gastos registrados en este período</td></tr>';
                return;
            }

            list.innerHTML = data.map(c => `
                <tr>
                    <td class="ps-4">${new Date(c.date).toLocaleDateString()}</td>
                    <td class="fw-bold">${c.description}</td>
                    <td><span class="badge ${c.type === 'Fijo' ? 'bg-info' : 'bg-light text-dark'}">${c.type}</span></td>
                    <td>${c.category}</td>
                    <td class="text-end fw-bold text-danger">$${c.amount.toLocaleString()}</td>
                    <td class="text-end pe-4">
                        <div class="dropdown-actions">
                            <button class="btn-dots" onclick="window.costsModule.toggleActions(${c.id})">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="menu-${c.id}" class="dropdown-menu-custom text-start">
                                <button class="dropdown-item-custom" onclick="window.costsModule.editCost(${c.id})">Editar</button>
                                <button class="dropdown-item-custom danger" onclick="window.costsModule.deleteCost(${c.id})">Eliminar</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `).join('');
            window.costsModule = this;
        } catch (error) {
            console.error("Error loading costs:", error);
            const list = document.getElementById('costs-list');
            list.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Error al cargar datos</td></tr>';
        }
    },

    toggleActions(id) {
        const menu = document.getElementById(`menu-${id}`);
        const allMenus = document.getElementsByClassName('dropdown-menu-custom');
        for (let m of allMenus) {
            if (m.id !== `menu-${id}`) m.classList.remove('show');
        }
        menu.classList.toggle('show');
    },

    async editCost(id) {
        const schema = tenantSession.getSchema();
        try {
            const { data: cost, error } = await supabase.schema(schema)
                .from('costs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (cost) {
                this.editingId = id;
                document.getElementById('cost-date').value = cost.date.split('T')[0];
                document.getElementById('cost-cat').value = cost.category;
                document.getElementById('cost-type').value = cost.type || 'Variable';
                document.getElementById('cost-desc').value = cost.description;
                document.getElementById('cost-amount').value = cost.amount;

                const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('costModal'));
                document.querySelector('#costModal .modal-title').innerText = 'Editar Gasto';
                modal.show();
            }
        } catch (err) { alert(err.message); }
    },

    async deleteCost(id) {
        if (!confirm('¿Estás seguro de eliminar este gasto?')) return;
        const schema = tenantSession.getSchema();
        try {
            const { error } = await supabase.schema(schema)
                .from('costs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            this.loadCosts();
        } catch (err) { alert(err.message); }
    },

    async saveCost() {
        const schema = tenantSession.getSchema();
        const costData = {
            date: document.getElementById('cost-date').value,
            description: document.getElementById('cost-desc').value,
            type: document.getElementById('cost-type').value,
            category: document.getElementById('cost-cat').value,
            amount: parseFloat(document.getElementById('cost-amount').value),
            frequency: document.getElementById('cost-type').value === 'Fijo' ? 'mensual' : '',
            is_recurring: document.getElementById('cost-type').value === 'Fijo',
            notes: ''
        };

        try {
            const query = this.editingId
                ? supabase.schema(schema).from('costs').update(costData).eq('id', this.editingId)
                : supabase.schema(schema).from('costs').insert([costData]);

            const { error } = await query;
            if (error) throw error;

            this.loadCosts();
            this.editingId = null;
            document.getElementById('cost-form').reset();
            document.querySelector('#costModal .modal-title').innerText = 'Registrar Nuevo Gasto';
        } catch (error) {
            console.error(error);
            alert('Error al guardar el gasto: ' + error.message);
        }
    }
};

export default costs;
