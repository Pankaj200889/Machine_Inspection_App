const https = require('https');

const API_URL = 'https://machineinspectionapp-production.up.railway.app';

function makeRequest(path, method, data) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_URL + path);
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function test() {
    console.log(`Testing Backend: ${API_URL}`);

    // 1. Test Login
    console.log('\n--- Testing Login (Admin) ---');
    try {
        const loginRes = await makeRequest('/api/auth/login', 'POST', {
            email: 'admin@example.com',
            password: 'admin123'
        });
        console.log(`Status: ${loginRes.status}`);
        console.log('Response:', JSON.stringify(loginRes.data, null, 2));

        if (loginRes.status === 200) {
            console.log('✅ Login Successful!');
        } else {
            console.log('❌ Login Failed.');
            // 2. Try Force Seed if login failed
            console.log('\n--- Attempting Force Seed ---');
            const seedRes = await makeRequest('/api/debug/seed', 'POST', {});
            console.log(`Status: ${seedRes.status}`);
            console.log('Response:', JSON.stringify(seedRes.data, null, 2));
        }
    } catch (err) {
        console.error('Request Failed:', err.message);
    }
}

test();
