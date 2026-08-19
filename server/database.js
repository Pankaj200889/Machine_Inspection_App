const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcryptjs');

// Environment Configuration
const isPostgres = !!process.env.DATABASE_URL;

let db;
let pgPool;

if (isPostgres) {
    console.log('Using PostgreSQL Database');
    const isInternal = process.env.DATABASE_URL.includes('.internal');
    pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isInternal ? false : { rejectUnauthorized: false }
    });
    initPg();
} else {
    console.log('Using SQLite Database (Local)');
    const dbPath = path.resolve(__dirname, 'machines.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) console.error("Error opening SQLite:", err.message);
        else {
            db.run('PRAGMA journal_mode = WAL;');
            initSqlite();
        }
    });
}

// --- Query Wrapper (Promise-based) ---
// Returns { rows: [], rowCount: 0, lastID: ... }
const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            // Convert ? to $1, $2...
            let paramIndex = 1;
            const pgText = text.replace(/\?/g, () => `$${paramIndex++}`);

            pgPool.query(pgText, params, (err, res) => {
                if (err) return reject(err);
                resolve({
                    rows: res.rows,
                    rowCount: res.rowCount,
                    lastID: res.rows[0]?.id // PG usually returns inserted ID via RETURNING clause
                });
            });
        } else {
            // SQLite Wrapper
            // Determine if SELECT (all) or INSERT/UPDATE (run)
            const method = text.trim().toUpperCase().startsWith('SELECT') ? 'all' : 'run';

            if (method === 'all') {
                db.all(text, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve({ rows: rows || [], rowCount: rows?.length || 0 });
                });
            } else {
                db.run(text, params, function (err) {
                    if (err) reject(err);
                    else resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
                });
            }
        }
    });
};

// --- Initialization Scripts ---

function initSqlite() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            role TEXT DEFAULT 'operator',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_no TEXT UNIQUE,
            line_no TEXT,
            model TEXT,
            prod_plan INTEGER,
            prod_plan_actual INTEGER DEFAULT 0,
            prod_plan_revised INTEGER DEFAULT 0,
            mct REAL DEFAULT 0,
            working_hours REAL DEFAULT 8,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS checklists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            machine_id INTEGER,
            user_id INTEGER,
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
            revised_at DATETIME,
            edit_count INTEGER DEFAULT 0,
            edit_history TEXT,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(machine_id) REFERENCES machines(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT,
            table_name TEXT,
            target_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            device_info TEXT,
            location TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS organization_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT,
            logo_url TEXT,
            plant_no TEXT,
            address TEXT,
            subscription_plan TEXT DEFAULT 'trial',
            trial_ends_at DATETIME,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Dynamic Checklist Tables
        db.run(`CREATE TABLE IF NOT EXISTS checklist_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_name TEXT NOT NULL,
            doc_no TEXT,
            rev_no TEXT DEFAULT '00',
            rev_date TEXT,
            frequency TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS template_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER,
            section_name TEXT NOT NULL,
            order_index INTEGER DEFAULT 0,
            FOREIGN KEY(template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS template_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER,
            check_point TEXT NOT NULL,
            specification TEXT,
            checking_method TEXT,
            responsibility TEXT DEFAULT 'Operator',
            input_type TEXT DEFAULT 'numeric',
            expected_min REAL,
            expected_max REAL,
            is_mandatory INTEGER DEFAULT 1,
            order_index INTEGER DEFAULT 0,
            FOREIGN KEY(section_id) REFERENCES template_sections(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS checklist_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_id INTEGER,
            machine_id INTEGER,
            user_id INTEGER,
            shift TEXT NOT NULL,
            part_name TEXT,
            line_speed TEXT,
            checked_by INTEGER,
            checked_at DATETIME,
            approved_by INTEGER,
            approved_at DATETIME,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(template_id) REFERENCES checklist_templates(id),
            FOREIGN KEY(machine_id) REFERENCES machines(id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(checked_by) REFERENCES users(id),
            FOREIGN KEY(approved_by) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS checklist_submission_values (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER,
            item_id INTEGER,
            actual_value TEXT,
            is_ok INTEGER DEFAULT 1,
            remarks TEXT,
            FOREIGN KEY(submission_id) REFERENCES checklist_submissions(id) ON DELETE CASCADE,
            FOREIGN KEY(item_id) REFERENCES template_items(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS machine_templates (
            machine_id INTEGER,
            template_id INTEGER,
            PRIMARY KEY (machine_id, template_id),
            FOREIGN KEY(machine_id) REFERENCES machines(id) ON DELETE CASCADE,
            FOREIGN KEY(template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
        )`);

        // Migration for Trial Columns
        const orgCols = ['subscription_plan', 'trial_ends_at'];
        orgCols.forEach(col => {
            let type = 'TEXT';
            if (col === 'trial_ends_at') type = 'DATETIME';
            db.run(`ALTER TABLE organization_settings ADD COLUMN ${col} ${type}`, (err) => { });
        });

        // Migration for Admin Features (Remarks & Proof)
        const checklistCols = ['remarks', 'approval_proof_path', 'submission_id'];
        checklistCols.forEach(col => {
            let type = 'TEXT';
            if (col === 'submission_id') type = 'INTEGER';
            db.run(`ALTER TABLE checklists ADD COLUMN ${col} ${type}`, (err) => { });
        });

        // Migration for new Submission fields
        const submissionCols = ['image_url', 'image2_url', 'signature_url', 'comments'];
        submissionCols.forEach(col => {
            db.run(`ALTER TABLE checklist_submissions ADD COLUMN ${col} TEXT`, (err) => { });
        });

        seedData();
    });
}

async function initPg() {
    try {
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

        const legacyCols = ['remarks', 'approval_proof_path'];
        for (const col of legacyCols) {
            try {
                await query(`ALTER TABLE checklists ADD COLUMN ${col} TEXT`);
            } catch(e) {}
        }
        try {
            await query(`ALTER TABLE checklists ADD COLUMN submission_id INTEGER`);
        } catch(e) {}

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

        // Dynamic Checklist Tables (Postgres)
        await query(`CREATE TABLE IF NOT EXISTS checklist_templates (
            id SERIAL PRIMARY KEY,
            template_name TEXT NOT NULL,
            doc_no TEXT,
            rev_no TEXT DEFAULT '00',
            rev_date TEXT,
            frequency TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await query(`CREATE TABLE IF NOT EXISTS template_sections (
            id SERIAL PRIMARY KEY,
            template_id INTEGER REFERENCES checklist_templates(id) ON DELETE CASCADE,
            section_name TEXT NOT NULL,
            order_index INTEGER DEFAULT 0
        )`);

        await query(`CREATE TABLE IF NOT EXISTS template_items (
            id SERIAL PRIMARY KEY,
            section_id INTEGER REFERENCES template_sections(id) ON DELETE CASCADE,
            check_point TEXT NOT NULL,
            specification TEXT,
            checking_method TEXT,
            responsibility TEXT DEFAULT 'Operator',
            input_type TEXT DEFAULT 'numeric',
            expected_min REAL,
            expected_max REAL,
            is_mandatory INTEGER DEFAULT 1,
            order_index INTEGER DEFAULT 0
        )`);

        await query(`CREATE TABLE IF NOT EXISTS checklist_submissions (
            id SERIAL PRIMARY KEY,
            template_id INTEGER REFERENCES checklist_templates(id),
            machine_id INTEGER REFERENCES machines(id),
            user_id INTEGER REFERENCES users(id),
            shift TEXT NOT NULL,
            part_name TEXT,
            line_speed TEXT,
            checked_by INTEGER REFERENCES users(id),
            checked_at TIMESTAMP,
            approved_by INTEGER REFERENCES users(id),
            approved_at TIMESTAMP,
            image_url TEXT,
            image2_url TEXT,
            signature_url TEXT,
            comments TEXT,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        const subCols = ['image_url', 'image2_url', 'signature_url', 'comments'];
        for (const col of subCols) {
            try {
                await query(`ALTER TABLE checklist_submissions ADD COLUMN ${col} TEXT`);
            } catch (e) {
                if (e.code !== '42701') {
                    console.error(`Error adding column ${col} to checklist_submissions:`, e);
                }
            }
        }

        await query(`CREATE TABLE IF NOT EXISTS checklist_submission_values (
            id SERIAL PRIMARY KEY,
            submission_id INTEGER REFERENCES checklist_submissions(id) ON DELETE CASCADE,
            item_id INTEGER REFERENCES template_items(id),
            actual_value TEXT,
            is_ok INTEGER DEFAULT 1,
            remarks TEXT
        )`);

        await query(`CREATE TABLE IF NOT EXISTS machine_templates (
            machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
            template_id INTEGER REFERENCES checklist_templates(id) ON DELETE CASCADE,
            PRIMARY KEY (machine_id, template_id)
        )`);

        // Multi-Tenant Migrations
        try { await query(`ALTER TABLE organization_settings ADD COLUMN status TEXT DEFAULT 'active'`); } catch(e) {}

        const tablesToAddOrg = ['users', 'machines', 'checklist_templates', 'checklists', 'checklist_submissions', 'audit_logs'];
        for (const table of tablesToAddOrg) {
            try {
                await query(`ALTER TABLE ${table} ADD COLUMN organization_id INTEGER REFERENCES organization_settings(id)`);
                if (table === 'users') {
                    await query(`UPDATE users SET organization_id = 1 WHERE organization_id IS NULL AND role != 'super_admin'`);
                } else {
                    await query(`UPDATE ${table} SET organization_id = 1 WHERE organization_id IS NULL`);
                }
            } catch(e) {
                try {
                    if (table === 'users') {
                        await query(`UPDATE users SET organization_id = 1 WHERE organization_id IS NULL AND role != 'super_admin'`);
                    } else {
                        await query(`UPDATE ${table} SET organization_id = 1 WHERE organization_id IS NULL`);
                    }
                } catch(err) {}
            }
        }

        // Set Pankaj to super_admin
        try {
            await query(`UPDATE users SET role = 'super_admin', organization_id = NULL WHERE username ILIKE 'pankaj'`);
        } catch(e) {}

        seedData();
        console.log("PostgreSQL Tables Initialized");
    } catch (err) {
        console.error("Error initializing Postgres:", err);
    }
}

async function seedData() {
    // Seed Org
    const orgs = await query("SELECT * FROM organization_settings");
    if (orgs.rows.length === 0) {
        // Default to 'trial' plan (Entry Level) - No Expiry
        await query("INSERT INTO organization_settings (company_name, subscription_plan) VALUES (?, ?)",
            ['Siddhi Industrial Solutions', 'trial']);
    }

    // Seed Admin
    const users = await query("SELECT * FROM users WHERE role = 'admin'");
    if (users.rows.length === 0) {
        const password = 'admin';
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        await query("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
            ['admin', 'admin@example.com', hash, 'admin']);
        console.log("Seeded admin user");
    }

    // Seed Operator (Standard Testing Account)
    const operators = await query("SELECT * FROM users WHERE username = 'operator'");
    if (operators.rows.length === 0) {
        const password = 'operator123';
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        await query("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
            ['operator', 'operator@example.com', hash, 'operator']);
        console.log("Seeded operator user");
    }
}

module.exports = { query };
