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
            "https://machine-api.siddhiss.com",
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
        "https://machine-api.siddhiss.com",
        "https://machineinspectionapp-production.up.railway.app",
        "https://machine-inspection-app-cyan.vercel.app"
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, req.body);
    next();
});
const fs = require('fs');

// Ensure Uploads Directory Exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes// Import Routes
const authRoutes = require('./routes/auth');
const machineRoutes = require('./routes/machines');
const checklistRoutes = require('./routes/checklists');
const organizationRoutes = require('./routes/organization');
const superadminRoutes = require('./routes/superadmin');
const exportRoutes = require('./routes/export');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/export', exportRoutes);

app.get('/api/debug-db', async (req, res) => {
    try {
        if (!process.env.DATABASE_URL) {
            return res.json({ error: "Not using Postgres" });
        }
        const { Pool } = require('pg');
        const isInternal = process.env.DATABASE_URL.includes('.internal');
        const pgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: isInternal ? false : { rejectUnauthorized: false }
        });
        
        let colsResult;
        try {
            colsResult = await pgPool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'checklist_submissions'
            `);
        } catch (e) {
            return res.json({ error: 'Failed to query schema', details: e.message });
        }

        const subCols = ['image_url', 'image2_url', 'signature_url', 'comments'];
        const results = {};
        for (const col of subCols) {
            try {
                await pgPool.query(`ALTER TABLE checklist_submissions ADD COLUMN ${col} TEXT`);
                results[col] = "Added successfully";
            } catch (e) {
                results[col] = e.message;
            }
        }

        res.json({
            columns: colsResult.rows,
            migrationResults: results
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

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
app.get('/api/debug/createsuperadmin', async (req, res) => {
    try {
        const db = require('./database');
        const bcrypt = require('bcryptjs');
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync('Pankaj@2026', salt);
        
        // check if pankaj exists
        const check = await db.query("SELECT * FROM users WHERE username = 'pankaj'");
        if (check.rows.length === 0) {
            await db.query("INSERT INTO users (username, email, password_hash, role, organization_id) VALUES ('pankaj', 'pankaj@siddhiss.com', ?, 'super_admin', NULL)", [hash]);
            res.json({ message: "Created pankaj superadmin", username: "pankaj", pass: "Pankaj@2026" });
        } else {
            await db.query("UPDATE users SET password_hash = ?, role = 'super_admin', organization_id = NULL WHERE username = 'pankaj'", [hash]);
            res.json({ message: "Updated existing pankaj superadmin", username: "pankaj", pass: "Pankaj@2026" });
        }
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.get(/(.*)/, (req, res) => {
    try {
        const htmlPath = path.join(__dirname, '../client/dist/index.html');
        if (fs.existsSync(htmlPath)) {
            const html = fs.readFileSync(htmlPath, 'utf8');
            res.send(html);
        } else {
            res.status(404).send("Frontend build not found. Please run 'npm run build'.");
        }
    } catch (err) {
        console.error("Catch-all error:", err);
        res.status(500).send("Internal Server Error loading frontend");
    }
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
