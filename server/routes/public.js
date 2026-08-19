const express = require('express');
const router = express.Router();
const db = require('../database');

// Get organization branding by subdomain
router.get('/tenant/:subdomain', async (req, res) => {
    try {
        const subdomain = req.params.subdomain.toLowerCase();
        const sql = "SELECT company_name, logo_url FROM organization_settings WHERE subdomain = ? AND status = 'active'";
        const result = await db.query(sql, [subdomain]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenant not found or suspended' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
