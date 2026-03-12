import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// El usuario debe configurar estas variables en supabase.js o aquí.
// Por ahora, asumimos que podemos leerlas desde algún lado o hardcodearlas temporalmente 
// (aunque en producción irían en una config inyectada).
const SUPABASE_URL = 'https://wjqhfpgkbpqyoudzedyb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqcWhmcGdrYnBxeW91ZHplZHliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjY5OTIsImV4cCI6MjA4ODc0Mjk5Mn0.MTljd7tM-9SjdSWUTzDSH2sYcww0SdCV6qnDdOElfe0'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Lógica de navegación entre pasos con validación
document.getElementById('btn-to-step2').addEventListener('click', () => {
    const step1Fields = ['vet-name', 'vet-city', 'vet-state', 'vet-phone'];
    let allValid = true;

    step1Fields.forEach(id => {
        const field = document.getElementById(id);
        if (!field.checkValidity()) {
            field.classList.add('is-invalid');
            allValid = false;
        } else {
            field.classList.remove('is-invalid');
        }
    });

    if (allValid) {
        window.changeStep(2);
    } else {
        alert('Por favor, completa todos los campos obligatorios de la veterinaria.');
    }
});

document.getElementById('registration-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creando...';

    const formData = {
        clinicName: document.getElementById('vet-name').value,
        city: document.getElementById('vet-city').value,
        state: document.getElementById('vet-state').value,
        phone: document.getElementById('vet-phone').value,
        ownerName: document.getElementById('owner-name').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    try {
        // 1. Crear el usuario en Supabase Auth
        // Nota: El tenant_id lo generamos nosotros o lo dejamos que lo genere la DB y luego lo linkeamos.
        // Lo ideal es crear el tenant PRIMERO y luego el usuario apuntando a ese ID.

        // Pero Auth.signUp no permite pasar tenant_id en app_metadata directamente desde el cliente por seguridad.
        // Lo que haremos es:
        // A. Registrar el tenant en una tabla pública (que permita inserción inicial)
        // B. Crear el usuario
        // C. Una Edge Function (Fase 5) hará el vínculo final y creará el schema.

        const slug = formData.clinicName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

        // 1. Insertar Tenant
        const { data: tenant, error: tError } = await supabase
            .from('tenants')
            .insert([{
                nombre: formData.clinicName,
                slug: slug,
                plan: 'libre',
                estado: 'trial',
                config: {
                    city: formData.city,
                    state: formData.state,
                    phone: formData.phone,
                    ownerName: formData.ownerName,
                    onboardingDone: false
                }
            }])
            .select()
            .single();

        if (tError) throw new Error('Error al registrar la clínica: ' + tError.message);

        // 2. Crear Usuario
        const { data: authData, error: aError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: formData.ownerName,
                    tenant_id: tenant.id // Esto va a user_metadata
                }
            }
        });

        if (aError) throw aError;

        // 3. Notificación de éxito
        alert('¡Registro exitoso! Por favor, revisá tu email para confirmar la cuenta.');
        window.location.href = 'login.html';

    } catch (error) {
        alert(error.message);
        console.error(error);
        btn.disabled = false;
        btn.innerHTML = 'Crear Cuenta';
    }
});
