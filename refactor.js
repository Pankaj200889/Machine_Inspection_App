const fs = require('fs');

function processMachines() {
    let path = 'server/routes/machines.js';
    let content = fs.readFileSync(path, 'utf8');

    content = content.replace(
        "INSERT INTO machines (machine_no, line_no, model, prod_plan, prod_plan_actual, mct, working_hours) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
        "INSERT INTO machines (machine_no, line_no, model, prod_plan, prod_plan_actual, mct, working_hours, organization_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id"
    );
    content = content.replace(
        "await db.query(sql, [machine_no, line_no, model, prod_plan, prod_plan_actual || 0, mct || 0, working_hours || 8]);",
        "await db.query(sql, [machine_no, line_no, model, prod_plan, prod_plan_actual || 0, mct || 0, working_hours || 8, req.user.organization_id]);"
    );
    
    // PUT /:id
    content = content.replace(
        "working_hours = COALESCE(?, working_hours)\n                 WHERE id = ?`",
        "working_hours = COALESCE(?, working_hours)\n                 WHERE id = ? AND organization_id = ?`"
    );
    content = content.replace(
        "[machine_no, line_no, model, prod_plan, prod_plan_actual, mct, working_hours, req.params.id]",
        "[machine_no, line_no, model, prod_plan, prod_plan_actual, mct, working_hours, req.params.id, req.user.organization_id]"
    );
    
    // DELETE /:id
    content = content.replace(
        "DELETE FROM machines WHERE id = ?\"",
        "DELETE FROM machines WHERE id = ? AND organization_id = ?\""
    );
    // Replace the first occurrence of [req.params.id] after DELETE
    // It's safer to use regex
    content = content.replace(
        /const result = await db.query\(sql, \[req.params.id\]\);\s+res.json\(\{ message: 'Deleted'/,
        "const result = await db.query(sql, [req.params.id, req.user.organization_id]);\n        res.json({ message: 'Deleted'"
    );

    // GET /:id/qr
    content = content.replace(
        "SELECT * FROM machines WHERE id = ?\"",
        "SELECT * FROM machines WHERE id = ? AND organization_id = ?\""
    );
    content = content.replace(
        /const result = await db.query\(sql, \[req.params.id\]\);\s+const row = result.rows\[0\];/,
        "const result = await db.query(sql, [req.params.id, req.user.organization_id]);\n        const row = result.rows[0];"
    );

    // PUT /:id/production
    content = content.replace(
        "params.push(req.params.id);\n    const sql = `UPDATE machines SET ${fields.join(', ')} WHERE id = ?`;",
        "params.push(req.params.id);\n    params.push(req.user.organization_id);\n    const sql = `UPDATE machines SET ${fields.join(', ')} WHERE id = ? AND organization_id = ?`;"
    );

    fs.writeFileSync(path, content, 'utf8');
}

processMachines();
console.log("Done machines");
