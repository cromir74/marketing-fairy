import fs from 'fs';

async function testFetch() {
    try {
        const res = await fetch("https://m.place.naver.com/restaurant/1342365991/home", {
            headers: {
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)"
            }
        });
        const html = await res.text();
        const apolloIdx = html.indexOf("__APOLLO_STATE__ = ");
        if (apolloIdx === -1) {
            console.log("No APOLLO STATE");
            return;
        }
        const start = apolloIdx + "__APOLLO_STATE__ = ".length;
        const end = html.indexOf("};", start) + 1;
        const jsonStr = html.slice(start, end);
        console.log("Found JSON length:", jsonStr.length);
        fs.writeFileSync("apollo-state.json", jsonStr);
    } catch (e) {
        console.error(e);
    }
}
testFetch();
