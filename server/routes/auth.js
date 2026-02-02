const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register User
router.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const userRole = role === 'admin' ? 'admin' : 'operator';

    const sql = `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`;
    try {
        const result = await db.query(sql, [username, email, hash, userRole]);
        // For Postgres, we might need 'RETURNING id' in the SQL if lastID isn't reliable across drivers,
        // but our wrapper tries to handle it. For safety in PG, let's query the user back or trust the wrapper?
        // Our wrapper handles lastID for SQLite. for PG it returns rows[0].id if RETURNING is used?
        // Wait, my wrapper for PG does: `resolve({ ..., lastID: res.rows[0]?.id })`. 
        // So I MUST add `RETURNING id` to the SQL for Postgres to return the ID.
        // But SQLite doesn't support RETURNING (in older versions). 
        // This is a "Unified" problem.
        // Quick Fix: For this specific app, I'll rely on the username being unique and just return success, 
        // or fetch it back if needed. 
        // Actually, SQLite 3.35+ supports RETURNING. 
        // Let's assume standard behavior: just return success.
        res.status(201).json({ message: 'User registered', username, role: userRole });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const sql = `SELECT * FROM users WHERE email = ?`;
    try {
        const result = await db.query(sql, [email]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
