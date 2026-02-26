const https = require('https');

const token = "IGAASWpDHmUH9BZAFlZAMnEzVG5mOEtNSkpfQUJPU3Rna0FQaHpXSEZApTFY2ZA3FDU0NfZADlHa1VoN0R5WGZApQ3hTWU44NmpaR1JSWUFpTmtWZAmNPbkswQkNfYjhGUjVoS3RIMmlDYjg4eElWMnhsOHZAWdUtSUXFyOTVJVzUwUHJHVQZDZD";

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'graph.instagram.com',
            path: `${path}?access_token=${token}`,
            method: 'GET'
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', (e) => reject(e));
        req.end();
    });
}

async function checkPermissions() {
    try {
        console.log("--- Checking Permissions ---");
        const perms = await makeRequest(`/me/permissions`);
        console.log(JSON.stringify(perms, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

checkPermissions();
