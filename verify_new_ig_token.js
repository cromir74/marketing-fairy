const https = require('https');

const token = "IGAASWpDHmUH9BZAFp1dkJjQlJSdWkxNW9vVkJfcTVNSnl0WkU1dFZAxbk5ULUs4N0cyOU5KMFJjYlo5MnRhMVU5VW9walRwY1pjaTRKSlNSQlJSYTJ5Q3lGRU5ZAX2RkOW1rUDlzRG50a290YXNtSVRnWXp0bDZAvT3NuQXpJUXcySQZDZD";

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

async function verifyToken() {
    try {
        console.log("--- Verifying New Token ---");
        const me = await makeRequest(`/v25.0/me?fields=id,username`);
        console.log("Result:", JSON.stringify(me, null, 2));
        if (me.id) {
            console.log("SUCCESS: Token is valid.");
        } else {
            console.log("FAILURE: Token verification failed.");
        }
    } catch (e) {
        console.error("Error during verification:", e);
    }
}

verifyToken();
