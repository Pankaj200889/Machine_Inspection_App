const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'machines.db');
const db = new sqlite3.Database(dbPath);

const seed = () => {
    console.log('🌱 Starting Production Reset...');

    const hashedPassword = bcrypt.hashSync('admin123', 10);

    db.serialize(() => {
        // 1. Wipe Data
        console.log('🧹 Clearing Tables...');
        db.run("DELETE FROM checklists");
        db.run("DELETE FROM machines");
        db.run("DELETE FROM users");
        db.run("DELETE FROM organization_settings");
        db.run("DELETE FROM audit_logs");

        // 2. Create Admin User
        console.log('👤 Creating Default Admin...');

        db.run(`INSERT INTO users (username, password_hash, role) VALUES ('admin', ?, 'admin')`, [hashedPassword], function (err) {
            if (err) return console.error("Error creating admin:", err.message);
            const adminId = this.lastID;
            console.log(`__ Admin Created (ID: ${adminId})`);

            // 3. Seed Machines (Laser, Bender, Welder)
            console.log('🏭 Seeding Machines...');
            const machines = [
                { no: 'M-101 (Laser)', line: 'L1', model: 'Laser-X' },
                { no: 'M-102 (Bender)', line: 'L1', model: 'Hydraulic-Z' },
                { no: 'M-201 (Welder)', line: 'L2', model: 'RoboWeld' },
                { no: 'M-305 (Assembly)', line: 'L3', model: 'Line-A' }
            ];

            const stmt = db.prepare("INSERT INTO machines (machine_no, line_no, model, prod_plan) VALUES (?, ?, ?, 1000)");

            const machineIds = [];
            let completed = 0;

            machines.forEach((m) => {
                stmt.run([m.no, m.line, m.model], function (err) {
                    if (err) console.error("Error creating machine:", err.message);
                    else machineIds.push(this.lastID);

                    completed++;
                    if (completed === machines.length) {
                        finalizeSeeding(adminId, machineIds);
                    }
                });
            });
            stmt.finalize();
        });
    });
};

function finalizeSeeding(adminId, machineIds) {
    if (!adminId || machineIds.length === 0) {
        console.error("Failed to get IDs for seeding checklists.");
        return;
    }

    console.log('📈 Generating Dummy Data...');
    const shifts = ['A', 'B', 'C'];
    const now = new Date();

    db.serialize(() => {
        const stmt = db.prepare(`
            INSERT INTO checklists (
                machine_id, user_id, 
                ok_quantity, ng_quantity, total_quantity, 
                avg_ng_percent, bekido_percent,
                shift, submitted_at,
                device_info, location
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Server Seed', 'Factory')
        `);

        for (let i = 0; i < 30; i++) {
            const daysAgo = Math.floor(Math.random() * 7);
            const date = new Date(now);
            date.setDate(date.getDate() - daysAgo);

            const machineId = machineIds[Math.floor(Math.random() * machineIds.length)];
            const shift = shifts[Math.floor(Math.random() * shifts.length)];

            const total = 500 + Math.floor(Math.random() * 500); // 500-1000
            const ng = Math.floor(Math.random() * 50); // 0-50
            const ok = total - ng;
            const bekido = ((ok / total) * 100).toFixed(1);
            const ng_pct = ((ng / total) * 100).toFixed(1);

            stmt.run([
                machineId, adminId,
                ok, ng, total,
                ng_pct, bekido,
                shift, date.toISOString()
            ]);
        }
        stmt.finalize(() => {
            console.log('✅ Production Reset Complete!');
            console.log('👉 Login: admin / admin123');
        });
    });
}

seed();
