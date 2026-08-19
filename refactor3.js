const fs = require('fs');

function processChecklists2() {
    let path = 'server/routes/checklists.js';
    let content = fs.readFileSync(path, 'utf8');

    // GET /submissions/:id
    content = content.replace(
        "WHERE s.id = ?",
        "WHERE s.id = ? AND s.organization_id = ?"
    );
    content = content.replace(
        "[submissionId]",
        "[submissionId, req.user.organization_id]"
    );

    // POST /submissions/:id/sign
    content = content.replace(
        "WHERE id = ?\n            `, [user_id, submissionId]",
        "WHERE id = ? AND organization_id = ?\n            `, [user_id, submissionId, req.user.organization_id]"
    );
    content = content.replace(
        "WHERE id = ?\n            `, [user_id, submissionId]",
        "WHERE id = ? AND organization_id = ?\n            `, [user_id, submissionId, req.user.organization_id]" // the second one
    );

    // PUT /:id
    content = content.replace(
        "SELECT * FROM checklists WHERE id = ?",
        "SELECT * FROM checklists WHERE id = ? AND organization_id = ?"
    );
    content = content.replace(
        "[checklistId]",
        "[checklistId, req.user.organization_id]"
    );
    content = content.replace(
        "WHERE id = ?\n        `;\n\n        await db.query(sql, [newOk, newNg, newTotal, newAvgNg.toFixed(2), newBekido.toFixed(2), finalImage, finalProof, newRemarks, req.user.id, JSON.stringify(history), checklistId]);",
        "WHERE id = ? AND organization_id = ?\n        `;\n\n        await db.query(sql, [newOk, newNg, newTotal, newAvgNg.toFixed(2), newBekido.toFixed(2), finalImage, finalProof, newRemarks, req.user.id, JSON.stringify(history), checklistId, req.user.organization_id]);"
    );

    // GET / (history)
    // This didn't have verifyUser! Need to replace it first.
    content = content.replace(
        "router.get('/', async (req, res) => {",
        "router.get('/', verifyUser, async (req, res) => {"
    );
    content = content.replace(
        "LEFT JOIN checklist_templates t ON cs.template_id = t.id\n               ORDER BY submitted_at DESC LIMIT 50`;\n    let params = [];",
        "LEFT JOIN checklist_templates t ON cs.template_id = t.id\n               WHERE checklists.organization_id = ? \n               ORDER BY submitted_at DESC LIMIT 50`;\n    let params = [req.user.organization_id];"
    );
    content = content.replace(
        "LEFT JOIN checklist_templates t ON cs.template_id = t.id\n               WHERE machine_id = ? \n               ORDER BY submitted_at DESC`;\n        params = [machine_id];",
        "LEFT JOIN checklist_templates t ON cs.template_id = t.id\n               WHERE machine_id = ? AND checklists.organization_id = ? \n               ORDER BY submitted_at DESC`;\n        params = [machine_id, req.user.organization_id];"
    );

    // DELETE /:id
    content = content.replace(
        "const cRes = await db.query(\"SELECT image_path FROM checklists WHERE id = ?\", [checklistId]);",
        "const cRes = await db.query(\"SELECT image_path FROM checklists WHERE id = ? AND organization_id = ?\", [checklistId, req.user.organization_id]);"
    );
    content = content.replace(
        "await db.query(\"DELETE FROM checklists WHERE id = ?\", [checklistId]);",
        "await db.query(\"DELETE FROM checklists WHERE id = ? AND organization_id = ?\", [checklistId, req.user.organization_id]);"
    );

    fs.writeFileSync(path, content, 'utf8');
}

processChecklists2();
console.log("Done checklists 2");
