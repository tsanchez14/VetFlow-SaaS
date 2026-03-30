const supabase = require('./src/supabase');

async function test() {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('tenants').select('count');
    if (error) {
        console.error('Error selecting from tenants:', error.message);
    } else {
        console.log('Successfully selected from tenants (RLS bypassed or policy allowed)');
    }

    const { data: insertData, error: insertError } = await supabase.from('tenants').insert([{
        nombre: 'Test Clinic',
        slug: 'test-clinic-' + Date.now(),
        plan: 'libre',
        estado: 'trial'
    }]).select();

    if (insertError) {
        console.error('Error inserting into tenants:', insertError.message);
    } else {
        console.log('Successfully inserted into tenants:', insertData[0].id);
        // Cleanup
        await supabase.from('tenants').delete().eq('id', insertData[0].id);
    }
}

test();
