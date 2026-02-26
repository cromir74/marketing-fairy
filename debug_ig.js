const https = require('https');

const token = "IGAASWpDHmUH9BZAFlZAMnEzVG5mOEtNSkpfQUJPU3Rna0FQaHpXSEZApTFY2ZA3FDU0NfZADlHa1VoN0R5WGZApQ3hTWU44NmpaR1JSWUFpTmtWZAmNPbkswQkNfYjhGUjVoS3RIMmlDYjg4eElWMnhsOHZAWdUtSUXFyOTVJVzUwUHJHVQZDZD";
const igId = "33961503096827180";

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'graph.instagram.com',
            path: `${path}&access_token=${token}`,
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

async function debug() {
    try {
        console.log("--- Checking Account Info ---");
        const accountInfo = await makeRequest(`/v25.0/${igId}?fields=id,username,name,biography`);
        console.log("Account Info:", JSON.stringify(accountInfo, null, 2));

        console.log("\n--- Checking Token Permissions ---");
        // Graph API for token debug is usually on graph.facebook.com, but let's try graph.instagram.com first
        // Note: for IGAAS tokens (Instagram Basic Display or similar), the debug behavior might differ
        const tokenInfo = await makeRequest(`/debug_token?input_token=${token}`);
        console.log("Token Info:", JSON.stringify(tokenInfo, null, 2));

    } catch (e) {
        console.error("Error during debug:", e);
    }
}

debug();
