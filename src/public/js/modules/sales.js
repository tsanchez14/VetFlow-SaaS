import { supabase } from '../supabaseClient.js';
import { tenantSession } from '../tenant-session.js';

const sales = {
    cart: [],
    categories: [],
    products: [],
    owners: [],

    async render(container) {
        await this.loadInitialData();

        container.innerHTML = `
            <div class="module-header mb-1">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h1 class="h3 font-weight-bold mb-1">Nueva Venta (Multitenant)</h1>
                        <p class="text-muted">Gestión de cobros y facturación</p>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- Columna Unica: Selección de Items y Datos -->
                <div class="col-lg-12">
                    <div class="card mb-4 shadow-sm border-0">
                        <div class="card-body">
                            <h5 class="card-title mb-3"><i class="fas fa-search me-2"></i>Nueva Venta</h5>
                            <div class="search-box position-relative mb-4">
                                <input type="text" id="item-search" class="form-control form-control-lg" placeholder="Buscar productos para vender..." autocomplete="off">
                                <div id="search-results" class="search-dropdown d-none shadow"></div>
                            </div>

                            <div class="table-responsive mb-4">
                                <table class="table table-hover align-middle">
                                    <thead class="table-light">
                                        <tr>
                                            <th>Producto</th>
                                            <th>Categoría</th>
                                            <th class="text-center" width="140">Cantidad</th>
                                            <th class="text-end">Precio Unit.</th>
                                            <th class="text-end">Subtotal</th>
                                            <th class="text-end"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="cart-list">
                                        ${this.renderCartItems()}
                                    </tbody>
                                </table>
                            </div>

                            <hr class="my-4">

                            <!-- Datos de Pago e Info -->
                            <div class="row g-4 justify-content-between">
                                <div class="col-md-7">
                                    <div class="payment-method">
                                        <label class="form-label small fw-bold">Método de Pago</label>
                                        <div class="d-flex gap-2">
                                            <input type="radio" class="btn-check" name="payment" id="pay-cash" value="Efectivo" checked>
                                            <label class="btn btn-outline-success flex-fill" for="pay-cash">Efectivo</label>
                                            <input type="radio" class="btn-check" name="payment" id="pay-trans" value="Transferencia">
                                            <label class="btn btn-outline-primary flex-fill" for="pay-trans">Transf.</label>
                                            <input type="radio" class="btn-check" name="payment" id="pay-card" value="Tarjeta">
                                            <label class="btn btn-outline-info flex-fill" for="pay-card">Tarjeta</label>
                                        </div>
                                    </div>
                                </div>

                                <div class="col-md-4">
                                    <div class="totals-section bg-light p-4 rounded-3 h-100 d-flex flex-column justify-content-between">
                                        <div>
                                            <div class="d-flex justify-content-between mb-2">
                                                <span class="text-muted">Subtotal</span>
                                                <span id="cart-subtotal" class="fw-bold">$0.00</span>
                                            </div>
                                            <div class="d-flex justify-content-between mb-4">
                                                <h3 class="fw-bold mb-0">Total</h3>
                                                <h3 id="cart-total" class="fw-bold mb-0 text-success">$0.00</h3>
                                            </div>
                                        </div>
                                        <button id="btn-complete-sale" class="btn btn-success btn-lg w-100 py-3 fw-bold" ${this.cart.length === 0 ? 'disabled' : ''}>
                                            <i class="fas fa-check-circle me-2"></i> REGISTRAR VENTA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Historial de Ventas -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card shadow-sm border-0">
                        <div class="card-body p-0">
                            <div class="p-4 border-bottom d-flex justify-content-between align-items-center">
                                <h5 class="card-title mb-0"><i class="fas fa-history me-2"></i>Historial de Ventas Recientes</h5>
                                <button id="btn-download-pdf" class="btn btn-outline-danger btn-sm">
                                    <i class="fas fa-file-pdf me-1"></i> Descargar PDF Mensual
                                </button>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="bg-light">
                                        <tr>
                                            <th class="ps-4">Fecha</th>
                                            <th>Descripción</th>
                                            <th>Método Pago</th>
                                            <th class="text-end pe-4">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody id="sales-history-list">
                                        <!-- Loaded dynamically -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ... (Styles remain the same) ... -->
        `;
        this.renderStyles(container);
        this.initEventListeners();
        this.updateTotals();
        this.loadSalesHistory();
    },

    renderStyles(container) {
        const style = document.createElement('style');
        style.textContent = `
            .search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: white; z-index: 1000; border-radius: 8px; max-height: 300px; overflow-y: auto; margin-top: 5px; }
            .search-item { padding: 12px 16px; border-bottom: 1px solid #edf2f7; cursor: pointer; transition: background 0.2s; }
            .search-item:hover { background: #f8fafc; }
            .search-item:last-child { border-bottom: none; }
            .fw-bold { font-weight: 700 !important; }
            .form-control:focus, .form-select:focus { border-color: #10b981; box-shadow: 0 0 0 0.25rem rgba(16, 185, 129, 0.1); }
            .btn-success { background-color: #10b981; border-color: #10b981; }
            .btn-success:hover { background-color: #059669; border-color: #059669; }
            .text-success { color: #10b981 !important; }
            .badge-stock { font-size: 0.7rem; padding: 2px 6px; }
        `;
        container.appendChild(style);
    },

    async loadSalesHistory() {
        const historyList = document.getElementById('sales-history-list');
        if (!historyList) return;

        const schema = tenantSession.getSchema();
        try {
            const { data: sales, error } = await supabase.schema(schema)
                .from('sales')
                .select('*')
                .order('date', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (sales.length === 0) {
                historyList.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No hay ventas registradas recientemente</td></tr>';
                return;
            }

            historyList.innerHTML = sales.map(s => `
                <tr>
                    <td class="ps-4">
                        <div class="small fw-bold">${new Date(s.date).toLocaleDateString()}</div>
                        <div class="text-muted smaller">${new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                        <div class="small text-muted text-truncate" style="max-width: 250px;" title="${s.description || ''}">
                            ${s.description || 'Sin descripción'}
                        </div>
                    </td>
                    <td>
                        <span class="badge rounded-pill ${this.getPaymentBadgeClass(s.payment_method)} border" style="font-weight: 500; padding: 0.5em 1em;">
                            ${s.payment_method || 'N/A'}
                        </span>
                    </td>
                    <td class="text-end pe-4">
                        <span class="fw-bold text-success">$${s.total.toLocaleString()}</span>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error(error);
            historyList.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Error al cargar el historial</td></tr>';
        }
    },

    getPaymentBadgeClass(method) {
        switch (method) {
            case 'Efectivo': return 'bg-success-light text-success';
            case 'Transferencia': return 'bg-primary-light text-primary';
            case 'Tarjeta': return 'bg-info-light text-info';
            default: return 'bg-light text-dark';
        }
    },

    async loadInitialData() {
        const schema = tenantSession.getSchema();
        try {
            const { data: products, error } = await supabase.schema(schema)
                .from('products')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            this.products = products;
        } catch (error) {
            console.error(error);
            alert("No se pudieron cargar los productos.");
        }
    },

    initEventListeners() {
        const searchInput = document.getElementById('item-search');
        const resultsBox = document.getElementById('search-results');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length < 2) {
                resultsBox.classList.add('d-none');
                return;
            }

            const filtered = this.products.filter(p => p.name.toLowerCase().includes(query));
            if (filtered.length > 0) {
                resultsBox.innerHTML = filtered.map(p => `
                    <div class="search-item" data-id="${p.id}">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold">${p.name}</div>
                                <div class="small text-muted">${p.category || 'Sin categoría'}</div>
                            </div>
                            <div class="text-end">
                                <div class="fw-bold text-success">$${p.sell_price.toLocaleString()}</div>
                                <div class="badge ${p.stock <= p.min_stock ? 'bg-danger' : 'bg-light text-dark'} badge-stock">
                                    Stock: ${p.stock}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('');
                resultsBox.classList.remove('d-none');
            } else {
                resultsBox.innerHTML = '<div class="p-3 text-center text-muted">No se encontraron productos</div>';
                resultsBox.classList.remove('d-none');
            }
        });

        resultsBox.addEventListener('click', (e) => {
            const item = e.target.closest('.search-item');
            if (item) {
                const id = parseInt(item.dataset.id);
                this.addToCart(id);
                searchInput.value = '';
                resultsBox.classList.add('d-none');
            }
        });

        document.getElementById('cart-list').addEventListener('click', (e) => {
            const btnRemove = e.target.closest('.btn-remove');
            if (btnRemove) {
                const index = parseInt(btnRemove.dataset.index);
                this.cart.splice(index, 1);
                this.renderCart();
            }
            const btnQty = e.target.closest('.btn-qty');
            if (btnQty) {
                const index = parseInt(btnQty.dataset.index);
                const delta = parseInt(btnQty.dataset.delta);
                this.updateQuantity(index, delta);
            }
        });

        document.getElementById('btn-complete-sale').addEventListener('click', () => this.completeSale());

        const btnPdf = document.getElementById('btn-download-pdf');
        if (btnPdf) btnPdf.addEventListener('click', () => this.downloadMonthHistory());
    },

    updateQuantity(index, delta) {
        if (this.cart[index]) {
            this.cart[index].quantity += delta;
            if (this.cart[index].quantity <= 0) this.cart.splice(index, 1);
            this.renderCart();
        }
    },

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            const existing = this.cart.find(c => c.id === productId);
            if (existing) existing.quantity++;
            else {
                this.cart.push({
                    id: product.id,
                    name: product.name,
                    category: product.category || 'Gral',
                    price: product.sell_price,
                    quantity: 1
                });
            }
            this.renderCart();
        }
    },

    renderCart() {
        const cartList = document.getElementById('cart-list');
        cartList.innerHTML = this.renderCartItems();
        this.updateTotals();
        document.getElementById('btn-complete-sale').disabled = this.cart.length === 0;
    },

    renderCartItems() {
        if (this.cart.length === 0) return '<tr><td colspan="6" class="text-center py-4 text-muted">No hay items en la venta</td></tr>';
        return this.cart.map((item, index) => `
            <tr>
                <td><div class="fw-bold">${item.name}</div></td>
                <td><span class="text-muted small">${item.category}</span></td>
                <td class="text-center">
                    <div class="input-group input-group-sm justify-content-center">
                        <button class="btn btn-outline-secondary btn-qty" data-index="${index}" data-delta="-1">-</button>
                        <span class="input-group-text bg-white px-3">${item.quantity}</span>
                        <button class="btn btn-outline-secondary btn-qty" data-index="${index}" data-delta="1">+</button>
                    </div>
                </td>
                <td class="text-end fw-bold">$${item.price.toLocaleString()}</td>
                <td class="text-end fw-bold">$${(item.price * item.quantity).toLocaleString()}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-danger border-0 btn-remove" data-index="${index}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    updateTotals() {
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('cart-subtotal').innerText = `$${total.toLocaleString()}`;
        document.getElementById('cart-total').innerText = `$${total.toLocaleString()}`;
    },

    async completeSale() {
        const btn = document.getElementById('btn-complete-sale');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

        const schema = tenantSession.getSchema();
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const saleData = {
            payment_method: document.querySelector('input[name="payment"]:checked').value,
            description: this.cart.map(i => `${i.quantity}x ${i.name}`).join(', '),
            total: total,
            date: new Date().toISOString()
        };

        try {
            // 1. Insert Sale record
            const { data: sale, error: sError } = await supabase.schema(schema)
                .from('sales')
                .insert([saleData])
                .select()
                .single();

            if (sError) throw sError;

            // 2. Decrement stock for each item (In a real app, use an Edge Function or RPC)
            for (const item of this.cart) {
                const prod = this.products.find(p => p.id === item.id);
                if (prod) {
                    await supabase.schema(schema).from('products').update({ stock: prod.stock - item.quantity }).eq('id', item.id);
                }
            }

            alert('Venta realizada con éxito');
            this.cart = [];
            this.renderCart();
            await this.loadInitialData(); // Refresh products memory
            this.loadSalesHistory();
        } catch (error) {
            alert('Error al procesar la venta: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle me-2"></i> REGISTRAR VENTA';
        }
    },

    async downloadMonthHistory() {
        // Updated to use Supabase instead of server API
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const schema = tenantSession.getSchema();

        const btn = document.getElementById('btn-download-pdf');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Cargando...';

        try {
            const { data: salesData, error } = await supabase.schema(schema)
                .from('sales')
                .select('*')
                .gte('date', firstDay)
                .lte('date', lastDay)
                .order('date', { ascending: true });

            if (error) throw error;
            if (!salesData || salesData.length === 0) {
                alert('No hay ventas este mes.');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text("Reporte de Ventas", 14, 20);

            const tableData = salesData.map(s => [new Date(s.date).toLocaleDateString(), s.description, s.payment_method, `$${s.total.toLocaleString()}`]);
            doc.autoTable({ startY: 30, head: [['Fecha', 'Detalle', 'Pago', 'Total']], body: tableData });
            doc.save(`Ventas_${now.getMonth() + 1}_${now.getFullYear()}.pdf`);
        } catch (error) {
            alert("Error al generar PDF");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
};

export default sales;
