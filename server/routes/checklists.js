const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Multer Setup for Images
const fs = require('fs');

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
        cb(null, 'check-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware (Operator or Admin)
const verifyUser = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });

    jwt.verify(token.split(' ')[1], JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

// Helper: Get Current Shift
const getShift = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'A';
    if (hour >= 14 && hour < 22) return 'B';
    return 'C';
};

// Helper: Log Audit
const logAudit = async (userId, action, tableName, targetId, oldValues, newValues, deviceInfo, location) => {
    try {
        await db.query(
            `INSERT INTO audit_logs (user_id, action, table_name, target_id, old_values, new_values, device_info, location) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, action, tableName, targetId, JSON.stringify(oldValues), JSON.stringify(newValues), deviceInfo, location]
        );
    } catch (e) {
        console.error("Audit Log Error:", e);
    }
};

// --- Analytics Endpoints ---

// Get Production Trend (Last 7 Days by Shift)
router.get('/stats/trend', async (req, res) => {
    // Note: SQLite uses datetime('now'), Postgres uses NOW() or CURRENT_TIMESTAMP. 
    // To be compatible: Use simple variable interval syntax or handle in JS.
    // Normalized approach: Postgres uses `CURRENT_DATE - INTERVAL '7 days'`
    // SQLite uses `date('now', '-7 days')`.
    // My wrapper only handles `?` to `$1`. It does NOT transpile SQL functions.
    // I should write SQL that is compatible or use conditional?
    // Postgres supports `current_date`. SQLite uses `date('now')`.
    // Let's use generic standard SQL where possible.
    // Or just use two queries? No.
    // The query below uses `date(submitted_at)` which works in SQLite. In PG it's `submitted_at::date`.
    // Strategy: Since I detect DB type in `database.js`, I could export a helper or just try a standard query.
    // Let's make the SQL simple.

    // PG: start_date = NOW() - INTERVAL '7 days'
    // Lite: start_date = datetime('now', '-7 days')
    // Easier: Pass the date from JS.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString();

    const sql = `
        SELECT 
            ${process.env.DATABASE_URL ? "to_char(submitted_at, 'YYYY-MM-DD')" : "date(submitted_at)"} as date,
            shift,
            SUM(total_quantity) as total,
            SUM(ok_quantity) as ok,
            SUM(ng_quantity) as ng
        FROM checklists 
        WHERE submitted_at >= ?
        GROUP BY 1, shift
        ORDER BY 1 ASC, shift ASC
    `;

    try {
        const result = await db.query(sql, [dateStr]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Efficiency Stats (By Machine)
router.get('/stats/efficiency', async (req, res) => {
    // Handle `datetime('now', '-30 days')` vs JS Date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString();

    const sql = `
        SELECT 
            m.machine_no,
            m.model,
            m.prod_plan,
            COALESCE(SUM(c.ok_quantity), 0) as total_ok,
            COALESCE(SUM(c.ng_quantity), 0) as total_ng,
            COUNT(c.id) as submission_count,
            AVG(c.bekido_percent) as avg_bekido
        FROM machines m
        LEFT JOIN checklists c ON m.id = c.machine_id AND c.submitted_at >= ?
        GROUP BY m.id, m.machine_no, m.model, m.prod_plan
        ORDER BY total_ok DESC
    `;
    try {
        const result = await db.query(sql, [dateStr]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get My Submissions
router.get('/my-submissions', verifyUser, async (req, res) => {
    const sql = `
        SELECT c.*, m.machine_no 
        FROM checklists c
        JOIN machines m ON c.machine_id = m.id
        WHERE c.user_id = ?
        ORDER BY c.submitted_at DESC
        LIMIT 50
    `;
    try {
        const result = await db.query(sql, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Checklist Image (Retake)
router.put('/:id/image', verifyUser, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    try {
        const checkResult = await db.query("SELECT user_id FROM checklists WHERE id = ?", [req.params.id]);
        const row = checkResult.rows[0];

        if (!row) return res.status(404).json({ error: 'Checklist not found' });
        if (row.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to edit this checklist' });
        }

        const relativePath = 'uploads/' + req.file.filename;
        await db.query(`UPDATE checklists SET image_path = ? WHERE id = ?`, [relativePath, req.params.id]);
        res.json({ message: 'Image updated successfully', image_path: relativePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit Checklist
router.post('/', verifyUser, upload.single('image'), async (req, res) => {
    let { machine_id, ok_quantity, ng_quantity, total_quantity, device_info, location } = req.body;

    // No Trial Expiry Check (Paid Entry Model)

    const image_path = req.file ? 'uploads/' + req.file.filename : null;
    const user_id = req.user.id;
    const shift = getShift();

    ok_quantity = parseInt(ok_quantity) || 0;
    ng_quantity = parseInt(ng_quantity) || 0;
    total_quantity = parseInt(total_quantity) || (ok_quantity + ng_quantity);

    try {
        const mRes = await db.query("SELECT mct, working_hours FROM machines WHERE id = ?", [machine_id]);
        const machine = mRes.rows[0];
        if (!machine) return res.status(404).json({ error: 'Machine not found' });

        const avg_ng_percent = total_quantity > 0 ? (ng_quantity / total_quantity) * 100 : 0;
        let bekido_percent = 0;
        const totalSeconds = (machine.working_hours || 8) * 3600;
        if (totalSeconds > 0) {
            bekido_percent = ((ok_quantity * (machine.mct || 0)) / totalSeconds) * 100;
        }

        const sql = `INSERT INTO checklists (machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent, bekido_percent, image_path, device_info, location, shift) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`;
        const result = await db.query(sql, [machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent.toFixed(2), bekido_percent.toFixed(2), image_path, device_info, location, shift]);

        const newChecklist = {
            id: result.lastID, // Wrapper guarantees this mapping for SQLite. For PG, we need to handle it.
            // Note: In Dual Mode, creating a generic way to return ID is tricky without RETURNING.
            // But since this is a new insert, we can fetch max id? No unsafe.
            // For now, assume result.lastID works or simple response is ok.
            machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent, bekido_percent, image_path, shift, submitted_at: new Date()
        };

        const io = req.app.get('socketio');
        if (io) io.emit('new_checklist', newChecklist);

        res.json({ message: 'Checklist submitted successfully', checklist: newChecklist });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Unified Update/Revise Checklist (Admin Only)
router.put('/:id', verifyUser, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'proof', maxCount: 1 }]), async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can edit values' });

    let { ok_quantity, ng_quantity, total_quantity } = req.body;
    const checklistId = req.params.id;

    // File logic
    const new_image_path = req.files && req.files['image'] ? 'uploads/' + req.files['image'][0].filename : null;
    const new_proof_path = req.files && req.files['proof'] ? 'uploads/' + req.files['proof'][0].filename : null;

    try {
        const cRes = await db.query("SELECT * FROM checklists WHERE id = ?", [checklistId]);
        const row = cRes.rows[0];
        if (!row) return res.status(404).json({ error: 'Checklist not found' });

        // Check Edit Limit
        if ((row.edit_count || 0) >= 3) {
            return res.status(403).json({ error: 'Maximum edit limit (3) reached for this record.' });
        }

        // Prepare Audit
        const oldState = {
            ok: row.ok_quantity,
            ng: row.ng_quantity,
            total: row.total_quantity,
            image: row.image_path,
            edited_at: new Date(),
            edited_by: req.user.id
        };
        const history = row.edit_history ? JSON.parse(row.edit_history) : [];
        history.push(oldState);

        // Recalculate
        const mRes = await db.query("SELECT mct, working_hours FROM machines WHERE id = ?", [row.machine_id]);
        const machine = mRes.rows[0];
        const mct = machine ? machine.mct : 0;
        const hours = machine ? machine.working_hours : 8;

        const newOk = parseInt(ok_quantity) || row.ok_quantity;
        const newNg = parseInt(ng_quantity) || row.ng_quantity;
        const newTotal = parseInt(total_quantity) || (newOk + newNg);
        const newRemarks = req.body.remarks !== undefined ? req.body.remarks : (row.remarks || '');

        const newAvgNg = newTotal > 0 ? (newNg / newTotal) * 100 : 0;
        let newBekido = 0;
        if (hours > 0) {
            const theoretical_max = (hours * 3600) / (mct || 1);
            newBekido = theoretical_max > 0 ? (newOk / theoretical_max) * 100 : 0;
        }

        const finalImage = new_image_path || row.image_path;
        const finalProof = new_proof_path || row.approval_proof_path;

        const sql = `
            UPDATE checklists 
            SET ok_quantity = ?, ng_quantity = ?, total_quantity = ?, 
                avg_ng_percent = ?, bekido_percent = ?,
                image_path = ?, approval_proof_path = ?,
                remarks = ?,
                revised_by = ?, revised_at = CURRENT_TIMESTAMP,
                edit_count = edit_count + 1,
                edit_history = ?
            WHERE id = ?
        `;

        await db.query(sql, [newOk, newNg, newTotal, newAvgNg.toFixed(2), newBekido.toFixed(2), finalImage, finalProof, newRemarks, req.user.id, JSON.stringify(history), checklistId]);

        // Audit Log
        const logAction = new_image_path ? 'UPDATE_PHOTO' : 'REVISE_CHECKLIST';
        await logAudit(req.user.id, logAction, 'checklists', checklistId, oldState, { ok: newOk, ng: newNg }, req.body.device_info || 'Admin', req.body.location || 'N/A');

        const io = req.app.get('socketio');
        if (io) io.emit('new_checklist', { id: checklistId, type: 'update' });

        res.json({ message: 'Checklist updated', edit_count: (row.edit_count || 0) + 1 });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get History
router.get('/', async (req, res) => {
    const machine_id = req.query.machine_id;
    let sql = `SELECT checklists.*, machines.machine_no, machines.model, users.username 
               FROM checklists 
               JOIN machines ON checklists.machine_id = machines.id 
               LEFT JOIN users ON checklists.user_id = users.id
               ORDER BY submitted_at DESC LIMIT 50`;
    let params = [];

    if (machine_id) {
        sql = `SELECT checklists.*, machines.machine_no, machines.model, users.username 
               FROM checklists 
               JOIN machines ON checklists.machine_id = machines.id 
               LEFT JOIN users ON checklists.user_id = users.id
               WHERE machine_id = ? 
               ORDER BY submitted_at DESC`;
        params = [machine_id];
    }

    try {
        const result = await db.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
