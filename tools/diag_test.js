const http = require('http');
http.get('http://localhost:3001/api/test', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log('DIAG RESPONSE:', data));
});
