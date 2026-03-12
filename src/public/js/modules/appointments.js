import { supabase } from '../supabaseClient.js';
import { tenantSession } from '../tenant-session.js';

const appointments = {
    currentDate: new Date(),

    async render(container) {
        // ... (HTML structure identical)
        container.innerHTML = `
            <div class="module-wrapper">
                <div class="module-header d-flex justify-content-between align-items-center py-1 mb-1 bg-white px-4 sticky-top" style="z-index: 10;">
                    <div>
                        <h1 class="h3 font-weight-bold mb-1">Calendario de Turnos</h1>
                        <p class="text-muted mb-0">Gestiona las citas del día y las próximas</p>
                    </div>
                    <button id="btn-add-appointment" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Agendar Turno
                    </button>
                </div>

                <div class="card shadow-sm border-0 mb-4 mx-4">
                    <div class="card-header bg-white py-3 border-0">
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center gap-3">
                                <button id="btn-prev-day" class="btn btn-icon btn-light rounded-circle"><i class="fas fa-chevron-left"></i></button>
                                <h4 class="mb-0 fw-bold text-dark" id="display-date">Cargando...</h4>
                                <button id="btn-next-day" class="btn btn-icon btn-light rounded-circle"><i class="fas fa-chevron-right"></i></button>
                            </div>
                            <button id="btn-today" class="btn btn-outline-primary btn-sm px-3 rounded-pill">Hoy</button>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table appointment-table mb-0 w-100" style="table-layout: fixed;">
                                <thead>
                                    <tr>
                                        <th style="width: 100px">Hora</th>
                                        <th style="width: 25%">Paciente / Dueño</th>
                                        <th style="width: 35%">Motivo</th>
                                        <th style="width: 130px">Estado</th>
                                        <th style="width: 80px" class="text-end">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="appointments-list">
                                    <!-- Loaded dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                .module-wrapper { padding: 0; max-width: 100%; margin: 0; }
                .appointment-table th { background: #f8fafc; padding: 1.25rem 1rem; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
                .appointment-table td { padding: 1.25rem 1rem; vertical-align: middle; border-bottom: 1px solid #f1f5f9; white-space: normal; }
                .time-cell { font-weight: 700; color: #1e293b; font-size: 1rem; }
                .pet-name { font-weight: 600; color: #334155; display: block; }
                .owner-name { font-size: 0.8rem; color: #94a3b8; }
                .status-badge { padding: 6px 12px; border-radius: 50px; font-size: 0.65rem; font-weight: 700; display: inline-block; letter-spacing: 0.02em; }
                .status-pendiente { background: #fefce8; color: #854d0e; border: 1px solid #fef08a; }
                .status-cancelado { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
                .status-completado { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
                
                /* Action Menu Styles */
                .dropdown-actions { position: relative; display: inline-block; }
                .btn-dots { background: none; border: none; font-size: 1.25rem; color: #94a3b8; cursor: pointer; padding: 5px 10px; border-radius: 5px; transition: background 0.2s; }
                .btn-dots:hover { background: #f1f5f9; color: #475569; }
                .dropdown-menu-custom { 
                    position: absolute; right: 0; top: 100%; background: white; border: 1px solid #e2e8f0; 
                    border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 1000; 
                    display: none; min-width: 140px; padding: 8px 0; margin-top: 5px;
                }
                .dropdown-menu-custom.show { display: block; }
                .dropdown-item-custom { 
                    padding: 10px 20px; font-size: 0.9rem; color: #475569; cursor: pointer; 
                    transition: background 0.1s; display: block; text-align: left; border: none; width: 100%; background: none;
                }
                .dropdown-item-custom:hover { background: #f8fafc; color: #1e293b; }
                .dropdown-item-custom.danger { color: #dc2626; }
                .dropdown-item-custom.danger:hover { background: #fef2f2; }
            </style>
        `;

        this.updateDisplayDate();
        await this.loadAppointments();
        this.attachEvents();
    },

    updateDisplayDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = this.currentDate.toLocaleDateString('es-ES', options);
        document.getElementById('display-date').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    },

    attachEvents() {
        document.getElementById('btn-add-appointment').onclick = () => this.showAppointmentForm();

        document.getElementById('btn-prev-day').onclick = () => {
            this.currentDate.setDate(this.currentDate.getDate() - 1);
            this.handleDateChange();
        };

        document.getElementById('btn-next-day').onclick = () => {
            this.currentDate.setDate(this.currentDate.getDate() + 1);
            this.handleDateChange();
        };

        document.getElementById('btn-today').onclick = () => {
            this.currentDate = new Date();
            this.handleDateChange();
        };

        window.onclick = (event) => {
            if (!event.target.matches('.btn-dots')) {
                const dropdowns = document.getElementsByClassName('dropdown-menu-custom');
                for (let i = 0; i < dropdowns.length; i++) {
                    dropdowns[i].classList.remove('show');
                }
            }
        };
    },

    toggleActions(id) {
        const menu = document.getElementById(`menu-${id}`);
        const allMenus = document.getElementsByClassName('dropdown-menu-custom');
        for (let m of allMenus) {
            if (m.id !== `menu-${id}`) m.classList.remove('show');
        }
        menu.classList.toggle('show');
    },

    async handleDateChange() {
        this.updateDisplayDate();
        await this.loadAppointments();
    },

    async loadAppointments() {
        const list = document.getElementById('appointments-list');
        const dateIso = this.currentDate.toISOString().split('T')[0];
        const schema = tenantSession.getSchema();

        try {
            const { data, error } = await supabase.schema(schema)
                .from('appointments')
                .select('*')
                .eq('date', dateIso)
                .order('time', { ascending: true });

            if (error) throw error;

            if (data.length === 0) {
                list.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">No hay turnos para esta fecha</td></tr>';
                return;
            }

            list.innerHTML = data.map(apt => {
                const statusMap = { 'pending': 'pendiente', 'cancelled': 'cancelado', 'completed': 'completado' };
                const translatedStatus = statusMap[apt.status] || apt.status;
                const statusLabel = translatedStatus.toUpperCase();

                return `
                <tr>
                    <td><span class="time-cell">${apt.time}</span></td>
                    <td>
                        <div class="pet-owner-cell">
                            <span class="pet-name">${apt.display_name || 'Sin mascota'}</span>
                            <span class="owner-name">${apt.phone || ''}</span>
                        </div>
                    </td>
                    <td><span class="text-muted small">${apt.reason || '-'}</span></td>
                    <td><span class="status-badge status-${translatedStatus}">${statusLabel}</span></td>
                    <td class="text-end">
                        <div class="dropdown-actions">
                            <button class="btn-dots" onclick="window.appointmentModule.toggleActions(${apt.id})">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div id="menu-${apt.id}" class="dropdown-menu-custom text-start">
                                <button class="dropdown-item-custom" onclick="window.appointmentModule.editAppointment(${apt.id})">Editar</button>
                                ${apt.status !== 'cancelled' ? `
                                <button class="dropdown-item-custom danger" onclick="window.appointmentModule.cancelAppointment(${apt.id})">Eliminar</button>
                                ` : ''}
                            </div>
                        </div>
                    </td>
                </tr>
            `}).join('');

            window.appointmentModule = this;
        } catch (e) {
            console.error(e);
            list.innerHTML = '<tr><td colspan="5">Error al cargar datos</td></tr>';
        }
    },

    async cancelAppointment(id) {
        if (!confirm('¿Seguro que desea eliminar (cancelar) este turno?')) return;
        const schema = tenantSession.getSchema();
        try {
            const { error } = await supabase.schema(schema)
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;
            this.loadAppointments();
        } catch (err) { alert(err.message); }
    },

    editAppointment(id) {
        alert('Edición próximamente disponible');
    },

    async showAppointmentForm() {
        const container = document.createElement('div');
        container.id = 'appointment-modal-container';
        document.body.appendChild(container);

        container.innerHTML = `
            <div class="custom-modal-backdrop">
                <div class="custom-modal">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3 class="mb-0 fw-bold">Agendar Turno</h3>
                        <span class="badge bg-light text-muted" style="font-size: 0.6rem;">v1.4</span>
                    </div>
                    <form id="appointment-form" autocomplete="off">
                        <div class="form-group mb-3">
                            <label>Nombre de la Mascota / Dueño*</label>
                            <input type="text" id="appt-search" class="form-control" placeholder="Buscar por mascota o dueño..." autocomplete="off" required>
                        </div>
                        <div class="form-group mb-3">
                            <label>Teléfono (para WhatsApp)*</label>
                            <input type="text" name="phone" id="appointment-phone" class="form-control" placeholder="Ej: 54911..." autocomplete="off" required>
                        </div>
                        <div class="row mb-3">
                            <div class="col">
                                <label>Fecha*</label>
                                <input type="date" name="date" class="form-control" value="${this.currentDate.toISOString().split('T')[0]}" required>
                            </div>
                            <div class="col">
                                <label>Hora*</label>
                                <input type="time" name="time" class="form-control" required>
                            </div>
                        </div>
                        <div class="form-group mb-4">
                            <label>Motivo</label>
                            <textarea name="reason" class="form-control" rows="2" placeholder="Consulta general, vacuna..."></textarea>
                        </div>
                        
                        <div class="d-flex flex-column gap-2">
                            <button type="button" id="btn-wa-confirm" class="btn btn-success w-100 py-2 font-weight-bold d-flex align-items-center justify-content-center shadow-sm">
                                <i class="fab fa-whatsapp me-2 fa-lg"></i> Guardar y Enviar WhatsApp
                            </button>
                            <button type="button" class="btn btn-light w-100 py-2 font-weight-bold text-muted border" onclick="document.getElementById('appointment-modal-container').remove()">
                                <i class="fas fa-times me-2"></i> Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <style>
                .custom-modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); padding: 1rem; }
                .custom-modal { background: white; padding: 1.75rem; border-radius: 24px; width: 100%; max-width: 450px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); border: 1px solid #eee; }
                .form-group label { display: block; margin-bottom: 0.4rem; font-weight: 600; font-size: 0.8rem; color: #4a5568; }
                .form-control { width: 100%; padding: 0.7rem 1rem; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.9rem; }
                .btn-success { background-color: #25d366 !important; color: white !important; border: none !important; transition: all 0.2s; }
                .btn-success:hover { background-color: #128c7e !important; transform: translateY(-1px); }
                .btn-success:active { transform: translateY(0); }
            </style>
        `;

        const form = document.getElementById('appointment-form');
        const saveAppointment = async () => {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            const msg = `Hola! Confirmamos tu turno en VetFlow para ${data.display_name} el día ${data.date} a las ${data.time}. Te esperamos!`;
            const waUrl = `https://wa.me/${data.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

            const schema = tenantSession.getSchema();
            try {
                const payload = {
                    display_name: data.display_name,
                    phone: data.phone,
                    date: data.date,
                    time: data.time,
                    reason: data.reason,
                    status: 'pending'
                };

                const { error } = await supabase.schema(schema)
                    .from('appointments')
                    .insert([payload]);

                if (error) throw error;

                document.getElementById('appointment-modal-container').remove();
                this.loadAppointments();
                window.location.assign(waUrl);
            } catch (err) { alert(err.message); }
        };

        const btnWa = document.getElementById('btn-wa-confirm');
        btnWa.onclick = () => {
            if (form.checkValidity()) {
                btnWa.disabled = true;
                btnWa.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
                saveAppointment();
            } else {
                form.reportValidity();
            }
        };

        form.onsubmit = (e) => {
            e.preventDefault();
            btnWa.click();
        };
    }
};

export default appointments;
