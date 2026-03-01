import { createClient } from "./supabase/server";

const INSTAGRAM_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const INSTAGRAM_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_API_VERSION = "v25.0";

const THREADS_ID = process.env.THREADS_USER_ID;
const THREADS_TOKEN = process.env.THREADS_ACCESS_TOKEN;
const THREADS_API_VERSION = "v1.0";

async function waitForContainerReady(creationId: string, accessToken: string, platform: "instagram" | "threads") {
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 15; // 최대 45초

    const domain = platform === "instagram" ? "graph.instagram.com" : "graph.threads.net";
    const version = platform === "instagram" ? IG_API_VERSION : THREADS_API_VERSION;
    const statusField = platform === "instagram" ? "status_code" : "status";

    while (!isReady && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000));

        const statusRes = await fetch(
            `https://${domain}/${version}/${creationId}?fields=${statusField},error_message&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();
        const statusValue = platform === "instagram" ? statusData.status_code : statusData.status;

        if (statusValue === "FINISHED") {
            isReady = true;
        } else if (statusValue === "ERROR") {
            throw new Error(`${platform} 처리 실패: ${statusData.error_message || statusValue}`);
        }
        console.log(`[${platform}] Container ${creationId} status: ${statusValue} (${attempts}/${maxAttempts})`);
    }

    if (!isReady) throw new Error(`${platform} 이미지 처리 시간이 초과되었습니다.`);
}

export async function publishToInstagram(imageUrls: string[], content: string) {
    if (!INSTAGRAM_ID) throw new Error("Instagram Business Account ID 설정이 누락되었습니다.");
    if (!INSTAGRAM_TOKEN) throw new Error("Instagram Access Token 설정이 누락되었습니다.");
    if (!imageUrls || imageUrls.length === 0) throw new Error("인스타그램 발행에는 사진이 필수입니다.");

    let finalCreationId = "";
    const truncatedContent = content.length > 2200 ? content.substring(0, 2197) + "..." : content;

    if (imageUrls.length > 1) {
        // --- Carousel ---
        const itemIds: string[] = [];
        for (let i = 0; i < imageUrls.length; i++) {
            const itemRes = await fetch(
                `https://graph.instagram.com/${IG_API_VERSION}/${INSTAGRAM_ID}/media`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        image_url: imageUrls[i],
                        is_carousel_item: true,
                        access_token: INSTAGRAM_TOKEN,
                    }),
                }
            );
            const itemData = await itemRes.json();
            if (itemData.error) throw new Error(`이미지 ${i + 1} 컨테이너 생성 실패: ${itemData.error.message}`);
            itemIds.push(itemData.id);
        }

        for (const itemId of itemIds) {
            await waitForContainerReady(itemId, INSTAGRAM_TOKEN, "instagram");
        }

        const carouselRes = await fetch(
            `https://graph.instagram.com/${IG_API_VERSION}/${INSTAGRAM_ID}/media`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    media_type: "CAROUSEL",
                    children: itemIds,
                    caption: truncatedContent,
                    access_token: INSTAGRAM_TOKEN,
                }),
            }
        );
        const carouselData = await carouselRes.json();
        if (carouselData.error) throw new Error(`캐러셀 컨테이너 생성 실패: ${carouselData.error.message}`);
        finalCreationId = carouselData.id;
    } else {
        // --- Single Image ---
        const containerRes = await fetch(
            `https://graph.instagram.com/${IG_API_VERSION}/${INSTAGRAM_ID}/media`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image_url: imageUrls[0],
                    caption: truncatedContent,
                    access_token: INSTAGRAM_TOKEN,
                }),
            }
        );
        const containerData = await containerRes.json();
        if (containerData.error) throw new Error(`컨테이너 생성 실패: ${containerData.error.message}`);
        finalCreationId = containerData.id;
    }

    await waitForContainerReady(finalCreationId, INSTAGRAM_TOKEN, "instagram");

    const publishRes = await fetch(
        `https://graph.instagram.com/${IG_API_VERSION}/${INSTAGRAM_ID}/media_publish`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                creation_id: finalCreationId,
                access_token: INSTAGRAM_TOKEN,
            }),
        }
    );

    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(`인스타그램 게시 실패: ${publishData.error.message}`);
    return publishData.id;
}

export async function publishToThreads(imageUrls: string[], content: string) {
    if (!THREADS_ID) throw new Error("Threads User ID 설정이 누락되었습니다.");
    if (!THREADS_TOKEN) throw new Error("Threads Access Token 설정이 누락되었습니다.");

    let finalCreationId = "";
    const imageUrl = imageUrls?.[0] || "";
    const truncatedContent = content.length > 500 ? content.substring(0, 497) + "..." : content;

    if (imageUrls && imageUrls.length > 1) {
        // --- Carousel ---
        const itemIds: string[] = [];
        for (let i = 0; i < imageUrls.length; i++) {
            const itemRes = await fetch(
                `https://graph.threads.net/${THREADS_API_VERSION}/${THREADS_ID}/threads`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        media_type: "IMAGE",
                        image_url: imageUrls[i],
                        is_carousel_item: true,
                        access_token: THREADS_TOKEN,
                    }),
                }
            );
            const itemData = await itemRes.json();
            if (itemData.error) throw new Error(`스레드 이미지 ${i + 1} 컨테이너 생성 실패: ${itemData.error.message}`);
            itemIds.push(itemData.id);
        }

        for (const itemId of itemIds) {
            await waitForContainerReady(itemId, THREADS_TOKEN, "threads");
        }

        const carouselRes = await fetch(
            `https://graph.threads.net/${THREADS_API_VERSION}/${THREADS_ID}/threads`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    media_type: "CAROUSEL",
                    children: itemIds,
                    text: truncatedContent,
                    access_token: THREADS_TOKEN,
                }),
            }
        );
        const carouselData = await carouselRes.json();
        if (carouselData.error) throw new Error(`스레드 캐러셀 생성 실패: ${carouselData.error.message}`);
        finalCreationId = carouselData.id;
    } else {
        // --- Single Image or Text-Only ---
        const mediaType = imageUrl ? "IMAGE" : "TEXT";
        const containerRes = await fetch(
            `https://graph.threads.net/${THREADS_API_VERSION}/${THREADS_ID}/threads`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    media_type: mediaType,
                    ...(imageUrl ? { image_url: imageUrl } : {}),
                    text: truncatedContent,
                    access_token: THREADS_TOKEN,
                }),
            }
        );
        const containerData = await containerRes.json();
        if (containerData.error) throw new Error(`스레드 컨테이너 생성 실패: ${containerData.error.message}`);
        finalCreationId = containerData.id;
    }

    await waitForContainerReady(finalCreationId, THREADS_TOKEN, "threads");

    const publishRes = await fetch(
        `https://graph.threads.net/${THREADS_API_VERSION}/${THREADS_ID}/threads_publish`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                creation_id: finalCreationId,
                access_token: THREADS_TOKEN,
            }),
        }
    );

    const publishData = await publishRes.json();
    if (publishData.error) throw new Error(`스레드 게시 실패: ${publishData.error.message}`);
    return publishData.id;
}
