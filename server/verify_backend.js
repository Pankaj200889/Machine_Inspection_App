// Using native fetch
// Node 18+ has global fetch.

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log("Starting Verification...");
    let adminToken = '';
    let operatorToken = '';
    let machineId = 0;

    // 1. Login Admin
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'admin' })
        });
        if (!res.ok) throw new Error(`Admin login failed: ${res.statusText}`);
        const data = await res.json();
        adminToken = data.token;
        console.log("✅ Admin Login Success");
    } catch (e) {
        console.error("❌ Admin Login Failed", e.message);
        return;
    }

    // 2. Add Machine
    try {
        const res = await fetch(`${BASE_URL}/machines`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                machine_no: `M-${Date.now()}`,
                line_no: 'L1',
                model: 'TestModel',
                prod_plan: 100
            })
        });
        if (!res.ok) throw new Error(`Add Machine failed: ${res.statusText}`);
        const data = await res.json();
        machineId = data.id; // Adjust based on actual response structure
        console.log(`✅ Add Machine Success (ID: ${machineId})`);
    } catch (e) {
        console.error("❌ Add Machine Failed", e.message);
    }

    // 3. Register Operator
    const opEmail = `op${Date.now()}@test.com`;
    try {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `op${Date.now()}`,
                email: opEmail,
                password: 'password123',
                role: 'operator'
            })
        });
        if (!res.ok) throw new Error(`Register Operator failed: ${res.statusText}`);
        console.log("✅ Register Operator Success");
    } catch (e) {
        console.error("❌ Register Operator Failed", e.message);
    }

    // 4. Login Operator
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: opEmail, password: 'password123' })
        });
        if (!res.ok) throw new Error(`Operator login failed: ${res.statusText}`);
        const data = await res.json();
        operatorToken = data.token;
        console.log("✅ Operator Login Success");
    } catch (e) {
        console.error("❌ Operator Login Failed", e.message);
        return;
    }

    // 5. Submit Checklist
    if (machineId) {
        try {
            // FormData is tricky in raw node fetch without libraries, but let's try JSON if API supports it,
            // OR use 'multipart/form-data' boundary manually? 
            // The ChecklistForm.jsx sends FormData.
            // Let's check server/routes/checklists.js to see if it parses body fields even without file?
            // Usually multer processes the file, but fields are available in req.body.
            // I'll skip the image for this test to keep it simple, or mock it if strictly required.

            const formData = new FormData();
            formData.append('machine_id', machineId);
            formData.append('ok_quantity', 90);
            formData.append('ng_quantity', 10);
            formData.append('total_quantity', 100);
            formData.append('avg_ng_percent', 10.00);
            formData.append('bekido_percent', 100.00);

            const res = await fetch(`${BASE_URL}/checklists`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${operatorToken}`
                    // fetch automatically sets Content-Type for FormData
                },
                body: formData
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Submit Checklist failed: ${res.status} ${txt}`);
            }
            console.log("✅ Submit Checklist Success");

        } catch (e) {
            console.error("❌ Submit Checklist Failed", e.message);
        }
    } else {
        console.warn("⚠️ Skipping checklist submission (no machine ID)");
    }

    console.log("Verify Script Complete");
}

runTests();
