const { Pool } = require('../server/node_modules/pg');
const bcrypt = require('../server/node_modules/bcryptjs');

const url = "postgresql://postgres:LfEANtORXNHsLmHJREoDKfONZmbNXPEj@tramway.proxy.rlwy.net:48989/railway";
const pgPool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
});

async function test() {
    const email = 'admin@test.com';
    const password = 'Admin@124578';

    const sql = `SELECT * FROM users WHERE email = $1 OR username = $2`;
    try {
        const result = await pgPool.query(sql, [email, email]);
        const user = result.rows[0];
        console.log("User found:", user);

        if (!user) {
            console.log("Error: User not found");
            return;
        }

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        console.log("Password match:", isMatch);
    } catch (e) {
        console.error(e);
    } finally {
        pgPool.end();
    }
}
test();
