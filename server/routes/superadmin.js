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
// Seed All Checklists
router.post('/seed-templates', verifySuperAdmin, async (req, res) => {
    try {
        const templates = [
            { name: 'DWM Extrusion Engineer', doc_no: 'DOC-106', freq: 'Daily', section: 'Daily Management', items: ['Verification of all lines running as per plan', 'Cross Verify All Safety Pokayoke', 'Skill Upgradation'] },
            { name: 'COMPOUND CONSUMPTION DETAIL', doc_no: 'DOC-111', freq: 'Batch', section: 'Raw Material', items: ['Batch No', 'Mixing Date', 'Expire Date', 'Batch Qty In Kg'] },
            { name: 'INSERT MANAGEMENT', doc_no: 'DOC-113', freq: 'Shift', section: 'Insert Details', items: ['Insert weight before slitting', 'Insert size before slitting', 'Insert weight after slitting'] },
            { name: 'Shift engineer check point', doc_no: 'DOC-122', freq: 'Shift', section: 'Handover', items: ['MUST READ AND WRITE THE LOG BOOK', 'CHECK 2S 1Y STATUS', 'CHECK NEXT PLAN OF EXTRUSION LINE'] },
            { name: 'DAILY PRODUCTION LOG SHEET', doc_no: 'DOC-076', freq: 'Hourly', section: 'Production', items: ['Time Minutes', 'PRODUCT NAME', 'PART QTY PER BIN', 'KAN BAN CHECK STATUS'] },
            { name: 'ONLINE INSPECTION DD1', doc_no: 'DOC-078', freq: 'Shift', section: 'QC', items: ['PART QTY ON TROLLEY', 'TROLLEY NO', 'KAN BAN STATUS'] },
            { name: 'DPR ALL LINE', doc_no: 'DOC-079', freq: 'Daily', section: 'Defects', items: ['QC Hold', 'Air Bubble(Solid)', 'Contamination(Sponge)', 'Porosity'] },
            { name: 'Shadowgraph check sheet', doc_no: 'DOC-080', freq: 'Batch', section: 'Precision', items: ['Quality Inspector Name', 'Extrusion check Status', 'QC check Status'] },
            { name: 'AQ 06 chemical Check Sheet', doc_no: 'DOC-096', freq: 'Hourly', section: 'Chemical Prep', items: ['Tank Temp', 'Concentration', 'Water Level'] },
            { name: 'Poke Yoke Verification', doc_no: 'DOC-099', freq: 'Shift', section: 'Sensors', items: ['Sensor Trigger Test', 'Accumulator Sensor', 'Cutter Sensor'] },
            { name: '4M change Tracking sheet', doc_no: 'DOC-006', freq: 'Event', section: 'Tracking', items: ['Man Change', 'Machine Change', 'Material Change', 'Method Change'] }
        ];

        for (let t of templates) {
            const check = await db.query("SELECT * FROM checklist_templates WHERE template_name = ?", [t.name]);
            if (check.rows.length === 0) {
                const tr = await db.query("INSERT INTO checklist_templates (template_name, doc_no, frequency) VALUES (?, ?, ?) RETURNING id", [t.name, t.doc_no, t.freq]);
                const tId = tr.rows ? tr.rows[0].id : tr.lastID;
                const sr = await db.query("INSERT INTO template_sections (template_id, section_name) VALUES (?, ?) RETURNING id", [tId, t.section]);
                const sId = sr.rows ? sr.rows[0].id : sr.lastID;
                for (let i of t.items) {
                    await db.query("INSERT INTO template_items (section_id, check_point, input_type) VALUES (?, ?, 'text')", [sId, i]);
                }
            }
        }
        res.json({ message: 'All templates seeded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
