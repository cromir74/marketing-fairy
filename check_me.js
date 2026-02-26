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

async function listMe() {
    try {
        console.log("--- Checking /me ---");
        const me = await makeRequest(`/v25.0/me?fields=id,username,account_type`);
        console.log(JSON.stringify(me, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

listMe();
