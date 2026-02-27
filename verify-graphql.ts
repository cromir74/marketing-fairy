import { crawlNaverPlace } from './src/lib/place-crawler';

async function test() {
    const url = "https://map.naver.com/p/search/%EC%95%88%EC%96%91%EB%A7%9B%EC%A7%91/place/2036861057?placePath=/home";
    console.log("Testing GraphQL Crawler (Standalone)...");
    try {
        const result = await crawlNaverPlace(url);
        console.log("Crawl Result:");
        console.log(JSON.stringify(result, null, 2));

        if (result.success && result.data) {
            console.log("\n--- Verification Success ---");
            console.log(`Name: ${result.data.name}`);
            console.log(`Method: ${result.method}`);
            console.log(`Menu count: ${result.data.menuItems.length}`);
        } else {
            console.log("\n--- Verification Failed ---");
            console.log(`Error: ${result.error}`);
            console.log(`Manual Input Needed: ${result.needsManualInput}`);
        }
    } catch (e: any) {
        console.error("Test execution failed:", e.message);
    }
}

test();
