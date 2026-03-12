import { supabase } from '../supabaseClient.js';
import { tenantSession } from '../tenant-session.js';

const reports = {
    async render(container) {
        container.innerHTML = `
            <div class="module-header mb-1">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h1 class="h3 font-weight-bold mb-1">Reportes e Inteligencia</h1>
                        <p class="text-muted">Resumen acumulado de recaudación y finanzas</p>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <!-- Resumen Financiero -->
                <div class="col-lg-12">
                    <div class="card shadow-sm border-0 bg-white">
                        <div class="card-body p-4">
                            <h5 class="card-title fw-bold mb-4">Resumen Financiero Mensual</h5>
                            <div class="row g-4 mb-4">
                                <div class="col-md-3">
                                    <div class="p-3 bg-light rounded text-center">
                                        <div class="text-muted small mb-1">Ventas del Mes</div>
                                        <div class="h4 fw-bold text-success mb-0" id="res-sales">$0</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="p-3 bg-light rounded text-center">
                                        <div class="text-muted small mb-1">Costos Fijos</div>
                                        <div class="h4 fw-bold text-danger mb-0" id="res-fixed-costs">$0</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="p-3 bg-light rounded text-center">
                                        <div class="text-muted small mb-1">Costos Variables</div>
                                        <div class="h4 fw-bold text-danger mb-0" id="res-var-costs">$0</div>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="p-3 bg-primary-light rounded text-center">
                                        <div class="text-primary small mb-1">Resultado Neto</div>
                                        <div class="h4 fw-bold text-primary mb-0" id="res-net">$0</div>
                                    </div>
                                </div>
                            </div>

                            <div class="progress" style="height: 30px; border-radius: 8px;">
                                <div id="progress-sales" class="progress-bar bg-success" role="progressbar" style="width: 100%"></div>
                                <div id="progress-costs" class="progress-bar bg-danger" role="progressbar" style="width: 0%"></div>
                            </div>
                            <div class="d-flex justify-content-between mt-2 small text-muted">
                                <span>Ingresos (Ventas)</span>
                                <span>Gastos (Fijos + Variables)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Totales por Medio de Pago -->
                <div class="col-lg-12">
                    <div class="card shadow-sm border-0">
                        <div class="card-body p-4">
                            <h5 class="card-title fw-bold mb-4">Recaudación por Medio de Pago</h5>
                            <div class="row g-4">
                                <div class="col-md-4">
                                    <div class="p-4 rounded-3 border-start border-4 border-success bg-light">
                                        <div class="d-flex align-items-center gap-3">
                                            <div class="bg-success text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;">
                                                <i class="fas fa-money-bill-wave"></i>
                                            </div>
                                            <div>
                                                <div class="text-muted small fw-bold text-uppercase">Efectivo</div>
                                                <div class="h3 fw-bold mb-0 text-success" id="pay-total-cash">$0</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="p-4 rounded-3 border-start border-4 border-primary bg-light">
                                        <div class="d-flex align-items-center gap-3">
                                            <div class="bg-primary text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;">
                                                <i class="fas fa-university"></i>
                                            </div>
                                            <div>
                                                <div class="text-muted small fw-bold text-uppercase">Transferencia</div>
                                                <div class="h3 fw-bold mb-0 text-primary" id="pay-total-trans">$0</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="p-4 rounded-3 border-start border-4 border-info bg-light">
                                        <div class="d-flex align-items-center gap-3">
                                            <div class="bg-info text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 45px; height: 45px;">
                                                <i class="fas fa-credit-card"></i>
                                            </div>
                                            <div>
                                                <div class="text-muted small fw-bold text-uppercase">Tarjeta</div>
                                                <div class="h3 fw-bold mb-0 text-info" id="pay-total-card">$0</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.loadData();
    },

    async loadData() {
        const schema = tenantSession.getSchema();
        try {
            // Fetch all data for the tenant
            const [salesRes, costsRes] = await Promise.all([
                supabase.schema(schema).from('sales').select('*'),
                supabase.schema(schema).from('costs').select('*')
            ]);

            if (salesRes.error) throw salesRes.error;
            if (costsRes.error) throw costsRes.error;

            const currentSales = salesRes.data;
            const currentCosts = costsRes.data;

            this.updateFinancialSummary(currentSales, currentCosts);
            this.updatePaymentMethods(currentSales);

        } catch (error) {
            console.error("Error loading reports data:", error);
        }
    },

    updateFinancialSummary(salesList, costsList) {
        if (!Array.isArray(salesList) || !Array.isArray(costsList)) return;

        const totalSales = salesList.reduce((sum, s) => sum + (s.total || 0), 0);

        const fixedCosts = costsList.filter(c => c.type === 'Fijo').reduce((sum, c) => sum + (c.amount || 0), 0);
        const varCosts = costsList.filter(c => c.type === 'Variable' || !c.type).reduce((sum, c) => sum + (c.amount || 0), 0);
        const net = totalSales - (fixedCosts + varCosts);

        const elSales = document.getElementById('res-sales');
        const elFixed = document.getElementById('res-fixed-costs');
        const elVar = document.getElementById('res-var-costs');
        const elNet = document.getElementById('res-net');

        if (elSales) elSales.innerText = `$${totalSales.toLocaleString()}`;
        if (elFixed) elFixed.innerText = `$${fixedCosts.toLocaleString()}`;
        if (elVar) elVar.innerText = `$${varCosts.toLocaleString()}`;
        if (elNet) elNet.innerText = `$${net.toLocaleString()}`;

        // Progress bar
        const totalOutload = fixedCosts + varCosts;
        const total = totalSales + totalOutload;
        const progSales = document.getElementById('progress-sales');
        const progCosts = document.getElementById('progress-costs');

        if (total > 0 && progSales && progCosts) {
            const salesPct = (totalSales / total) * 100;
            const costsPct = (totalOutload / total) * 100;
            progSales.style.width = `${salesPct}%`;
            progCosts.style.width = `${costsPct}%`;
        }
    },

    updatePaymentMethods(salesList) {
        if (!Array.isArray(salesList)) return;

        let cash = 0, trans = 0, card = 0;
        salesList.forEach(s => {
            const method = (s.payment_method || '').toLowerCase();
            const amount = s.total || 0;
            if (method.includes('efectivo') || method === 'cash') cash += amount;
            else if (method.includes('transf') || method.includes('bank')) trans += amount;
            else if (method.includes('tarjeta') || method.includes('card')) card += amount;
        });

        const elCash = document.getElementById('pay-total-cash');
        const elTrans = document.getElementById('pay-total-trans');
        const elCard = document.getElementById('pay-total-card');

        if (elCash) elCash.innerText = `$${cash.toLocaleString()}`;
        if (elTrans) elTrans.innerText = `$${trans.toLocaleString()}`;
        if (elCard) elCard.innerText = `$${card.toLocaleString()}`;
    }
};

export default reports;
