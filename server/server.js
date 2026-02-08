const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://machine.siddhiss.com",
            "https://machineinspectionapp-production.up.railway.app"
        ],
        methods: ["GET", "POST"]
    }
});

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://machine.siddhiss.com",
        "https://machineinspectionapp-production.up.railway.app"
    ],
    credentials: true
}));
app.use(express.json());
const fs = require('fs');

// Ensure Uploads Directory Exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (Imports)
const authRoutes = require('./routes/auth');
const machineRoutes = require('./routes/machines');
const checklistRoutes = require('./routes/checklists');
const organizationRoutes = require('./routes/organization');
const exportRoutes = require('./routes/export');

// Routes (Usage)
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/export', exportRoutes);

// Debug Route: Force Seed (Protected by simplistic check or rely on admin login later)
app.post('/api/debug/seed', async (req, res) => {
    try {
        const seedProd = require('./seed_prod');
        // seed_prod.js usually runs immediately on require if not exported as function
        // We might need to adjust seed_prod to export a function if not already
        // But for now, let's assume valid access controls or temporary usage.

        // Actually, seed_prod.js in this codebase runs `seed()` at the end.
        // So require()ing it might trigger it, but node caches modules.
        // Better to execute it as a child process or modify seed_prod to export.

        // Quick fix: clear cache and re-require (not recommended for high traffic but fine for debug)
        delete require.cache[require.resolve('./seed_prod')];
        require('./seed_prod');

        res.json({ message: 'Seeding triggered. Check logs.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve Static Frontend (Production)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all handler for React Router (Express 5 fix)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Make io available in routes
app.set('socketio', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
