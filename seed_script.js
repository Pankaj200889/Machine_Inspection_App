const fs = require('fs');

async function seed() {
    try {
        console.log("Logging in as SuperAdmin...");
        const loginRes = await fetch('https://machine-api.siddhiss.com/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'pankaj@siddhiss.com',
                password: 'Pankaj@2026'
            })
        });
        
        const loginData = await loginRes.json();

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
        }

        const token = loginData.token;
        console.log("Got token:", token.substring(0, 10) + '...');

        console.log("Reading final_templates.json...");
        const templates = JSON.parse(fs.readFileSync('final_templates.json', 'utf8'));

        console.log("Seeding templates...", templates.length, "templates");
        const seedRes = await fetch('https://machine-api.siddhiss.com/api/superadmin/seed-templates', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ templates })
        });

        const seedData = await seedRes.text();
        console.log("Seed success:", seedRes.status, seedData);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

seed();
