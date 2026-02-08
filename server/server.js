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
            "https://machineinspectionapp-production.up.railway.app",
            "https://machine-inspection-app-cyan.vercel.app"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://machine.siddhiss.com",
        "https://machineinspectionapp-production.up.railway.app",
        "https://machine-inspection-app-cyan.vercel.app"
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
// Debug Route: Force Seed
app.post('/api/debug/seed', async (req, res) => {
    try {
        if (process.env.DATABASE_URL) {
            console.log("Triggering Postgres Seeding...");
            const seedPg = require('./seed_pg');
            await seedPg();
            res.json({ message: 'PostgreSQL Seeding triggered. Check logs.' });
        } else {
            console.log("Triggering SQLite Seeding...");
            delete require.cache[require.resolve('./seed_prod')];
            require('./seed_prod');
            res.json({ message: 'SQLite Seeding triggered. Check logs.' });
        }
    } catch (err) {
        console.error("Seeding Error:", err);
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
