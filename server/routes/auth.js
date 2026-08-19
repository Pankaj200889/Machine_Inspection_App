const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { verifyUser, verifyAdmin, verifySuperAdmin } = require('../middleware/authMiddleware');

const JWT_SECRET = 'HARDCODED_MACHINE_SECRET_2026';

// Register User
router.post('/register', verifyAdmin, async (req, res) => {
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

    const sql = `INSERT INTO users (username, email, password_hash, role, organization_id) VALUES (?, ?, ?, ?, ?)`;
    try {
        const result = await db.query(sql, [username, email, hash, userRole, req.user.organization_id]);
        res.status(201).json({ message: 'User registered', username, role: userRole });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

// Login User
router.post('/login', async (req, res) => {
    const { email, password, subdomain } = req.body;

    // Allow login by Email OR Username
    const sql = `
        SELECT u.*, o.status as org_status 
        FROM users u 
        LEFT JOIN organization_settings o ON u.organization_id = o.id 
        WHERE u.email = ? OR u.username = ?
    `;
    try {
        const result = await db.query(sql, [email, email]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        // Verify subdomain match if not super_admin
        if (user.role !== 'super_admin' && subdomain) {
            const orgCheck = await db.query('SELECT subdomain FROM organization_settings WHERE id = ?', [user.organization_id]);
            if (orgCheck.rows.length > 0 && orgCheck.rows[0].subdomain !== subdomain) {
                return res.status(403).json({ error: 'This user account does not belong to this portal.' });
            }
        }

        if (user.role !== 'super_admin' && user.org_status === 'suspended') {
            return res.status(403).json({ error: 'Account Suspended. Please contact support.' });
        }

        const token = jwt.sign({ 
            id: user.id, 
            role: user.role, 
            organization_id: user.organization_id 
        }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: { id: user.id, username: user.username, role: user.role, organization_id: user.organization_id } });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Generate Reset Link (Admin Only - In real app, verify admin middleware here)
router.post('/users/:id/reset-link', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query("SELECT * FROM users WHERE id = ? AND organization_id = ?", [id, req.user.organization_id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const token = jwt.sign({
            id: user.id,
            purpose: 'reset',
            fingerprint: user.password_hash ? user.password_hash.slice(-10) : 'new_user'
        }, JWT_SECRET, { expiresIn: '1h' });

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

// Verify Reset Token (Check on Load)
router.get('/verify-reset-token', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Missing token' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.purpose !== 'reset') return res.status(400).json({ error: 'Invalid token type' });

        const result = await db.query("SELECT * FROM users WHERE id = ?", [decoded.id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const currentFingerprint = user.password_hash ? user.password_hash.slice(-10) : 'new_user';
        if (decoded.fingerprint && decoded.fingerprint !== currentFingerprint) {
            return res.status(400).json({ error: 'Link expired or already used' });
        }

        res.json({ valid: true });
    } catch (err) {
        res.status(400).json({ error: 'Invalid or expired token' });
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

        // Fetch user to verify fingerprint (Invalidate if password changed)
        const result = await db.query("SELECT * FROM users WHERE id = ?", [decoded.id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ error: 'User not found' });

        const currentFingerprint = user.password_hash ? user.password_hash.slice(-10) : 'new_user';
        if (decoded.fingerprint && decoded.fingerprint !== currentFingerprint) {
            return res.status(400).json({ error: 'Link expired or already used' });
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
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const result = await db.query("SELECT id, username, email, role, created_at FROM users WHERE organization_id = ? ORDER BY created_at DESC", [req.user.organization_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete User (Admin Only)
router.delete('/users/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query("DELETE FROM users WHERE id = ? AND organization_id = ?", [id, req.user.organization_id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
