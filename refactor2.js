const fs = require('fs');

function processChecklists() {
    let path = 'server/routes/checklists.js';
    let content = fs.readFileSync(path, 'utf8');

    // Replace verifyUser, verifyAdmin imports
    // We already have `const verifyUser = ...` defined in checklists.js
    // We can just replace the definition block
    content = content.replace(
        /const verifyUser = \(req, res, next\) => \{[\s\S]*?next\(\);\n    \}\);\n\};/,
        "const { verifyUser, verifyAdmin } = require('../middleware/authMiddleware');"
    );

    // GET /stats/trend
    // We need to pass verifyUser to these routes first!
    // Let's manually replace `router.get('/stats/trend', async (req, res) => {`
    content = content.replace(
        "router.get('/stats/trend', async (req, res) => {",
        "router.get('/stats/trend', verifyUser, async (req, res) => {"
    );
    content = content.replace(
        "FROM checklists \n        WHERE submitted_at >= ?",
        "FROM checklists \n        WHERE submitted_at >= ? AND organization_id = ?"
    );
    content = content.replace(
        "const result = await db.query(sql, [dateStr]);",
        "const result = await db.query(sql, [dateStr, req.user.organization_id]);"
    );

    // GET /stats/efficiency
    content = content.replace(
        "router.get('/stats/efficiency', async (req, res) => {",
        "router.get('/stats/efficiency', verifyUser, async (req, res) => {"
    );
    content = content.replace(
        "FROM machines m\n        LEFT JOIN checklists c ON m.id = c.machine_id AND c.submitted_at >= ?",
        "FROM machines m\n        LEFT JOIN checklists c ON m.id = c.machine_id AND c.submitted_at >= ? AND c.organization_id = ?\n        WHERE m.organization_id = ?"
    );
    content = content.replace(
        "const result = await db.query(sql, [dateStr]);",
        "const result = await db.query(sql, [dateStr, req.user.organization_id, req.user.organization_id]);"
    );

    // GET /templates
    content = content.replace(
        "let sql = `SELECT * FROM checklist_templates`;\n    let params = [];",
        "let sql = `SELECT * FROM checklist_templates WHERE organization_id = ?`;\n    let params = [req.user.organization_id];"
    );
    content = content.replace(
        "        sql = `\n            SELECT t.* \n            FROM checklist_templates t\n            JOIN machine_templates mt ON t.id = mt.template_id\n            WHERE mt.machine_id = ?\n        `;\n        params = [machine_id];",
        "        sql = `\n            SELECT t.* \n            FROM checklist_templates t\n            JOIN machine_templates mt ON t.id = mt.template_id\n            WHERE mt.machine_id = ? AND t.organization_id = ?\n        `;\n        params = [machine_id, req.user.organization_id];"
    );
    content = content.replace(
        "result = await db.query(`SELECT * FROM checklist_templates`);",
        "result = await db.query(`SELECT * FROM checklist_templates WHERE organization_id = ?`, [req.user.organization_id]);"
    );

    // GET /templates/:id
    content = content.replace(
        "const tResult = await db.query(\"SELECT * FROM checklist_templates WHERE id = ?\", [templateId]);",
        "const tResult = await db.query(\"SELECT * FROM checklist_templates WHERE id = ? AND organization_id = ?\", [templateId, req.user.organization_id]);"
    );

    // GET /my-submissions
    content = content.replace(
        "WHERE c.user_id = ?",
        "WHERE c.user_id = ? AND c.organization_id = ?"
    );
    content = content.replace(
        "const result = await db.query(sql, [req.user.id]);",
        "const result = await db.query(sql, [req.user.id, req.user.organization_id]);"
    );

    // PUT /:id/image
    content = content.replace(
        "const checkResult = await db.query(\"SELECT user_id FROM checklists WHERE id = ?\", [req.params.id]);",
        "const checkResult = await db.query(\"SELECT user_id FROM checklists WHERE id = ? AND organization_id = ?\", [req.params.id, req.user.organization_id]);"
    );
    content = content.replace(
        "await db.query(`UPDATE checklists SET image_path = ? WHERE id = ?`, [relativePath, req.params.id]);",
        "await db.query(`UPDATE checklists SET image_path = ? WHERE id = ? AND organization_id = ?`, [relativePath, req.params.id, req.user.organization_id]);"
    );

    // POST /
    content = content.replace(
        "INSERT INTO checklist_submissions (template_id, machine_id, user_id, shift, part_name, line_speed, image_url, image2_url, signature_url, comments)",
        "INSERT INTO checklist_submissions (template_id, machine_id, user_id, shift, part_name, line_speed, image_url, image2_url, signature_url, comments, organization_id)"
    );
    content = content.replace(
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    content = content.replace(
        "const subSql = `INSERT INTO checklist_submissions",
        "const org_id = req.user.organization_id;\n        const subSql = `INSERT INTO checklist_submissions"
    );
    content = content.replace(
        "const subResult = await db.query(subSql, [template_id, machine_id, user_id, shift, part_name, line_speed, image1_url, image2_url, signature_url, comments]);",
        "const subResult = await db.query(subSql, [template_id, machine_id, user_id, shift, part_name, line_speed, image1_url, image2_url, signature_url, comments, org_id]);"
    );
    content = content.replace(
        "const legSql = `INSERT INTO checklists (machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent, bekido_percent, image_path, device_info, location, shift, submission_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ${process.env.DATABASE_URL ? 'RETURNING id' : ''}`;",
        "const legSql = `INSERT INTO checklists (machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent, bekido_percent, image_path, device_info, location, shift, submission_id, organization_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ${process.env.DATABASE_URL ? 'RETURNING id' : ''}`;"
    );
    content = content.replace(
        "[machine_id, user_id, legacy_ok, legacy_ng, legacy_total, avg_ng_percent.toFixed(2), bekido_percent.toFixed(2), image_path, device_info || 'Mobile App', location || 'N/A', shift, submission_id]",
        "[machine_id, user_id, legacy_ok, legacy_ng, legacy_total, avg_ng_percent.toFixed(2), bekido_percent.toFixed(2), image_path, device_info || 'Mobile App', location || 'N/A', shift, submission_id, req.user.organization_id]"
    );
    // There are multiple legacy fallbacks
    content = content.replace(
        "const sql = `INSERT INTO checklists (machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent, bekido_percent, image_path, device_info, location, shift) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ${process.env.DATABASE_URL ? 'RETURNING id' : ''}`;",
        "const sql = `INSERT INTO checklists (machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent, bekido_percent, image_path, device_info, location, shift, organization_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ${process.env.DATABASE_URL ? 'RETURNING id' : ''}`;"
    );
    content = content.replace(
        "await db.query(sql, [machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent.toFixed(2), bekido_percent.toFixed(2), image_path, device_info, location, shift]);",
        "await db.query(sql, [machine_id, user_id, ok_quantity, ng_quantity, total_quantity, avg_ng_percent.toFixed(2), bekido_percent.toFixed(2), image_path, device_info, location, shift, req.user.organization_id]);"
    );

    fs.writeFileSync(path, content, 'utf8');
}

processChecklists();
console.log("Done checklists 1");
