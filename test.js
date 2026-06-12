const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/api/status', (req, res) => {
    res.json({ success: true, active: false, message: 'Test server works!' });
});

app.listen(port, () => {
    console.log(`✅ Тестовый сервер УСПЕШНО запущен на порту ${port}`);
});
