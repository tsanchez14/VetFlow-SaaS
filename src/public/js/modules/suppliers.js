import { supabase } from '../supabaseClient.js';
import { tenantSession } from '../tenant-session.js';

const suppliers = {
    async render(container) {
        container.innerHTML = `
            <div class="module-wrapper">
                <div class="module-header d-flex justify-content-between align-items-center mb-1">
                    <div>
                        <h1 class="h3 font-weight-bold">Proveedores</h1>
                        <p class="text-muted">Gestión de laboratorios y distribuidores</p>
                    </div>
                    <button id="btn-add-supplier" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Nuevo Proveedor
                    </button>
                </div>

                <div class="card">
                    <div class="card-body">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Contacto</th>
                                    <th>Teléfono / Email</th>
                                    <th>Productos</th>
                                    <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="suppliers-list">
                                <!-- Loaded dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>
            </div>

            <div id="modal-container"></div>

            <style>
                .module-wrapper { padding: 0.25rem 0.5rem; }
                .table { width: 100%; border-collapse: collapse; }
                .table th { text-align: left; padding: 1rem; border-bottom: 2px solid #edf2f7; color: #718096; font-size: 0.8rem; }
                .table td { padding: 1rem; border-bottom: 1px solid #edf2f7; }
            </style>
        `;

        await this.loadSuppliers();
        this.attachEvents();
    },

    attachEvents() {
        document.getElementById('btn-add-supplier').addEventListener('click', () => this.showSupplierForm());
    },

    async loadSuppliers() {
        const list = document.getElementById('suppliers-list');
        const schema = tenantSession.getSchema();
        try {
            const { data, error } = await supabase.schema(schema)
                .from('suppliers')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            if (data.length === 0) {
                list.innerHTML = '<tr><td colspan="5" class="text-center py-4">No hay proveedores registrados</td></tr>';
                return;
            }

            list.innerHTML = data.map(s => `
                <tr>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.contact || '-'}</td>
                    <td>
                        <div class="small">
                            <i class="fas fa-phone fa-fw"></i> ${s.phone || 'N/A'}<br>
                            <i class="fas fa-envelope fa-fw"></i> ${s.email || 'N/A'}
                        </div>
                    </td>
                    <td><span class="text-muted small">${s.products || '-'}</span></td>
                    <td class="text-end pe-3">
                        <div class="dropdown-actions">
                            <button class="btn-dots" onclick="window.suppliersModule.toggleActions(${s.id})">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="menu-${s.id}" class="dropdown-menu-custom text-start">
                                <button class="dropdown-item-custom" onclick="window.suppliersModule.editSupplier(${s.id})">Editar</button>
                                <button class="dropdown-item-custom danger" onclick="window.suppliersModule.deleteSupplier(${s.id})">Eliminar</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `).join('');
            window.suppliersModule = this;
        } catch (e) {
            console.error(e);
            list.innerHTML = '<tr><td colspan="5">Error al cargar proveedores</td></tr>';
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

    async editSupplier(id) {
        const schema = tenantSession.getSchema();
        try {
            const { data: supplier, error } = await supabase.schema(schema)
                .from('suppliers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (supplier) {
                this.editingId = id;
                this.showSupplierForm(supplier);
            }
        } catch (err) { alert(err.message); }
    },

    async deleteSupplier(id) {
        if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;
        const schema = tenantSession.getSchema();
        try {
            const { error } = await supabase.schema(schema)
                .from('suppliers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            this.loadSuppliers();
        } catch (err) { alert(err.message); }
    },

    async showSupplierForm(supplierToEdit = null) {
        const container = document.createElement('div');
        container.id = 'supplier-modal-container';
        document.body.appendChild(container);

        container.innerHTML = `
            <div class="custom-modal-backdrop">
                <div class="custom-modal">
                    <h3 class="mb-4">${supplierToEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                    <form id="supplier-form" autocomplete="off">
                        <div class="form-group mb-3">
                            <label>Nombre del Proveedor*</label>
                            <input type="text" name="name" class="form-control" placeholder="Ej: Distribuidora Vet..." value="${supplierToEdit ? supplierToEdit.name : ''}" required>
                        </div>
                        <div class="form-group mb-3">
                            <label>Persona de Contacto</label>
                            <input type="text" name="contact" class="form-control" placeholder="Ej: Juan Gomez" value="${supplierToEdit ? (supplierToEdit.contact || '') : ''}">
                        </div>
                        <div class="row mb-3">
                            <div class="col">
                                <label>Teléfono</label>
                                <input type="text" name="phone" class="form-control" value="${supplierToEdit ? (supplierToEdit.phone || '') : ''}">
                            </div>
                            <div class="col">
                                <label>Email</label>
                                <input type="email" name="email" class="form-control" value="${supplierToEdit ? (supplierToEdit.email || '') : ''}">
                            </div>
                        </div>
                        <div class="form-group mb-4">
                            <label>Productos que suministra</label>
                            <textarea name="products" class="form-control" rows="2" placeholder="Ej: Vacunas, Alimento Balanceado...">${supplierToEdit ? (supplierToEdit.products || '') : ''}</textarea>
                        </div>
                        <div class="d-flex justify-content-end gap-2 mt-2">
                            <button type="button" class="btn btn-link py-1 text-decoration-none" onclick="document.getElementById('supplier-modal-container').remove()">Cancelar</button>
                            <button type="submit" class="btn btn-primary px-3 py-2 font-weight-bold">${supplierToEdit ? 'Actualizar Proveedor' : 'Guardar Proveedor'}</button>
                        </div>
                    </form>
                </div>
            </div>
            <style>
                .custom-modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
                .custom-modal { background: white; padding: 1.75rem; border-radius: 16px; width: 400px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); }
                .form-group label { display: block; margin-bottom: 0.4rem; font-weight: 600; font-size: 0.8rem; color: #4a5568; }
                .form-control { width: 100%; padding: 0.7rem 1rem; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 0.9rem; }
                .form-control:focus { border-color: #4e73df; outline: none; box-shadow: 0 0 0 3px rgba(78, 115, 223, 0.1); }
                .row { display: flex; margin: 0 -8px; }
                .col { flex: 1; padding: 0 8px; }
                .mb-4 { margin-bottom: 1.5rem !important; }
                .mb-5 { margin-bottom: 2.5rem !important; }
                .gap-3 { gap: 1rem; }
                .font-weight-bold { font-weight: 600; }
            </style>
        `;

        document.getElementById('supplier-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            const schema = tenantSession.getSchema();
            try {
                const query = this.editingId
                    ? supabase.schema(schema).from('suppliers').update(data).eq('id', this.editingId)
                    : supabase.schema(schema).from('suppliers').insert([data]);

                const { error } = await query;
                if (error) throw error;

                container.remove();
                this.editingId = null;
                this.loadSuppliers();
            } catch (err) { alert(err.message); }
        });
    }
};

export default suppliers;
