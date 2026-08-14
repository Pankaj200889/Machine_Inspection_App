const express = require('express');
const router = express.Router();
const db = require('../database');
const jwt = require('jsonwebtoken');
const qrcode = require('qrcode');

const JWT_SECRET = 'HARDCODED_MACHINE_SECRET_2026';

// Middleware to verify Admin
const verifyAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Requires Admin role' });
        req.user = decoded;
        next();
    });
};

// Middleware to verify Logged-in User (Admin or Operator)
const verifyUser = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('JWT Verify Error:', err.message, 'Token:', token);
            return res.status(401).json({ error: 'Unauthorized: ' + err.message });
        }
        req.user = decoded;
        next();
    });
};

// Get all machines
router.get('/', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM machines");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Machine (Admin Only)
router.post('/', verifyAdmin, async (req, res) => {
    const { machine_no, line_no, model, prod_plan, prod_plan_actual, mct, working_hours } = req.body;

    // START: Trial Limit Check
    try {
        const orgRes = await db.query("SELECT subscription_plan FROM organization_settings LIMIT 1");
        const plan = orgRes.rows[0]?.subscription_plan || 'trial';

        if (plan === 'trial') {
            const countRes = await db.query("SELECT COUNT(*) as count FROM machines");
            const count = parseInt(countRes.rows[0].count);
            if (count >= 10) {
                return res.status(403).json({
                    error: 'Trial Limit Reached. You can only create 10 machines in the Trial Plan. Please Upgrade.'
                });
            }
        }
    } catch (e) {
        return res.status(500).json({ error: 'Error checking subscription', details: e.message });
    }
    // END: Trial Limit Check

    const sql = "INSERT INTO machines (machine_no, line_no, model, prod_plan, prod_plan_actual, mct, working_hours) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id";
    try {
        const result = await db.query(sql, [machine_no, line_no, model, prod_plan, prod_plan_actual || 0, mct || 0, working_hours || 8]);
        // result.lastID is handled by our database.js wrapper for both PG (via RETURNING) and SQLite
        res.json({ id: result.lastID, machine_no, line_no, model, prod_plan, prod_plan_actual, mct, working_hours });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update Machine (Admin Only)
router.put('/:id', verifyAdmin, async (req, res) => {
    const { machine_no, line_no, model, prod_plan, prod_plan_actual, mct, working_hours } = req.body;
    const sql = `UPDATE machines SET 
                 machine_no = COALESCE(?, machine_no),
                 line_no = COALESCE(?, line_no),
                 model = COALESCE(?, model),
                 prod_plan = COALESCE(?, prod_plan),
                 prod_plan_actual = COALESCE(?, prod_plan_actual),
                 mct = COALESCE(?, mct),
                 working_hours = COALESCE(?, working_hours)
                 WHERE id = ?`;

    try {
        const result = await db.query(sql, [machine_no, line_no, model, prod_plan, prod_plan_actual, mct, working_hours, req.params.id]);
        res.json({ message: 'Updated', changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete Machine (Admin Only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    const sql = "DELETE FROM machines WHERE id = ?";
    try {
        const result = await db.query(sql, [req.params.id]);
        res.json({ message: 'Deleted', changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Generate QR Code (Admin Only, Returns Data URL)
router.get('/:id/qr', verifyAdmin, async (req, res) => {
    const sql = "SELECT * FROM machines WHERE id = ?";
    try {
        const result = await db.query(sql, [req.params.id]);
        const row = result.rows[0];

        if (!row) return res.status(404).json({ error: 'Machine not found' });

        // Update to URL format for direct scanning
        // const qrData = JSON.stringify({ id: row.id, no: row.machine_no });
        const qrData = `https://machine.siddhiss.com/machine/${row.id}`;

        qrcode.toDataURL(qrData, (err, url) => {
            if (err) return res.status(500).json({ error: 'Error generating QR' });
            res.json({ machine: row, qrCode: url });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Machine Production Quantities (Admin & Operator)
router.put('/:id/production', verifyUser, async (req, res) => {
    const { prod_plan_actual, prod_plan_revised, mct, working_hours } = req.body;
    
    const fields = [];
    const params = [];
    
    if (prod_plan_actual !== undefined) {
        fields.push("prod_plan_actual = ?");
        params.push(prod_plan_actual);
    }
    if (prod_plan_revised !== undefined) {
        fields.push("prod_plan_revised = ?");
        params.push(prod_plan_revised);
    }
    if (mct !== undefined) {
        fields.push("mct = ?");
        params.push(mct);
    }
    if (working_hours !== undefined) {
        fields.push("working_hours = ?");
        params.push(working_hours);
    }
    
    if (fields.length === 0) {
        return res.status(400).json({ error: 'No production fields to update' });
    }
    
    params.push(req.params.id);
    const sql = `UPDATE machines SET ${fields.join(', ')} WHERE id = ?`;

    try {
        const result = await db.query(sql, params);
        res.json({ message: 'Production details updated successfully', changes: result.rowCount });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
