const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
// Render asigna un puerto en la variable de entorno PORT, si no existe usa el 3000
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Servir archivos estáticos (el juego frontend)
app.use(express.static(path.join(__dirname, 'public')));

// --- BASE DE DATOS EN MEMORIA ---
// Nota: En Render (Plan Gratuito), esto se reiniciará si el servidor "duerme".
// Para persistencia real necesitarías MongoDB o PostgreSQL.
let userDatabase = {};

// --- API ENDPOINTS ---

// 1. Guardar Eco capturado
app.post('/api/save-echo', (req, res) => {
    const { userId, echoType } = req.body;
    
    if (!userId || !echoType) {
        return res.status(400).json({ error: "Faltan datos" });
    }

    if (!userDatabase[userId]) {
        userDatabase[userId] = [];
    }

    userDatabase[userId].push(echoType);
    console.log(`[SERVER] Jugador ${userId} capturó: ${echoType}`);
    
    res.json({ success: true, inventory: userDatabase[userId] });
});

// 2. Consultar inventario
app.get('/api/inventory/:userId', (req, res) => {
    const userId = req.params.userId;
    const items = userDatabase[userId] || [];
    res.json({ userId, items });
});

// Ruta por defecto para servir el juego en la raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor RPG corriendo en el puerto ${PORT}`);
});
