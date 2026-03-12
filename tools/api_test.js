const http = require('http');

const testEndpoint = (path) => {
    return new Promise((resolve) => {
        http.get(`http://localhost:3000${path}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log(`Endpoint ${path}: Status ${res.statusCode}`);
                try {
                    JSON.parse(data);
                    console.log(`Endpoint ${path}: Valid JSON`);
                } catch (e) {
                    console.log(`Endpoint ${path}: Invalid JSON`);
                }
                resolve();
            });
        }).on('error', (err) => {
            console.log(`Endpoint ${path}: Error ${err.message}`);
            resolve();
        });
    });
};

async function run() {
    await testEndpoint('/api/products');
    await testEndpoint('/api/sales/categories');
}

run();
