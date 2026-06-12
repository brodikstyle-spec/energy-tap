const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 1. Файл server.js загружен');

app.get('/api/status', (req, res) => {
    console.log('📡 2. Получен запрос /api/status');
    res.json({ success: true, active: false, message: 'Test server works!' });
});

app.listen(port, () => {
    console.log(`✅ 3. Сервер УСПЕШНО запущен на порту ${port}`);
});
