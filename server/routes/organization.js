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
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '../uploads/');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ... (Verification middleware skipped)

// Update Organization Profile (Admin Only)
router.put('/', verifyAdmin, upload.single('logo'), async (req, res) => {
    const { company_name, logo_url, plant_no, address } = req.body;

    // Determine logo path
    let finalLogoUrl = logo_url;
    if (req.file) {
        finalLogoUrl = 'uploads/' + req.file.filename;
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
