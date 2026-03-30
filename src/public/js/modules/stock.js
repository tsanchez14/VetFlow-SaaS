import { db as supabase } from '../utils/mock-db.js';
import { tenantSession } from '../tenant-session.js';

const stock = {
    async render(container) {
        container.innerHTML = `
            <div class="module-wrapper">
                <div class="module-header d-flex justify-content-between align-items-center mb-1">
                    <div>
                        <h1 class="h3 font-weight-bold">Control de Stock</h1>
                        <p class="text-muted small">Inventario de productos y suministros</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button id="btn-add-product" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Nuevo Producto
                        </button>
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card p-3 text-center shadow-sm border-0">
                            <span class="text-muted small">Total Productos</span>
                            <h4 id="total-products" class="mb-0 fw-bold">-</h4>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card p-3 text-center border-danger-light shadow-sm border-0">
                            <span class="text-danger small">Stock Bajo</span>
                            <h4 id="low-stock-count" class="text-danger mb-0 fw-bold">-</h4>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0">
                    <div class="card-body p-0">
                        <table class="table align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4">Producto</th>
                                    <th>Categoría</th>
                                    <th>Stock</th>
                                    <th>Precio Venta</th>
                                    <th>Estado</th>
                                    <th class="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="products-list">
                                <!-- Loaded dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="modal-container"></div>

            <style>
                .module-wrapper { padding: 0.25rem 0.5rem; }
                .border-danger-light { border: 1px solid #fee2e2; background: #fef2f2; }
                .text-danger { color: #dc2626; }
                .table-light { background: #f8fafc; }
                .badge-stock { padding: 6px 12px; border-radius: 50px; font-size: 0.7rem; font-weight: 700; }
                .badge-low { background: #fef2f2; color: #dc2626; }
                .badge-ok { background: #f0fdf4; color: #16a34a; }
                
                /* Global action menu override for modules */
                .dropdown-actions { position: relative; }
                .btn-dots { background: none; border: none; color: #94a3b8; padding: 5px; cursor: pointer; border-radius: 4px; }
                .btn-dots:hover { background: #f1f5f9; }
                .dropdown-menu-custom { 
                    position: absolute; right: 0; top: 100%; background: white; border: 1px solid #e2e8f0; 
                    border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); 
                    display: none; min-width: 120px; z-index: 100;
                }
                .dropdown-menu-custom.show { display: block; }
                .dropdown-item-custom { display: block; width: 100%; padding: 8px 16px; border: none; background: none; text-align: left; font-size: 0.875rem; color: #4b5563; }
                .dropdown-item-custom:hover { background: #f9fafb; }
                .dropdown-item-custom.danger { color: #dc2626; }
            </style>
        `;

        await this.loadProducts();
        this.attachEvents();
    },

    attachEvents() {
        document.getElementById('btn-add-product').onclick = () => this.showProductForm();
    },

    async loadProducts() {
        const list = document.getElementById('products-list');
        const schema = tenantSession.getSchema();

        try {
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            document.getElementById('total-products').textContent = products.length;
            const lowStock = products.filter(p => Number(p.stock) <= Number(p.min_stock));
            document.getElementById('low-stock-count').textContent = lowStock.length;

            if (products.length === 0) {
                list.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">No hay productos registrados</td></tr>';
            } else {
                list.innerHTML = products.map(p => `
                    <tr>
                        <td class="ps-4"><strong>${p.name}</strong></td>
                        <td>${p.category || 'Gral'}</td>
                        <td>${p.stock}</td>
                        <td class="fw-bold text-dark">$${p.sell_price.toLocaleString()}</td>
                        <td>
                            <span class="badge-stock ${Number(p.stock) <= Number(p.min_stock) ? 'badge-low' : 'badge-ok'}">
                                ${Number(p.stock) <= Number(p.min_stock) ? 'Stock Bajo' : 'Normal'}
                            </span>
                        </td>
                        <td class="text-end pe-4">
                            <div class="dropdown-actions">
                                <button class="btn-dots" onclick="window.stockModule.toggleActions(${p.id})">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div id="menu-${p.id}" class="dropdown-menu-custom text-start">
                                    <button class="dropdown-item-custom" onclick="window.stockModule.editProduct(${p.id})">Editar</button>
                                    <button class="dropdown-item-custom danger" onclick="window.stockModule.deleteProduct(${p.id})">Eliminar</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }

            window.stockModule = this;
        } catch (e) {
            console.error(e);
            list.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Error al cargar productos</td></tr>';
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

    async editProduct(id) {
        const schema = tenantSession.getSchema();
        try {
            const { data: product, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            this.editingId = id;
            this.showProductForm(product);
        } catch (err) { alert(err.message); }
    },

    async deleteProduct(id) {
        if (!confirm('¿Estás seguro de eliminar este producto?')) return;
        const schema = tenantSession.getSchema();
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            this.loadProducts();
        } catch (err) { alert(err.message); }
    },

    async showProductForm(productToEdit = null) {
        const container = document.createElement('div');
        container.id = 'product-modal-container';
        document.body.appendChild(container);

        const schema = tenantSession.getSchema();

        try {
            const { data: suppliers } = await supabase
                .from('suppliers')
                .select('id, name')
                .order('name', { ascending: true });

            container.innerHTML = `
                <div class="custom-modal-backdrop">
                    <div class="custom-modal">
                        <h3 class="mb-4 fw-bold">${productToEdit ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                        <form id="product-form" autocomplete="off">
                            <div class="form-group mb-3">
                                <label>Nombre del Producto*</label>
                                <input type="text" name="name" class="form-control" placeholder="Ej: Amoxicilina 500mg" value="${productToEdit ? productToEdit.name : ''}" required>
                            </div>
                            <div class="form-group mb-3">
                                <label>Categoría</label>
                                <input type="text" name="category" class="form-control" placeholder="Ej: Medicamento" value="${productToEdit ? (productToEdit.category || '') : ''}">
                            </div>
                            <div class="row g-2 mb-3">
                                <div class="col">
                                    <label>Stock</label>
                                    <input type="number" name="stock" class="form-control" value="${productToEdit ? productToEdit.stock : '0'}">
                                </div>
                                <div class="col">
                                    <label>Stock Mínimo</label>
                                    <input type="number" name="min_stock" class="form-control" value="${productToEdit ? productToEdit.min_stock : '5'}">
                                </div>
                            </div>
                            <div class="row g-2 mb-3">
                                <div class="col">
                                    <label>Costo ($)</label>
                                    <input type="number" step="0.01" name="cost_price" class="form-control" value="${productToEdit ? (productToEdit.cost_price || '') : ''}">
                                </div>
                                <div class="col">
                                    <label>Venta ($)</label>
                                    <input type="number" step="0.01" name="sell_price" class="form-control" value="${productToEdit ? (productToEdit.sell_price || '') : ''}">
                                </div>
                            </div>
                            <div class="form-group mb-4">
                                <label>Proveedor</label>
                                <select name="supplier_id" class="form-select">
                                    <option value="">Seleccionar proveedor...</option>
                                    ${(suppliers || []).map(s => `<option value="${s.id}" ${productToEdit && productToEdit.supplier_id == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="d-flex justify-content-end gap-2 mt-2">
                                <button type="button" class="btn btn-light border px-4" onclick="document.getElementById('product-modal-container').remove()">Cancelar</button>
                                <button type="submit" class="btn btn-primary px-4 fw-bold">${productToEdit ? 'Actualizar' : 'Guardar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
                <style>
                    .custom-modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1100; backdrop-filter: blur(4px); }
                    .custom-modal { background: white; padding: 2rem; border-radius: 20px; width: 440px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
                    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.8rem; color: #4b5563; }
                    .form-control, .form-select { width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid #e5e7eb; font-size: 0.9375rem; }
                    .form-control:focus, .form-select:focus { border-color: #3b82f6; outline: none; ring: 3px rgba(59, 130, 246, 0.1); }
                </style>
            `;

            document.getElementById('product-form').onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());

                try {
                    // Asegurar tipos numéricos para comparaciones correctas
                    data.stock = Number(data.stock || 0);
                    data.min_stock = Number(data.min_stock || 0);
                    data.cost_price = Number(data.cost_price || 0);
                    data.sell_price = Number(data.sell_price || 0);

                    if (this.editingId) {
                        const { error } = await supabase.from('products').update(data).eq('id', this.editingId);
                        if (error) throw error;
                    } else {
                        data.tenant_id = tenantSession.getTenant()?.id;
                        const { error } = await supabase.from('products').insert([data]);
                        if (error) throw error;
                    }
                    container.remove();
                    this.editingId = null;
                    this.loadProducts();
                } catch (err) { alert(err.message); }
            };

        } catch (e) { alert("Error: " + e.message); }
    }
};

export default stock;
