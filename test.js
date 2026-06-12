console.log('✅ Test script started');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Hello from Amvera!');
});

app.listen(port, () => {
    console.log(`✅ Test server running on port ${port}`);
});
