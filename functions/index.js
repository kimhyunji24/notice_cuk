const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

// Firebase Admin SDK 초기화
admin.initializeApp();
const db = admin.firestore();

// --- 1. API 서버 (HTTP 함수) ---
const app = express();
app.use(cors({ origin: true })); // 모든 요청을 허용하도록 설정

// '/status' 경로: 최신 글 상태를 보여주는 API
app.get("/status", async (req, res) => {
    try {
        const snapshot = await db.collection("crawler_state").get();
        const lastPosts = {};
        snapshot.forEach(doc => {
            lastPosts[doc.id] = doc.data();
        });
        res.json(lastPosts);
    } catch (error) {
        console.error("상태 데이터 조회 실패:", error);
        res.status(500).send("상태 데이터를 불러오는 데 실패했습니다.");
    }
});

// '/subscribe' 경로: 구독 정보를 받는 API
app.post("/subscribe", async (req, res) => {
    let { playerId, selectedSites, noticeTypes } = req.body;

    if (!playerId) {
        return res.status(400).json({ message: "Player ID가 없습니다." });
    }
    if (!selectedSites || selectedSites.length === 0) {
        selectedSites = ["catholic_notice"];
    }
    if (!noticeTypes || noticeTypes.length === 0) {
        noticeTypes = ["important", "general"];
    }

    try {
        const userSubscriptionsRef = db.collection("subscriptions").doc(playerId);
        // Firestore에 사용자 구독 정보 저장 (기존 정보 덮어쓰기)
        await userSubscriptionsRef.set({
            sites: selectedSites,
            types: noticeTypes,
            method: "webpush",
        });
        res.json({ status: "success", message: "구독 정보가 갱신되었습니다!" });
    } catch (error) {
        console.error("DB 저장 실패:", error);
        res.status(500).json({ message: "서버 오류가 발생했습니다." });
    }
});

// Express 앱을 Cloud Function으로 내보내기
// 이 함수는 'api'라는 이름으로 배포됩니다.
exports.api = functions.region("asia-northeast3").https.onRequest(app);


// --- 2. 크롤러 (스케줄링 함수) ---
const siteUrlMap = {
    // 여기에 이전에 사용하던 URL 주소록을 그대로 붙여넣으세요.
    'dept_korean_language': 'https://korean.catholic.ac.kr/korean/community/notice.do',
    'dept_philosophy': 'https://philosophy.catholic.ac.kr/philosophy/community/notice.do',
    // ... 나머지 모든 학과 주소 ...
    'catholic_notice': 'https://www.catholic.ac.kr/ko/campuslife/notice.do'
};

// 10분마다 실행되도록 스케줄링
exports.crawler = functions.region("asia-northeast3")
    .pubsub.schedule("every 10 minutes")
    .onRun(async (context) => {
        console.log("모든 사이트의 새 글 확인을 시작합니다...");
        for (const siteId in siteUrlMap) {
            await checkSite(siteId, siteUrlMap[siteId]);
        }
        return null;
    });

async function checkSite(siteId, url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const latestPostElement = $("a.b-title").first();
        if (latestPostElement.length === 0) return;

        const articleNo = latestPostElement.attr("data-article-no");
        const title = latestPostElement.text().trim();
        const postNumberText = latestPostElement.closest("tr").find(".td-num").text().trim();
        const noticeType = isNaN(postNumberText) ? "important" : "general";

        const stateRef = db.collection("crawler_state").doc(siteId);
        const doc = await stateRef.get();
        const lastKnownNo = doc.exists ? doc.data().no : null;

        if (lastKnownNo && lastKnownNo !== articleNo) {
            console.log(`🎉 [${siteId}] 새로운 게시물을 발견했습니다! (${noticeType})`);
            
            if (siteId !== "catholic_notice" && noticeType === "important") {
                console.log(`-> [${siteId}] 학과 중요 공지이므로 알림을 보내지 않습니다.`);
                await stateRef.set({ no: articleNo, title: title });
                return;
            }

            const newPost = {
                no: articleNo,
                title: title,
                link: new URL(latestPostElement.attr("href"), url).href,
                type: noticeType,
                siteId: siteId
            };
            await sendNotifications(newPost);
        }
        await stateRef.set({ no: articleNo, title: title });
    } catch (error) {
        console.error(`[${siteId}] 크롤링 중 에러 발생:`, error.message);
    }
}
async function sendNotifications(postInfo) {
    const snapshot = await db.collection("subscriptions")
        .where("sites", "array-contains", postInfo.siteId)
        .where("types", "array-contains", postInfo.type).get();
    
    if (snapshot.empty) return;

    const playerIds = snapshot.docs.map((doc) => doc.id);

    // --- OneSignal API 호출 (process.env 사용) ---
    try {
        await axios.post('https://onesignal.com/api/v1/notifications', {
            // process.env를 사용해 키를 불러옵니다.
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: playerIds,
            headings: { "en": `[${postInfo.siteId}] 새 글 알림` },
            contents: { "en": postInfo.title },
            url: postInfo.link
        }, {
            headers: {
                'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}`
            }
        });
        console.log(`✅ [${postInfo.title}] 관련 알림 ${playerIds.length}건 발송 성공`);
    } catch (error) {
        console.error("❌ OneSignal API 발송 실패:", error.response ? error.response.data : error.message);
    }
}