const https = require('https');

function testUrl(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`URL: ${url}`);
                console.log(`Status Code: ${res.statusCode}`);
                console.log(`Response Snippet: ${data.slice(0, 150)}\n`);
                resolve();
            });
        }).on('error', (err) => {
            console.log(`URL: ${url} failed with error: ${err.message}\n`);
            resolve();
        });
    });
}

async function run() {
    await testUrl('https://machine.siddhiss.com/api/machines');
    await testUrl('https://machineinspectionapp-production.up.railway.app/api/machines');
}
run();
