// functions/index.js

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
// functions/index.js

const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");

setGlobalOptions({ region: "asia-northeast3" });
admin.initializeApp();
const db = admin.firestore();

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

const app = express();
app.use(cors({ origin: "https://cuk-alarm.web.app" }));
app.use(express.json());

app.get("/status", async (req, res) => {
    try {
        const snapshot = await db.collection("crawler_state").get();
        const lastPosts = {};
        snapshot.forEach(doc => { lastPosts[doc.id] = doc.data(); });
        // 프론트엔드에서 기대하는 형식으로 응답을 감싸줍니다.
        res.status(200).json({
            success: true,
            data: lastPosts,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // 에러 응답 형식도 통일합니다.
        res.status(500).json({
            success: false,
            error: "상태 데이터를 불러오는 데 실패했습니다."
        });
    }
});
app.post("/subscribe", async (req, res) => {
    console.log('[functions/index.js] /subscribe 요청 수신:', req.body);
    let { playerId, selectedSites, noticeTypes } = req.body;

    if (!playerId) {
        console.error('[functions/index.js] 오류: Player ID 없음');
        return res.status(400).json({ error: "Player ID가 없습니다." });
    }

    if (!selectedSites || selectedSites.length === 0) {
        console.log('[functions/index.js] 선택된 사이트가 없어 기본값("catholic_notice")으로 설정합니다.');
        selectedSites = ["catholic_notice"];
    }
    if (!noticeTypes || noticeTypes.length === 0) {
        console.log('[functions/index.js] 선택된 알림 종류가 없어 기본값("important", "general")으로 설정합니다.');
        noticeTypes = ["important", "general"];
    }

    try {
        console.log(`[functions/index.js] Firestore에 구독 정보 저장 시작 (Player ID: ${playerId})`);
        await db.collection("subscriptions").doc(playerId).set({
            sites: selectedSites,
            types: noticeTypes,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[functions/index.js] Firestore 저장 성공 (Player ID: ${playerId})`);
        res.status(200).json({ message: "구독 정보가 성공적으로 갱신되었습니다!" });
    } catch (error) {
        console.error(`[functions/index.js] Firestore 저장 실패 (Player ID: ${playerId}):`, error);
        res.status(500).json({ error: "서버 오류가 발생했습니다." });
    }
});

// 수동 크롤링 실행을 위한 주소 추가
app.post("/crawl", async (req, res) => {
    console.log("🚀 수동 크롤링 요청을 받았습니다.");
    try {
        await runAllChecks();
        res.status(200).send("✅ 크롤링이 성공적으로 완료되었습니다.");
    } catch (error) {
        res.status(500).send("❌ 크롤링 중 오류가 발생했습니다.");
    }
});

exports.api = onRequest(app);

// --- 크롤러 로직 ---
exports.crawler = onSchedule("every 10 minutes", async (event) => {
    await runAllChecks();
    return null;
});

async function runAllChecks() {
    console.log("🚀 모든 사이트의 새 글 확인을 시작합니다...");
    const promises = Object.keys(siteUrlMap).map(id => checkSite(id, siteUrlMap[id]));
    await Promise.all(promises);
    console.log("✅ 모든 사이트 확인 완료.");
}
async function checkSite(siteId, url) {
    console.log(`[functions/index.js] [${siteId}] 크롤링 시작: ${url}`);
    try {
        const { data } = await axios.get(url, { timeout: 15000 });
        const $ = cheerio.load(data);
        const latestPostElement = $("a.b-title").first();
        
        if (latestPostElement.length === 0) {
            console.warn(`[functions/index.js] [${siteId}] 최신 게시물을 찾을 수 없습니다.`);
            return;
        }

        const articleNo = latestPostElement.attr("data-article-no");
        const title = latestPostElement.text().trim();
        const postNumberText = latestPostElement.closest("tr").find(".td-num").text().trim();
        const noticeType = isNaN(postNumberText) ? "important" : "general";
        
        console.log(`[functions/index.js] [${siteId}] 최신 글 정보: No.${articleNo}, 제목: ${title}, 타입: ${noticeType}`);

        const stateRef = db.collection("crawler_state").doc(siteId);
        const doc = await stateRef.get();
        const lastKnownNo = doc.exists ? doc.data().no : null;

        console.log(`[functions/index.js] [${siteId}] 이전 게시물 번호: ${lastKnownNo}, 현재 게시물 번호: ${articleNo}`);

        if (lastKnownNo && lastKnownNo !== articleNo) {
            console.log(`🎉 [${siteId}] 새로운 게시물 발견: ${title}`);
            if (siteId !== "catholic_notice" && noticeType === "important") {
                console.log(`-> 학과 중요 공지이므로 알림을 보내지 않습니다.`);
            } else {
                const newPost = { no: articleNo, title, link: new URL(latestPostElement.attr("href"), url).href, type: noticeType, siteId };
                await sendNotifications(newPost);
            }
        }
        await stateRef.set({ no: articleNo, title: title, updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error(`[functions/index.js] [${siteId}] 크롤링 실패:`, error.message);
    }
}

async function sendNotifications(postInfo) {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) return;
    const snapshot = await db.collection("subscriptions").where("sites", "array-contains", postInfo.siteId).where("types", "array-contains", postInfo.type).get();
    if (snapshot.empty) return;
    const playerIds = snapshot.docs.map(doc => doc.id);
    try {
        await axios.post('https://onesignal.com/api/v1/notifications', {
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: playerIds,
            headings: { "en": `[${postInfo.siteId}] 새 글 알림` },
            contents: { "en": postInfo.title },
            url: postInfo.link
        }, { headers: { 'Authorization': `Basic ${ONESIGNAL_API_KEY}` } });
        console.log(`✅ [${postInfo.title}] 알림 ${playerIds.length}건 발송 성공`);
    } catch (error) {
        console.error("❌ OneSignal API 발송 실패:", error.response?.data || error.message);
    }
}