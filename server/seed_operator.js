const db = require('./database');
const bcrypt = require('bcryptjs');

async function seedOperator() {
    console.log("Seeding Operator...");
    const username = 'operator@test.com';
    const email = 'operator@test.com'; // Using same for simplicity as requested
    const password = 'operator123';

    // Check if exists
    const check = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (check.rows.length > 0) {
        console.log("Operator already exists. Updating password...");
        // Update password just in case
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [hash, check.rows[0].id]);
        console.log("Password updated to 'operator123'");
    } else {
        console.log("Creating new operator...");
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        await db.query("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
            [username, email, hash, 'operator']);
        console.log("Operator created.");
    }
}

seedOperator().then(() => {
    console.log("Done");
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
