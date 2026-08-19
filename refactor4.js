const fs = require('fs');

function processAuth() {
    let path = 'server/routes/auth.js';
    let content = fs.readFileSync(path, 'utf8');

    content = content.replace(
        "const db = require('../database');",
        "const db = require('../database');\nconst { verifyUser, verifyAdmin, verifySuperAdmin } = require('../middleware/authMiddleware');"
    );

    // Register User
    content = content.replace(
        "router.post('/register', async (req, res) => {",
        "router.post('/register', verifyAdmin, async (req, res) => {"
    );
    content = content.replace(
        "const sql = `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`;",
        "const sql = `INSERT INTO users (username, email, password_hash, role, organization_id) VALUES (?, ?, ?, ?, ?)`;"
    );
    content = content.replace(
        "const result = await db.query(sql, [username, email, hash, userRole]);",
        "const result = await db.query(sql, [username, email, hash, userRole, req.user.organization_id]);"
    );

    // List Users
    content = content.replace(
        "router.get('/users', async (req, res) => {",
        "router.get('/users', verifyAdmin, async (req, res) => {"
    );
    content = content.replace(
        "const result = await db.query(\"SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC\");",
        "const result = await db.query(\"SELECT id, username, email, role, created_at FROM users WHERE organization_id = ? ORDER BY created_at DESC\", [req.user.organization_id]);"
    );

    // Delete User
    content = content.replace(
        "router.delete('/users/:id', async (req, res) => {",
        "router.delete('/users/:id', verifyAdmin, async (req, res) => {"
    );
    content = content.replace(
        "await db.query(\"DELETE FROM users WHERE id = ?\", [id]);",
        "await db.query(\"DELETE FROM users WHERE id = ? AND organization_id = ?\", [id, req.user.organization_id]);"
    );

    // Generate Reset Link
    content = content.replace(
        "router.post('/users/:id/reset-link', async (req, res) => {",
        "router.post('/users/:id/reset-link', verifyAdmin, async (req, res) => {"
    );
    content = content.replace(
        "const result = await db.query(\"SELECT * FROM users WHERE id = ?\", [id]);",
        "const result = await db.query(\"SELECT * FROM users WHERE id = ? AND organization_id = ?\", [id, req.user.organization_id]);"
    );

    fs.writeFileSync(path, content, 'utf8');
}

processAuth();
console.log("Done auth");
