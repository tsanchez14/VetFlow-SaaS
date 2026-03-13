require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto'); // Necesario para validar el webhook
const { MercadoPagoConfig, Preference } = require('mercadopago'); // Import MP SDK
const supabase = require('./supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- API Routes ---

// Appointments
app.get('/api/appointments', async (req, res) => {
    const { date } = req.query;

    let query = supabase
        .from('appointments')
        .select(`
            *,
            pet:pets(name),
            vet:vets(name),
            owner:pets(owner:owners(name))
        `);

    if (date) {
        query = query.eq('date', date);
    }

    query = query.order('time', { ascending: true });

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    // Flatten/Adapt the structure to match what frontend expects
    const formatted = data.map(a => ({
        ...a,
        pet_name: a.pet?.name || a.display_name,
        vet_name: a.vet?.name || '',
        owner_name: a.pet?.owner?.name || ''
    }));

    res.json(formatted);
});

app.post('/api/appointments', async (req, res) => {
    const { pet_id, vet_id, display_name, phone, date, time, reason } = req.body;
    const { data, error } = await supabase
        .from('appointments')
        .insert([{
            pet_id: pet_id || null,
            vet_id: vet_id || null,
            display_name,
            phone,
            date,
            time,
            reason,
            status: 'pending'
        }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
});

app.patch('/api/appointments/:id/status', async (req, res) => {
    const { status } = req.body;
    const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', req.params.id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ updated: data.length });
});

app.get('/api/vets', async (req, res) => {
    const { data, error } = await supabase
        .from('vets')
        .select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Products & Stock
app.get('/api/products', async (req, res) => {
    const { data, error } = await supabase
        .from('products')
        .select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.get('/api/products/low-stock', async (req, res) => {
    try {
        const { data: allProducts, error: err } = await supabase.from('products').select('*');
        if (err) throw err;
        const lowStock = allProducts.filter(p => p.stock <= p.min_stock);
        res.json(lowStock);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { name, category, stock, unit, cost_price, sell_price, min_stock, supplier_id } = req.body;
    const { data, error } = await supabase
        .from('products')
        .insert([{ name, category, stock, unit, cost_price, sell_price, min_stock, supplier_id }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
});

app.put('/api/products/:id', async (req, res) => {
    const { name, category, stock, unit, cost_price, sell_price, min_stock, supplier_id } = req.body;
    const { data, error } = await supabase
        .from('products')
        .update({ name, category, stock, unit, cost_price, sell_price, min_stock, supplier_id })
        .eq('id', req.params.id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ updated: data.length });
});

app.patch('/api/products/:id', async (req, res) => {
    const { data, error } = await supabase
        .from('products')
        .update(req.body)
        .eq('id', req.params.id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ updated: data.length });
});

app.delete('/api/products/:id', async (req, res) => {
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: 1 });
});

// Suppliers
app.get('/api/suppliers', async (req, res) => {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/suppliers', async (req, res) => {
    const { name, contact, phone, email, products } = req.body;
    const { data, error } = await supabase
        .from('suppliers')
        .insert([{ name, contact, phone, email, products }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
});

app.put('/api/suppliers/:id', async (req, res) => {
    const { name, contact, phone, email, products } = req.body;
    const { data, error } = await supabase
        .from('suppliers')
        .update({ name, contact, phone, email, products })
        .eq('id', req.params.id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ updated: data.length });
});

app.delete('/api/suppliers/:id', async (req, res) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: 1 });
});

// Sales Categories (Synced with Stock) - v2
app.get('/api/v2/sales-categories', async (req, res) => {
    const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .neq('category', '');

    if (error) return res.status(500).json({ error: error.message });

    const uniqueCategories = [...new Set(data.map(r => r.category))];
    const categories = uniqueCategories.map((name, index) => ({ id: index + 1, name }));

    if (categories.length === 0) {
        return res.json([{ id: 1, name: 'Venta General' }]);
    }
    res.json(categories);
});

app.post('/api/sales/categories', async (req, res) => {
    const { name } = req.body;
    const { data, error } = await supabase
        .from('sales_categories')
        .insert([{ name }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
});

// Costs
app.get('/api/costs', async (req, res) => {
    const { month, year } = req.query;
    let query = supabase.from('costs').select('*');

    if (month && year) {
        // PostgreSQL uses different date functions. 
        // We can use ILIKE or TO_CHAR if needed, but simple filtering is better if stored as DATE
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

        query = query.gte('date', startDate).lte('date', endDate);
    }

    query = query.order('date', { ascending: false });
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/costs', async (req, res) => {
    const { date, description, type, category, amount, frequency, supplier, is_recurring, notes } = req.body;
    const { data, error } = await supabase
        .from('costs')
        .insert([{ date, description, type, category, amount, frequency, supplier, is_recurring: is_recurring ? 1 : 0, notes }])
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data[0].id });
});

app.put('/api/costs/:id', async (req, res) => {
    const { date, description, type, category, amount, frequency, supplier, is_recurring, notes } = req.body;
    const { data, error } = await supabase
        .from('costs')
        .update({ date, description, type, category, amount, frequency, supplier, is_recurring: is_recurring ? 1 : 0, notes })
        .eq('id', req.params.id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ updated: data.length });
});

app.delete('/api/costs/:id', async (req, res) => {
    const { error } = await supabase.from('costs').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: 1 });
});

// Sales
app.get('/api/sales', async (req, res) => {
    const { month, year, date } = req.query;
    let query = supabase
        .from('sales')
        .select(`
            *,
            category:sales_categories(name),
            owner:owners(name)
        `);

    if (date) {
        // Handle single date filter
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;
        query = query.gte('date', startOfDay).lte('date', endOfDay);
    } else if (month && year) {
        const startDate = `${year}-${month.padStart(2, '0')}-01T00:00:00`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}T23:59:59`;
        query = query.gte('date', startDate).lte('date', endDate);
    }

    query = query.order('date', { ascending: false });
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Flatten for frontend
    const formatted = data.map(s => ({
        ...s,
        category_name: s.category?.name || '',
        client_name: s.owner?.name || ''
    }));

    res.json(formatted);
});

app.post('/api/sales', async (req, res) => {
    const { owner_id, total, discount, payment_method, items, description, category_id, notes, date } = req.body;

    try {
        // For simple transactions in Supabase JS without RPC, we can do sequential calls.
        // If high concurrency is expected, an RPC function would be better.
        // For this app, sequential is likely fine but we should be careful.

        const { data: saleData, error: saleError } = await supabase
            .from('sales')
            .insert([{
                owner_id: owner_id || null,
                total,
                discount,
                payment_method,
                description,
                category_id,
                notes,
                date: date || new Date().toISOString()
            }])
            .select();

        if (saleError) throw saleError;
        const saleId = saleData[0].id;

        const saleItems = items.map(item => ({
            sale_id: saleId,
            product_id: item.product_id || null,
            service_name: item.service_name || null,
            quantity: item.quantity,
            price: item.price
        }));

        const { error: itemsError } = await supabase.from('sale_items').insert(saleItems);
        if (itemsError) throw itemsError;

        // Update Stock
        for (const item of items) {
            if (item.product_id) {
                // We need the current stock first to subtract
                const { data: pData } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
                if (pData) {
                    await supabase.from('products').update({ stock: pData.stock - item.quantity }).eq('id', item.product_id);
                }
            }
        }

        res.json({ id: saleId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reports
app.get('/api/reports/monthly_recruitment', async (req, res) => {
    const { month, year } = req.query;

    const startDate = `${year}-${month.padStart(2, '0')}-01T00:00:00`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}T23:59:59`;

    const { data, error } = await supabase
        .from('sales')
        .select(`
            total,
            category:sales_categories(name)
        `)
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) return res.status(500).json({ error: error.message });

    // Group and sum manually since Supabase doesn't support GROUP BY directly via JS client well
    const summary = data.reduce((acc, sale) => {
        const catName = sale.category?.name || 'Sin Categoría';
        acc[catName] = (acc[catName] || 0) + sale.total;
        return acc;
    }, {});

    const rows = Object.keys(summary).map(cat => ({
        category: cat,
        total: summary[cat]
    }));

    res.json(rows);
});

// Logic for recurring costs and automatic cleanup
const autoCleanupMonthlyData = async () => {
    const now = new Date();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentYear = now.getFullYear().toString();

    console.log(`[Cleanup] Checking data for ${currentMonth}/${currentYear}...`);

    // In Supabase, we use simple delete with filters
    const startDate = `${currentYear}-${currentMonth}-01T00:00:00`;

    // Delete Sales NOT in current month
    const { error: saleErr } = await supabase.from('sales').delete().or(`date.lt.${startDate}`);
    if (saleErr) console.error("[Cleanup] Error deleting old sales:", saleErr);

    // Delete Costs NOT in current month AND not recurring templates
    const { error: costErr } = await supabase
        .from('costs')
        .delete()
        .lt('date', `${currentYear}-${currentMonth}-01`)
        .eq('is_recurring', 0);
    if (costErr) console.error("[Cleanup] Error deleting old costs:", costErr);
};

const processRecurringCosts = async () => {
    const now = new Date();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentYear = now.getFullYear().toString();
    const currentDate = now.toISOString().split('T')[0];

    // Get recurring templates
    const { data: templates, error } = await supabase.from('costs').select('*').eq('is_recurring', 1);
    if (error || !templates) return;

    for (const cost of templates) {
        // Check if already created for this month
        const startDate = `${currentYear}-${currentMonth}-01`;
        const { data: existing } = await supabase
            .from('costs')
            .select('id')
            .eq('description', cost.description)
            .eq('type', 'Fijo')
            .gte('date', startDate)
            .single();

        if (!existing) {
            await supabase.from('costs').insert([{
                date: currentDate,
                description: cost.description,
                type: cost.type,
                category: cost.category,
                amount: cost.amount,
                frequency: cost.frequency,
                supplier: cost.supplier,
                is_recurring: 0,
                notes: cost.notes + ' (Auto-recurrido)'
            }]);
        }
    }
};

// Mercado Pago Webhook
app.post('/api/webhooks/mercadopago', async (req, res) => {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    const secret = process.env.MP_WEBHOOK_SECRET;

    if (!signature || !secret) {
        console.warn(`[MP Webhook] Falta firma o secreto. ID: ${requestId}`);
        // En producción: return res.status(400).send('Unauthorized');
    }

    try {
        // Validación de Firma HMAC (Opcional pero recomendado para Prod)
        // const [tsPart, v1Part] = signature.split(',');
        // const ts = tsPart.split('=')[1];
        // const v1 = v1Part.split('=')[1];
        // const manifest = `id:${req.body.data.id};request-id:${requestId};ts:${ts};`;
        // const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

        // if (hmac !== v1) throw new Error('Firma inválida');

        const { type, data } = req.body;
        console.log(`[MP Webhook] Evento recibido: ${type} - ID: ${data?.id}`);

        if (type === 'payment' || type === 'subscription_preapproval') {
            // Aquí iría la lógica para consultar la API de MP y actualizar el tenant
            // similar a lo que simulamos en el frontend pero con privilegios de servidor.
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('[MP Webhook] Error:', error.message);
        res.status(200).send('OK'); // MP recomienda siempre devolver 200 aunque falle el proceso interno
    }
});

// Mercado Pago - Crear Preferencia de Pago
app.post('/api/create_preference', async (req, res) => {
    try {
        const { title, price } = req.body;

        // Validar que se reciba el token
        const client_id = process.env.MP_ACCESS_TOKEN;
        if (!client_id) {
            return res.status(500).json({ error: "No se configuró el MP_ACCESS_TOKEN en el servidor." });
        }

        // Configurar el SDK con el Access Token del entorno
        const client = new MercadoPagoConfig({ accessToken: client_id, options: { timeout: 5000 } });
        const preference = new Preference(client);

        // Crear el objeto de preferencia que MP requiere
        const result = await preference.create({
            body: {
                items: [
                    {
                        title: title || 'Suscripción VetFlow',
                        quantity: 1,
                        unit_price: Number(price) || 4500,
                        currency_id: 'ARS'
                    }
                ],
                // back_urls y auto_return (Opcional)
                back_urls: {
                    success: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/dashboard.html` : 'http://localhost:3000/dashboard.html',
                    failure: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/dashboard.html` : 'http://localhost:3000/dashboard.html',
                    pending: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/dashboard.html` : 'http://localhost:3000/dashboard.html'
                },
                auto_return: "approved",
            }
        });

        // Retornar el punto de inicio para que el frontend redirija
        res.json({ id: result.id, init_point: result.sandbox_init_point }); // sandbox_init_point para pruebas
    } catch (error) {
        console.error("Error creando preferencia MP:", error);
        res.status(500).json({ error: error.message });
    }
});

// Run cleanup and recurring costs check on server start
setTimeout(() => {
    autoCleanupMonthlyData();
    processRecurringCosts();
}, 5000);

// Static files and fallback - v1.2
app.use(express.static(path.join(__dirname, 'public')));

// App route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Fallback route for Landing Page
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`VETERASKY SERVER v1.2 RUNNING ON PORT ${PORT}`);
    console.log(`-------------------------------------------`);
});
