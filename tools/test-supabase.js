const supabase = require('./supabase');

async function testConnection() {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('vets').select('count', { count: 'exact' });

    if (error) {
        console.error('Connection failed:', error.message);
        process.exit(1);
    }

    console.log('Connection successful! Row count in vets:', data);
    process.exit(0);
}

testConnection();
