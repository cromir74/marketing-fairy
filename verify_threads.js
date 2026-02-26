const https = require('https');

const token = "THAAezzpAu44NBUVJjdkt1V2J1c3ZAtOE1QSWY0VVhQQXlfVzR2YUItRDgwS2ZALTi1PNG02ZAjVYeTN5b05wLUV1NkhJc0xIWkFNc1VIVEhiN2lENUNRTU12NUZAodUFFMWZAJTk5kUkY5QktMS08wZAkJHSEljSXg4eXM3QTluYU4zaVBTUmJDZAk5WeFBHbTBlNlkZD";

const options = {
    hostname: 'graph.threads.net',
    path: `/v1.0/me?fields=id,username&access_token=${token}`,
    method: 'GET'
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(data);
    });
});

req.on('error', (e) => {
    console.error(e);
});

req.end();
