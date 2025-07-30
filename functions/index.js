// functions/index.js

// Firebase Functions v2(버전2)에서 필요한 함수들을 가져옵니다.
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");

const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

// 모든 함수에 적용할 기본 설정을 지정합니다. (지역: 서울)
setGlobalOptions({ region: "asia-northeast3" });

// Firebase Admin SDK 초기화
admin.initializeApp();
const db = admin.firestore();

// --- 1. API 서버 (HTTP 함수) ---
const app = express();
app.use(cors({ origin: true })); // 모든 요청을 허용하도록 설정
app.use(express.json()); // JSON 요청 본문을 파싱하기 위해 추가

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

// Express 앱을 onRequest 함수를 사용해 내보냅니다.
exports.api = onRequest(app);


// --- 2. 크롤러 (스케줄링 함수) ---
const siteUrlMap = {
    'dept_korean_language': 'https://korean.catholic.ac.kr/korean/community/notice.do',
    'dept_philosophy': 'https://philosophy.catholic.ac.kr/philosophy/community/notice.do',
    'dept_korean_history': 'https://koreanhistory.catholic.ac.kr/koreanhistory/community/notice.do',
    'dept_english': 'https://english.catholic.ac.kr/english/community/notice.do',
    'dept_chinese': 'https://cn.catholic.ac.kr/cn/community/notice.do',
    'dept_japanese': 'https://japanese.catholic.ac.kr/japanese/major/notice.do',
    'dept_french': 'https://french.catholic.ac.kr/french/community/notice.do',
    'dept_social_welfare': 'https://socialwelfare.catholic.ac.kr/socialwelfare/community/notice.do',
    'dept_psychology': 'https://psych.catholic.ac.kr/psychology/community/notice.do',
    'dept_sociology': 'https://sociology.catholic.ac.kr/sociology/community/notice.do',
    'dept_child_study': 'https://children.catholic.ac.kr/children/community/notice.do',
    'dept_special_education': 'https://sped.catholic.ac.kr/sped/community/notice.do',
    'dept_business': 'https://business.catholic.ac.kr/business/community/notice.do',
    'dept_accounting': 'https://accounting.catholic.ac.kr/accounting/community/notice.do',
    'dept_international': 'https://is.catholic.ac.kr/is/community/notice.do',
    'dept_law': 'https://law.catholic.ac.kr/law/community/notice.do',
    'dept_economics': 'https://economics.catholic.ac.kr/economics/community/notice.do',
    'dept_public_admin': 'https://pa.catholic.ac.kr/pa/community/notice.do',
    'dept_global_business': 'https://globalbiz.catholic.ac.kr/globalbiz/community/notice.do',
    'dept_korean_culture': 'https://klc.catholic.ac.kr/klc/community/notice.do',
    'dept_chemistry': 'https://chemistry.catholic.ac.kr/chemistry/community/notice.do',
    'dept_mathematics': 'https://math.catholic.ac.kr/math/community/notice.do',
    'dept_physics': 'https://physics.catholic.ac.kr/physics/community/notice.do',
    'dept_spatial_consumer': 'https://design.catholic.ac.kr/design/community/notice.do',
    'dept_clothing': 'https://clothing.catholic.ac.kr/clothing/community/notice.do',
    'dept_food_nutrition': 'https://fn.catholic.ac.kr/fn/community/notice.do',
    'dept_media_tech': 'https://mtc.catholic.ac.kr/mtc/community/notice.do',
    'dept_computer_info': 'https://csie.catholic.ac.kr/csie/community/notice.do',
    'dept_info_communication': 'https://ice.catholic.ac.kr/ice/community/notice.do',
    'dept_biotech': 'https://biotech.catholic.ac.kr/biotech/community/notice.do',
    'dept_energy_environment': 'https://envi.catholic.ac.kr/envi/community/notice.do',
    'dept_biomedical_chem': 'https://bmce.catholic.ac.kr/bmce/community/notice.do',
    'dept_ai': 'https://ai.catholic.ac.kr/ai/community/notice.do',
    'dept_data_science': 'https://datascience.catholic.ac.kr/datascience/community/notice.do',
    'dept_biomedical_sw': 'https://bmsw.catholic.ac.kr/bmsw/community/notice.do',
    'dept_biomedical_life': 'https://mbs.catholic.ac.kr/mbs/community/notice.do',
    'dept_music': 'https://music.catholic.ac.kr/music/community/notice.do',
    'dept_vocal_foreign': 'https://voice.catholic.ac.kr/voice/community/notice.do',
    'dept_liberal_arts': 'https://liberal.catholic.ac.kr/liberal/community/notice.do',
    'dept_general_college': 'https://catholic-college.catholic.ac.kr/catholic_college/notification/notice.do',
    'dept_convergence': 'https://major-convergence.catholic.ac.kr/major_convergence/notice/notice.do',
    'dept_teacher': 'https://teaching.catholic.ac.kr/teaching/community/notice.do',
    'dept_gbs': 'https://gbs.catholic.ac.kr/gbs/community/notice.do',
    'dept_pharmacy': 'https://pharmacy.catholic.ac.kr/pharmacy/community/notice.do',
    'catholic_notice': 'https://www.catholic.ac.kr/ko/campuslife/notice.do'
};

exports.crawler = onSchedule("every 10 minutes", async (event) => {
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

    try {
        await axios.post('https://onesignal.com/api/v1/notifications', {
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