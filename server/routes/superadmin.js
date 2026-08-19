const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const { verifySuperAdmin } = require('../middleware/authMiddleware');

// Get all organizations
router.get('/organizations', verifySuperAdmin, async (req, res) => {
    try {
        const sql = `
            SELECT o.*, 
                   (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) as user_count,
                   (SELECT COUNT(*) FROM machines m WHERE m.organization_id = o.id) as machine_count
            FROM organization_settings o
            ORDER BY o.id DESC
        `;
        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new organization and its default admin
router.post('/organizations', verifySuperAdmin, async (req, res) => {
    const { company_name, admin_email, admin_password, subdomain } = req.body;

    if (!company_name || !admin_email || !admin_password || !subdomain) {
        return res.status(400).json({ error: 'Company name, admin email, and password are required' });
    }

    try {
        // 1. Create Organization
        const orgSql = "INSERT INTO organization_settings (company_name, subscription_plan, status) VALUES (?, 'active', 'active') RETURNING id";
        const orgRes = await db.query(orgSql, [company_name]);
        const orgId = orgRes.lastID || orgRes.rows[0].id;

        // 2. Create Admin User
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(admin_password, salt);
        const username = admin_email.split('@')[0] + '_' + orgId; // Ensure uniqueness

        const userSql = "INSERT INTO users (username, email, password_hash, role, organization_id) VALUES (?, ?, ?, 'admin', ?)";
        await db.query(userSql, [username, admin_email, hash, orgId]);

        res.status(201).json({ message: 'Organization created successfully', organization_id: orgId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle Organization Status (Suspend / Activate)
router.put('/organizations/:id/status', verifySuperAdmin, async (req, res) => {
    const { status } = req.body; // 'active' or 'suspended'
    
    if (status !== 'active' && status !== 'suspended') {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const sql = "UPDATE organization_settings SET status = ? WHERE id = ?";
        const result = await db.query(sql, [status, req.params.id]);
        
        if (result.rowCount === 0 && result.changes === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({ message: `Organization status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
