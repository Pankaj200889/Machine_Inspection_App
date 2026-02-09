const express = require('express');
const router = express.Router();
const db = require('../database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const verifyAdmin = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });
    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err || decoded.role !== 'admin') return res.status(403).json({ error: 'Requires Admin' });
        next();
    });
};

// Helper: Convert array of objects to CSV
const toCSV = (data) => {
    if (!data || !data.length) return '';
    const keys = Object.keys(data[0]);
    const header = keys.join(',') + '\n';
    const rows = data.map(obj => keys.map(key => {
        let val = obj[key] === null || obj[key] === undefined ? '' : obj[key];
        if (val instanceof Date) val = val.toISOString(); // Format Dates
        val = String(val).replace(/"/g, '""'); // Escape quotes
        return `"${val}"`;
    }).join(',')).join('\n');
    return header + rows;
};

// Export Machines
router.get('/machines', verifyAdmin, async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM machines LIMIT 5000"); // Safety limit
        const csv = toCSV(result.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="machines_export.csv"');
        res.status(200).send(csv);
    } catch (err) {
        console.error("Export Machines Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Export Checklists
router.get('/checklists', verifyAdmin, async (req, res) => {
    const sql = `
        SELECT 
            c.id, 
            m.machine_no, 
            m.model, 
            u.username as operator, 
            c.shift, 
            c.ok_quantity, 
            c.ng_quantity, 
            c.total_quantity, 
            c.avg_ng_percent, 
            c.bekido_percent, 
            c.remarks, 
            c.submitted_at 
        FROM checklists c
        JOIN machines m ON c.machine_id = m.id
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.submitted_at DESC
        LIMIT 5000
    `;
    try {
        const result = await db.query(sql);
        const csv = toCSV(result.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="production_report.csv"');
        res.status(200).send(csv);
    } catch (err) {
        console.error("Export Checklists Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Export Audit Logs
router.get('/audits', verifyAdmin, async (req, res) => {
    const sql = `SELECT a.id, u.username as user, a.action, a.table_name, a.target_id, 
                 a.old_values, a.new_values, a.location, a.device_info, a.timestamp 
                 FROM audit_logs a 
                 LEFT JOIN users u ON a.user_id = u.id 
                 ORDER BY a.timestamp DESC LIMIT 5000`; // Safety limit
    try {
        const result = await db.query(sql);
        const csv = toCSV(result.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit_logs_export.csv"');
        res.status(200).send(csv);
    } catch (err) {
        console.error("Export Audits Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
