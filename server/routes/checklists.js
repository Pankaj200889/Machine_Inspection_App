const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'HARDCODED_MACHINE_SECRET_2026';

// Multer Setup for Images
const fs = require('fs');

// Multer Setup (Local - Legacy)
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

// Cloudinary Setup
const { uploadCloudinary } = require('../config/cloudinary');

// Middleware (Operator or Admin)
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
        ORDER BY avg_bekido DESC
    `;
    try {
        const result = await db.query(sql, [dateStr]);
        const cappedRows = result.rows.map(row => ({
            ...row,
            avg_bekido: Math.min(Number(row.avg_bekido || 0), 100)
        }));
        res.json(cappedRows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get templates for a machine
router.get('/templates', verifyUser, async (req, res) => {
    const { machine_id } = req.query;
    let sql = `SELECT * FROM checklist_templates`;
    let params = [];
    if (machine_id) {
        sql = `
            SELECT t.* 
            FROM checklist_templates t
            JOIN machine_templates mt ON t.id = mt.template_id
            WHERE mt.machine_id = ?
        `;
        params = [machine_id];
    }
    try {
        let result = await db.query(sql, params);
        
        // Fallback: If a new machine has no templates mapped, return all templates by default
        if (result.rows.length === 0 && machine_id) {
            result = await db.query(`SELECT * FROM checklist_templates`);
        }
        
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get template details
router.get('/templates/:id', verifyUser, async (req, res) => {
    const templateId = req.params.id;
    try {
        const tResult = await db.query("SELECT * FROM checklist_templates WHERE id = ?", [templateId]);
        const template = tResult.rows[0];
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const sResult = await db.query("SELECT * FROM template_sections WHERE template_id = ? ORDER BY order_index", [templateId]);
        const sections = sResult.rows;

        for (let section of sections) {
            const iResult = await db.query("SELECT * FROM template_items WHERE section_id = ? ORDER BY order_index", [section.id]);
            section.items = iResult.rows;
        }

        template.sections = sections;
        res.json(template);
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
        if (String(row.user_id) !== String(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to edit this checklist' });
        }

        const relativePath = 'uploads/' + req.file.filename;
        await db.query(`UPDATE checklists SET image_path = ? WHERE id = ?`, [relativePath, req.params.id]);
        res.json({ message: 'Image updated successfully', image_path: relativePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit Checklist (supports dynamic template submissions)
router.post('/', verifyUser, uploadCloudinary.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]), async (req, res) => {
    let { 
        machine_id, 
        template_id, 
        shift, 
        part_name, 
        line_speed, 
        values, 
        device_info, 
        location,
        comments,
        ok_quantity,
        ng_quantity,
        total_quantity
    } = req.body;

    const image1_url = req.files && req.files['image1'] ? req.files['image1'][0].path : null;
    const image2_url = req.files && req.files['image2'] ? req.files['image2'][0].path : null;
    const signature_url = req.files && req.files['signature'] ? req.files['signature'][0].path : null;
    const image_path = image1_url; // fallback for legacy table

    const user_id = req.user.id;
    shift = shift || getShift();

    try {
        const mRes = await db.query("SELECT mct, working_hours FROM machines WHERE id = ?", [machine_id]);
        const machine = mRes.rows[0];
        if (!machine) return res.status(404).json({ error: 'Machine not found' });

        // Handle dynamic template checklist
        if (template_id) {
            template_id = parseInt(template_id);
            if (typeof values === 'string') {
                values = JSON.parse(values);
            }

            const subSql = `
                INSERT INTO checklist_submissions (
                    template_id, machine_id, user_id, shift, part_name, line_speed, image_url, image2_url, signature_url, comments, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ${process.env.DATABASE_URL ? 'RETURNING id' : ''}
            `;
            const subResult = await db.query(subSql, [
                template_id, 
                machine_id, 
                user_id, 
                shift, 
                part_name ?? '', 
                line_speed ?? '', 
                image1_url, 
                image2_url, 
                signature_url, 
                comments ?? ''
            ]);
            const submission_id = subResult.lastID;

            let has_ng = false;
            let total_checked = 0;
            let ok_checked = 0;

            for (let val of values) {
                const { item_id, actual_value, remarks } = val;
                
                const itemRes = await db.query("SELECT * FROM template_items WHERE id = ?", [item_id]);
                const item = itemRes.rows[0];
                
                let is_ok = 1;
                if (item && item.input_type === 'numeric' && actual_value !== '') {
                    const numVal = parseFloat(actual_value);
                    if (item.expected_min !== null && numVal < item.expected_min) is_ok = 0;
                    if (item.expected_max !== null && numVal > item.expected_max) is_ok = 0;
                } else if (item && item.input_type === 'boolean') {
                    if (actual_value === 'NG' || actual_value === '0' || actual_value === 'false' || actual_value === false) is_ok = 0;
                }

                if (is_ok === 0) has_ng = true;
                total_checked++;
                if (is_ok === 1) ok_checked++;

                await db.query(`
                    INSERT INTO checklist_submission_values (submission_id, item_id, actual_value, is_ok, remarks)
                    VALUES (?, ?, ?, ?, ?)
                `, [submission_id, item_id, actual_value ?? '', is_ok, remarks || '']);
            }

            let legacy_ok = has_ng ? 0 : 1;
            let legacy_ng = has_ng ? 1 : 0;
            let legacy_total = 1;
            
            if (ok_quantity !== undefined && ng_quantity !== undefined) {
                legacy_ok = parseInt(ok_quantity) || 0;
                legacy_ng = parseInt(ng_quantity) || 0;
                legacy_total = legacy_ok + legacy_ng;
            }

            const avg_ng_percent = legacy_total > 0 ? (legacy_ng / legacy_total) * 100 : 0;
            let bekido_percent = has_ng ? 0 : 100;
            
            const totalSeconds = (machine.working_hours || 8) * 3600;
            if (totalSeconds > 0 && legacy_ok > 1) {
                bekido_percent = Math.min(((legacy_ok * (machine.mct || 0)) / totalSeconds) * 100, 100);
            }

            const legSql = `
                INSERT INTO checklists (
                    machine_id, user_id, ok_quantity, ng_quantity, total_quantity, 
                    avg_ng_percent, bekido_percent, image_path, device_info, location, shift, submission_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ${process.env.DATABASE_URL ? 'RETURNING id' : ''}
            `;
            const legResult = await db.query(legSql, [
                machine_id, user_id, legacy_ok, legacy_ng, legacy_total, 
                avg_ng_percent.toFixed(2), bekido_percent.toFixed(2), image_path, 
                device_info || 'Mobile App', location || 'N/A', shift, submission_id
            ]);

            const newChecklist = {
                id: legResult.lastID,
                submission_id,
                machine_id,
                user_id,
                ok_quantity: legacy_ok,
                ng_quantity: legacy_ng,
                total_quantity: legacy_total,
                avg_ng_percent,
                bekido_percent,
                image_path,
                shift,
                submitted_at: new Date()
            };

            const io = req.app.get('socketio');
            if (io) io.emit('new_checklist', newChecklist);

            return res.json({ 
                message: 'Dynamic Checklist submitted successfully', 
                submission_id,
                checklist: newChecklist 
            });
        }

        // Legacy fallback
        ok_quantity = parseInt(ok_quantity) || 0;
        ng_quantity = parseInt(ng_quantity) || 0;
        total_quantity = parseInt(total_quantity) || (ok_quantity + ng_quantity);

        const avg_ng_percent = total_quantity > 0 ? (ng_quantity / total_quantity) * 100 : 0;
        let bekido_percent = 0;
        const totalSeconds = (machine.working_hours || 8) * 3600;
        if (totalSeconds > 0) {
            bekido_percent = Math.min(((ok_quantity * (machine.mct || 0)) / totalSeconds) * 100, 100);
        }

        const sql = `INSERT INTO checklists (machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent, bekido_percent, image_path, device_info, location, shift) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ${process.env.DATABASE_URL ? 'RETURNING id' : ''}`;
        const result = await db.query(sql, [machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent.toFixed(2), bekido_percent.toFixed(2), image_path, device_info, location, shift]);

        const newChecklist = {
            id: result.lastID,
            machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent, bekido_percent, image_path, shift, submitted_at: new Date()
        };

        const io = req.app.get('socketio');
        if (io) io.emit('new_checklist', newChecklist);

        res.json({ message: 'Checklist submitted successfully', checklist: newChecklist });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get detailed dynamic submission details
router.get('/submissions/:id', verifyUser, async (req, res) => {
    const submissionId = req.params.id;
    try {
        const subRes = await db.query(`
            SELECT s.*, t.template_name, t.doc_no, t.rev_no, t.rev_date, m.machine_no, m.model, u.username as inspector
            FROM checklist_submissions s
            JOIN checklist_templates t ON s.template_id = t.id
            JOIN machines m ON s.machine_id = m.id
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ?
        `, [submissionId]);
        
        const submission = subRes.rows[0];
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        const sResult = await db.query("SELECT * FROM template_sections WHERE template_id = ? ORDER BY order_index", [submission.template_id]);
        const sections = sResult.rows;

        for (let section of sections) {
            const iResult = await db.query(`
                SELECT i.*, v.actual_value, v.is_ok, v.remarks as value_remarks
                FROM template_items i
                LEFT JOIN checklist_submission_values v ON i.id = v.item_id AND v.submission_id = ?
                WHERE i.section_id = ?
                ORDER BY i.order_index
            `, [submissionId, section.id]);
            section.items = iResult.rows;
        }

        submission.sections = sections;
        res.json(submission);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supervisor Sign-off (Checked By / Approved By)
router.post('/submissions/:id/sign', verifyUser, async (req, res) => {
    const submissionId = req.params.id;
    const { type } = req.body;
    const user_id = req.user.id;

    try {
        if (type === 'check') {
            await db.query(`
                UPDATE checklist_submissions 
                SET checked_by = ?, checked_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [user_id, submissionId]);
        } else if (type === 'approve') {
            await db.query(`
                UPDATE checklist_submissions 
                SET approved_by = ?, approved_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [user_id, submissionId]);
        } else {
            return res.status(400).json({ error: 'Invalid sign-off type' });
        }
        res.json({ message: 'Signature logged successfully.' });
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
            newBekido = theoretical_max > 0 ? Math.min((newOk / theoretical_max) * 100, 100) : 0;
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

// Delete Checklist (Admin Only)
router.delete('/:id', verifyUser, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can delete records' });

    const checklistId = req.params.id;

    try {
        // Optional: Get image path to delete file if needed
        const cRes = await db.query("SELECT image_path FROM checklists WHERE id = ?", [checklistId]);
        const row = cRes.rows[0];

        if (!row) return res.status(404).json({ error: 'Checklist not found' });

        // Delete from DB
        await db.query("DELETE FROM checklists WHERE id = ?", [checklistId]);

        // Delete image file if exists
        if (row.image_path) {
            const fs = require('fs');
            const filePath = path.join(__dirname, '../', row.image_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        const io = req.app.get('socketio');
        if (io) io.emit('delete_checklist', checklistId);

        res.json({ message: 'Checklist deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
