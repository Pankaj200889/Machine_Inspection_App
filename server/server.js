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
        origin: "*", // Allow all origins for local network testing
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

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
