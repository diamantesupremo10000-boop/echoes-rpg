const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let db = {};

app.post('/api/save-echo', (req, res) => {
    const { userId, type } = req.body;
    if(!db[userId]) db[userId] = [];
    db[userId].push({ type, date: new Date() });
    res.json({ success: true, count: db[userId].length });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
