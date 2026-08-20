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
                   (SELECT COUNT(*) FROM machines m WHERE m.organization_id = o.id) as machine_count,
                   (SELECT u.email FROM users u WHERE u.organization_id = o.id AND u.role = 'admin' LIMIT 1) as admin_email
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
        const orgSql = "INSERT INTO organization_settings (company_name, subdomain, subscription_plan, status) VALUES (?, ?, 'active', 'active') RETURNING id";
        const orgRes = await db.query(orgSql, [company_name, subdomain.toLowerCase()]);
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

// Reset Admin Password for a Client
router.put('/organizations/:id/reset-password', verifySuperAdmin, async (req, res) => {
    const { new_password } = req.body;
    
    if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(new_password, salt);
        
        // Update all admins for this organization (usually just one)
        const sql = "UPDATE users SET password_hash = ? WHERE organization_id = ? AND role = 'admin'";
        const result = await db.query(sql, [hash, req.params.id]);
        
        if (result.rowCount === 0 && result.changes === 0) {
            return res.status(404).json({ error: 'Admin user not found for this organization' });
        }

        res.json({ message: 'Admin password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Organization (Wipes all their data)
router.delete('/organizations/:id', verifySuperAdmin, async (req, res) => {
    try {
        // Postgres ON DELETE CASCADE should handle children if configured, 
        // but we'll manually delete users just in case.
        await db.query("DELETE FROM users WHERE organization_id = ?", [req.params.id]);
        await db.query("DELETE FROM machines WHERE organization_id = ?", [req.params.id]);
        await db.query("DELETE FROM organization_settings WHERE id = ?", [req.params.id]);
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
                   (SELECT COUNT(*) FROM machines m WHERE m.organization_id = o.id) as machine_count,
                   (SELECT u.email FROM users u WHERE u.organization_id = o.id AND u.role = 'admin' LIMIT 1) as admin_email
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
        const orgSql = "INSERT INTO organization_settings (company_name, subdomain, subscription_plan, status) VALUES (?, ?, 'active', 'active') RETURNING id";
        const orgRes = await db.query(orgSql, [company_name, subdomain.toLowerCase()]);
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

// Reset Admin Password for a Client
router.put('/organizations/:id/reset-password', verifySuperAdmin, async (req, res) => {
    const { new_password } = req.body;
    
    if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(new_password, salt);
        
        // Update all admins for this organization (usually just one)
        const sql = "UPDATE users SET password_hash = ? WHERE organization_id = ? AND role = 'admin'";
        const result = await db.query(sql, [hash, req.params.id]);
        
        if (result.rowCount === 0 && result.changes === 0) {
            return res.status(404).json({ error: 'Admin user not found for this organization' });
        }

        res.json({ message: 'Admin password reset successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Organization (Wipes all their data)
router.delete('/organizations/:id', verifySuperAdmin, async (req, res) => {
    try {
        // Postgres ON DELETE CASCADE should handle children if configured, 
        // but we'll manually delete users just in case.
        await db.query("DELETE FROM users WHERE organization_id = ?", [req.params.id]);
        await db.query("DELETE FROM machines WHERE organization_id = ?", [req.params.id]);
        await db.query("DELETE FROM organization_settings WHERE id = ?", [req.params.id]);
        
        res.json({ message: 'Organization permanently deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Seed Checklists
router.post('/seed-templates', verifySuperAdmin, async (req, res) => {
    try {
        let templates = req.body.templates;
        
        if (!templates || !Array.isArray(templates)) {
            // Fallback to minimal hardcoded ones
            templates = [
                { name: 'DWM Extrusion Engineer', doc_no: 'DOC-106', freq: 'Daily', section: 'Daily Management', items: [{check_point: 'Verification of all lines', input_type: 'boolean'}] }
            ];
        }

        for (let t of templates) {
            await db.query("DELETE FROM checklist_templates WHERE template_name = ?", [t.name]);
            
            const tr = await db.query("INSERT INTO checklist_templates (template_name, doc_no, frequency) VALUES (?, ?, ?) RETURNING id", [t.name, t.doc_no, t.freq]);
            const tId = tr.rows ? tr.rows[0].id : tr.lastID;
            
            if (t.sections) {
                // new format with multiple sections
                    for (let sec of t.sections) {
                        const sr = await db.query("INSERT INTO template_sections (template_id, section_name) VALUES (?, ?) RETURNING id", [tId, sec.name]);
                        const sId = sr.rows ? sr.rows[0].id : sr.lastID;
                        for (let item of sec.items) {
                            await db.query("INSERT INTO template_items (section_id, check_point, input_type, expected_min, expected_max, specification) VALUES (?, ?, ?, ?, ?, ?)", 
                                [sId, item.check_point, item.input_type || 'text', item.expected_min || null, item.expected_max || null, item.specification || null]);
                        }
                    }
                } else if (t.items) {
                    // legacy format
                    const sr = await db.query("INSERT INTO template_sections (template_id, section_name) VALUES (?, ?) RETURNING id", [tId, t.section || 'General']);
                    const sId = sr.rows ? sr.rows[0].id : sr.lastID;
                    for (let i of t.items) {
                        let cp = typeof i === 'string' ? i : i.check_point;
                        let type = typeof i === 'string' ? 'text' : (i.input_type || 'text');
                        await db.query("INSERT INTO template_items (section_id, check_point, input_type) VALUES (?, ?, ?)", [sId, cp, type]);
                    }
                }
        }
        res.json({ message: 'All templates seeded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
