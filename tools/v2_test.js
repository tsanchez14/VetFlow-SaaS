const http = require('http');

http.get('http://localhost:3000/api/v2/sales-categories', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        console.log('RESPONSE:', data);
    });
});
