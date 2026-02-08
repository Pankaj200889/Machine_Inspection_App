const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function seedPg() {
    console.log('🌱 Starting PostgreSQL Seeding...');

    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL is missing.");
        return;
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const query = (text, params) => pool.query(text, params);

    try {
        // 1. Create Tables
        console.log('🏗️  Creating Tables...');

        await query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'operator',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await query(`CREATE TABLE IF NOT EXISTS machines (
            id SERIAL PRIMARY KEY,
            machine_no TEXT UNIQUE,
            line_no TEXT,
            model TEXT,
            prod_plan INTEGER,
            prod_plan_actual INTEGER DEFAULT 0,
            prod_plan_revised INTEGER DEFAULT 0,
            mct REAL DEFAULT 0,
            working_hours REAL DEFAULT 8,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await query(`CREATE TABLE IF NOT EXISTS checklists (
            id SERIAL PRIMARY KEY,
            machine_id INTEGER REFERENCES machines(id),
            user_id INTEGER REFERENCES users(id),
            ok_quantity INTEGER,
            ng_quantity INTEGER,
            total_quantity INTEGER,
            avg_ng_percent REAL,
            bekido_percent REAL,
            image_path TEXT,
            device_info TEXT,
            location TEXT,
            shift TEXT,
            revised_by INTEGER,
            revised_at TIMESTAMP,
            edit_count INTEGER DEFAULT 0,
            edit_history TEXT,
            remarks TEXT,
            approval_proof_path TEXT,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await query(`CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            action TEXT,
            table_name TEXT,
            target_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            device_info TEXT,
            location TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await query(`CREATE TABLE IF NOT EXISTS organization_settings (
            id SERIAL PRIMARY KEY,
            company_name TEXT,
            logo_url TEXT,
            plant_no TEXT,
            address TEXT,
            subscription_plan TEXT DEFAULT 'trial',
            trial_ends_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2. Seed Admin
        console.log('👤 Seeding Admin...');
        const users = await query("SELECT * FROM users WHERE role = 'admin'");
        if (users.rowCount === 0) {
            const password = 'admin123';
            const salt = bcrypt.genSaltSync(10);
            const hash = bcrypt.hashSync(password, salt);
            await query("INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)",
                ['admin', 'admin@example.com', hash, 'admin']);
            console.log("✅ Admin created: admin@example.com / admin123");
        } else {
            console.log("ℹ️  Admin already exists.");
        }

        // 3. Seed Machines
        console.log('🏭 Seeding Machines...');
        const machines = [
            { no: 'M-101 (Laser)', line: 'L1', model: 'Laser-X' },
            { no: 'M-102 (Bender)', line: 'L1', model: 'Hydraulic-Z' },
            { no: 'M-201 (Welder)', line: 'L2', model: 'RoboWeld' },
            { no: 'M-305 (Assembly)', line: 'L3', model: 'Line-A' }
        ];

        for (const m of machines) {
            try {
                await query("INSERT INTO machines (machine_no, line_no, model, prod_plan) VALUES ($1, $2, $3, 1000) ON CONFLICT (machine_no) DO NOTHING",
                    [m.no, m.line, m.model]);
            } catch (e) { console.error(`Failed to seed machine ${m.no}`, e.message); }
        }

        // 4. Seed Organization
        await query("INSERT INTO organization_settings (company_name, subscription_plan) VALUES ($1, $2) ON CONFLICT DO NOTHING", // PG doesn't have simple ON CONFLICT for non-unique without constraint, but assuming empty table for first run
            ['Siddhi Industrial Solutions', 'trial']);
        // Better check
        const orgs = await query("SELECT * FROM organization_settings");
        if (orgs.rowCount === 0) {
            await query("INSERT INTO organization_settings (company_name, subscription_plan) VALUES ($1, $2)",
                ['Siddhi Industrial Solutions', 'trial']);
        }

        console.log('✅ PostgreSQL Seeding Complete!');

    } catch (err) {
        console.error("❌ Seeding Failed:", err);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    seedPg();
}

module.exports = seedPg;
