const fs = require('fs');
const path = require('path');

function run() {
    // 1. Update database.js
    let dbPath = 'server/database.js';
    let dbContent = fs.readFileSync(dbPath, 'utf8');

    // Add subdomain to organization_settings
    dbContent = dbContent.replace(
        "company_name TEXT NOT NULL,",
        "company_name TEXT NOT NULL,\n    subdomain TEXT UNIQUE,"
    );

    // Add migration for subdomain
    dbContent = dbContent.replace(
        "// PostgreSQL specific initialization",
        "// PostgreSQL specific initialization\n        try { await query(`ALTER TABLE organization_settings ADD COLUMN subdomain TEXT UNIQUE;`); } catch(e) {}"
    );

    // Set default subdomain for organization 1
    dbContent = dbContent.replace(
        "await query(`UPDATE users SET organization_id = 1 WHERE organization_id IS NULL AND role != 'super_admin'`);",
        "await query(`UPDATE users SET organization_id = 1 WHERE organization_id IS NULL AND role != 'super_admin'`);\n        try { await query(`UPDATE organization_settings SET subdomain = 'siddhi' WHERE id = 1`); } catch(e) {}"
    );

    fs.writeFileSync(dbPath, dbContent);

    // 2. Update superadmin.js
    let saPath = 'server/routes/superadmin.js';
    let saContent = fs.readFileSync(saPath, 'utf8');

    saContent = saContent.replace(
        "const { company_name, admin_email, admin_password } = req.body;",
        "const { company_name, admin_email, admin_password, subdomain } = req.body;"
    );

    saContent = saContent.replace(
        "if (!company_name || !admin_email || !admin_password) {",
        "if (!company_name || !admin_email || !admin_password || !subdomain) {"
    );

    saContent = saContent.replace(
        "const orgSql = \"INSERT INTO organization_settings (company_name, subscription_plan, status) VALUES (?, 'active', 'active') RETURNING id\";\n        const orgRes = await db.query(orgSql, [company_name]);",
        "const orgSql = \"INSERT INTO organization_settings (company_name, subdomain, subscription_plan, status) VALUES (?, ?, 'active', 'active') RETURNING id\";\n        const orgRes = await db.query(orgSql, [company_name, subdomain.toLowerCase()]);"
    );

    fs.writeFileSync(saPath, saContent);

    // 3. Create public.js
    let publicCode = `const express = require('express');
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
`;
    fs.writeFileSync('server/routes/public.js', publicCode);

    // 4. Update server.js
    let serverPath = 'server/server.js';
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    
    serverContent = serverContent.replace(
        "const superadminRoutes = require('./routes/superadmin');",
        "const superadminRoutes = require('./routes/superadmin');\nconst publicRoutes = require('./routes/public');"
    );

    serverContent = serverContent.replace(
        "app.use('/api/superadmin', superadminRoutes);",
        "app.use('/api/superadmin', superadminRoutes);\napp.use('/api/public', publicRoutes);"
    );

    fs.writeFileSync(serverPath, serverContent);

    // 5. Update auth.js
    let authPath = 'server/routes/auth.js';
    let authContent = fs.readFileSync(authPath, 'utf8');

    authContent = authContent.replace(
        "const { email, password } = req.body;",
        "const { email, password, subdomain } = req.body;"
    );

    authContent = authContent.replace(
        "LEFT JOIN organization_settings o ON u.organization_id = o.id \n            WHERE u.email = ? OR u.username = ?",
        "LEFT JOIN organization_settings o ON u.organization_id = o.id \n            WHERE (u.email = ? OR u.username = ?)"
    );

    authContent = authContent.replace(
        "if (user.role !== 'super_admin' && user.org_status === 'suspended') {",
        "// Verify subdomain match if not super_admin\n        if (user.role !== 'super_admin' && subdomain) {\n            const orgCheck = await db.query('SELECT subdomain FROM organization_settings WHERE id = ?', [user.organization_id]);\n            if (orgCheck.rows.length > 0 && orgCheck.rows[0].subdomain !== subdomain) {\n                return res.status(403).json({ error: 'This user account does not belong to this portal.' });\n            }\n        }\n\n        if (user.role !== 'super_admin' && user.org_status === 'suspended') {"
    );

    fs.writeFileSync(authPath, authContent);
    
    console.log("Backend refactor complete");
}

run();
