const express = require('express');
const app = express();
app.get('/api/test', (req, res) => res.json({ ok: true }));
app.listen(3001, () => console.log('Diagnostic server on 3001'));
