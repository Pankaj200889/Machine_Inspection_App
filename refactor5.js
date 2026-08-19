const fs = require('fs');

function processOrg() {
    let path = 'server/routes/organization.js';
    let content = fs.readFileSync(path, 'utf8');

    // Replace verifyAdmin definition with import
    content = content.replace(
        /const verifyAdmin = \(req, res, next\) => \{[\s\S]*?next\(\);\n    \}\);\n\};/,
        "const { verifyUser, verifyAdmin } = require('../middleware/authMiddleware');"
    );

    // GET /
    content = content.replace(
        "router.get('/', async (req, res) => {",
        "router.get('/', verifyUser, async (req, res) => {"
    );
    content = content.replace(
        "const result = await db.query(\"SELECT * FROM organization_settings LIMIT 1\");",
        "const result = await db.query(\"SELECT * FROM organization_settings WHERE id = ?\", [req.user.organization_id]);"
    );

    // PUT /
    content = content.replace(
        "const checkResult = await db.query(\"SELECT id FROM organization_settings LIMIT 1\");",
        "const checkResult = await db.query(\"SELECT id FROM organization_settings WHERE id = ?\", [req.user.organization_id]);"
    );
    // the UPDATE query
    content = content.replace(
        "await db.query(sql, [company_name, finalLogoUrl, plant_no, address, row.id]);",
        "await db.query(sql, [company_name, finalLogoUrl, plant_no, address, req.user.organization_id]);"
    );
    // the INSERT query for org
    // Actually, users can't create orgs here anymore. Orgs are created by super_admin.
    // If they try to update and it doesn't exist, it's an error because orgs must be created by super admin.
    content = content.replace(
        "const sql = `INSERT INTO organization_settings (company_name, logo_url, plant_no, address) VALUES (?, ?, ?, ?)`;\n            await db.query(sql, [company_name, finalLogoUrl, plant_no, address]);\n            res.json({ message: 'Organization Created', logo_url: finalLogoUrl });",
        "return res.status(404).json({ error: 'Organization not found. Contact Support.' });"
    );

    fs.writeFileSync(path, content, 'utf8');
}

processOrg();
console.log("Done org");
