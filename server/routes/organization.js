const express = require('express');
const router = express.Router();
const db = require('../database');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Multer Setup
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

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

// Get Organization Profile
router.get('/', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM organization_settings LIMIT 1");
        res.json(result.rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Organization Profile (Admin Only)
router.put('/', verifyAdmin, upload.single('logo'), async (req, res) => {
    const { company_name, logo_url, plant_no, address } = req.body;
    let finalLogoUrl = logo_url;

    if (req.file) {
        finalLogoUrl = req.file.path.replace(/\\/g, '/'); // Normalize path
    }

    try {
        // Check if exists
        const checkResult = await db.query("SELECT id FROM organization_settings LIMIT 1");
        const row = checkResult.rows[0];

        if (row) {
            // Update
            const sql = `UPDATE organization_settings SET 
                         company_name = COALESCE(?, company_name),
                         logo_url = COALESCE(?, logo_url),
                         plant_no = COALESCE(?, plant_no),
                         address = COALESCE(?, address),
                         updated_at = CURRENT_TIMESTAMP
                         WHERE id = ?`;
            await db.query(sql, [company_name, finalLogoUrl, plant_no, address, row.id]);
            res.json({ message: 'Organization Updated', logo_url: finalLogoUrl });
        } else {
            // Insert
            const sql = `INSERT INTO organization_settings (company_name, logo_url, plant_no, address) VALUES (?, ?, ?, ?)`;
            await db.query(sql, [company_name, finalLogoUrl, plant_no, address]);
            res.json({ message: 'Organization Created', logo_url: finalLogoUrl });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
