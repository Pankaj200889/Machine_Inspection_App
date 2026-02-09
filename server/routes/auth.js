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

    // START: Password Complexity Check
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            error: 'Password must be at least 8 characters long and include at least one number and one special character.'
        });
    }
    // END: Password Complexity Check

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const userRole = role === 'admin' ? 'admin' : 'operator';

    const sql = `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`;
    try {
        const result = await db.query(sql, [username, email, hash, userRole]);
        res.status(201).json({ message: 'User registered', username, role: userRole });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Allow login by Email OR Username
    const sql = `SELECT * FROM users WHERE email = ? OR username = ?`;
    try {
        const result = await db.query(sql, [email, email]);
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

// Generate Reset Link (Admin Only - In real app, verify admin middleware here)
router.post('/users/:id/reset-link', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query("SELECT * FROM users WHERE id = ?", [id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const token = jwt.sign({ id: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });

        // Construct Link (Use header origin to match current domain)
        const origin = req.headers.origin || 'http://localhost:5173';
        const link = `${origin}/reset-password?token=${token}`;

        res.json({ link, message: 'Reset link generated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Forgot Password (MVP: Log Token)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Generate Token (1 Hour)
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

        // Log to Console (MVP Email Service)
        console.log(`[EMAIL MOCK] To: ${email} | Subject: Password Reset | Link: /reset-password?token=${token}`);

        res.json({ message: 'Password reset link "sent" (check console)' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.purpose && decoded.purpose !== 'reset') {
            return res.status(400).json({ error: 'Invalid token type' });
        }

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(newPassword, salt);

        await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, decoded.id]);
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(400).json({ error: 'Invalid or expired token' });
    }
});

// List Users (Admin Only - simplified check)
router.get('/users', async (req, res) => {
    try {
        const result = await db.query("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete User (Admin Only)
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM users WHERE id = ?", [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
