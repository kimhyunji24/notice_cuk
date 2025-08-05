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

// 환경 변수 검증
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.error('❌ 필수 환경 변수가 설정되지 않았습니다: ONESIGNAL_APP_ID, ONESIGNAL_API_KEY');
}

// --- 1. API 서버 (HTTP 함수) ---
const app = express();

// CORS 설정 - 보안 강화
app.use(cors({ 
    origin: [
        'https://cuk-alarm.web.app',
        'https://cuk-alarm.firebaseapp.com',
        'http://localhost:1230' // 개발용
    ],
    credentials: true
}));

app.use(express.json({ limit: '1mb' })); // JSON 요청 본문 크기 제한

// 미들웨어: 요청 로깅
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// 미들웨어: 에러 핸들러
app.use((error, req, res, next) => {
    console.error('Express 에러:', error);
    res.status(500).json({ 
        error: '서버 내부 오류가 발생했습니다.',
        message: error.message 
    });
});

/**
 * 입력 데이터 유효성 검사
 * @param {Object} data - 검사할 데이터
 * @returns {Object} 검사 결과
 */
function validateSubscriptionData(data) {
    const errors = [];

    if (!data.playerId || typeof data.playerId !== 'string') {
        errors.push('유효한 Player ID가 필요합니다.');
    }

    if (!data.selectedSites || !Array.isArray(data.selectedSites)) {
        errors.push('선택된 사이트 목록이 필요합니다.');
    }

    if (!data.noticeTypes || !Array.isArray(data.noticeTypes)) {
        errors.push('알림 타입 목록이 필요합니다.');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// '/status' 경로: 최신 글 상태를 보여주는 API
app.get("/status", async (req, res) => {
    try {
        const snapshot = await db.collection("crawler_state").get();
        const lastPosts = {};
        
        snapshot.forEach(doc => {
            lastPosts[doc.id] = doc.data();
        });
        
        res.json({
            success: true,
            data: lastPosts,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("상태 데이터 조회 실패:", error);
        res.status(500).json({ 
            success: false,
            error: "상태 데이터를 불러오는 데 실패했습니다.",
            message: error.message 
        });
    }
});

// '/subscribe' 경로: 구독 정보를 받는 API
app.post("/subscribe", async (req, res) => {
    try {
        const { playerId, selectedSites, noticeTypes } = req.body;

        // 입력 데이터 검증
        const validation = validateSubscriptionData(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ 
                success: false,
                error: "잘못된 입력 데이터입니다.",
                details: validation.errors 
            });
        }

        // 기본값 설정
        const sites = selectedSites.length > 0 ? selectedSites : ["catholic_notice"];
        const types = noticeTypes.length > 0 ? noticeTypes : ["important", "general"];

        // Firestore에 구독 정보 저장
        const userSubscriptionsRef = db.collection("subscriptions").doc(playerId);
        await userSubscriptionsRef.set({
            sites: sites,
            types: types,
            method: "webpush",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ 
            success: true,
            message: "구독 정보가 성공적으로 갱신되었습니다!",
            data: {
                playerId,
                sites,
                types
            }
        });
    } catch (error) {
        console.error("구독 정보 저장 실패:", error);
        res.status(500).json({ 
            success: false,
            error: "서버 오류가 발생했습니다.",
            message: error.message 
        });
    }
});

// '/crawl' 경로: 수동 크롤링 실행 API
app.post("/crawl", async (req, res) => {
    try {
        console.log("🚀 수동 크롤링을 시작합니다...");
        
        const results = {
            total: Object.keys(siteUrlMap).length,
            success: 0,
            failed: 0,
            newPosts: 0,
            details: []
        };

        // 사이트 목록을 배열로 변환
        const siteIds = Object.keys(siteUrlMap);
        
        // 배치 단위로 처리 (한 번에 10개씩)
        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < siteIds.length; i += batchSize) {
            batches.push(siteIds.slice(i, i + batchSize));
        }

        console.log(`총 ${batches.length}개 배치로 나누어 처리합니다.`);

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`배치 ${batchIndex + 1}/${batches.length} 처리 중... (${batch.length}개 사이트)`);
            
            // 배치 내에서 순차적으로 처리
            for (const siteId of batch) {
                try {
                    console.log(`[${siteId}] 크롤링 시작...`);
                    const result = await checkSite(siteId, siteUrlMap[siteId]);
                    
                    results.details.push({
                        siteId,
                        success: result.success,
                        hasNewPost: result.hasNewPost,
                        error: result.error
                    });

                    if (result.success) {
                        results.success++;
                        if (result.hasNewPost) {
                            results.newPosts++;
                        }
                    } else {
                        results.failed++;
                    }

                    // 서버 부하 방지를 위해 잠시 대기 (500ms)
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                } catch (error) {
                    console.error(`[${siteId}] 크롤링 중 예상치 못한 에러:`, error);
                    results.failed++;
                    results.details.push({
                        siteId,
                        success: false,
                        hasNewPost: false,
                        error: error.message
                    });
                }
            }

            // 배치 간 대기 (1초)
            if (batchIndex < batches.length - 1) {
                console.log(`배치 ${batchIndex + 1} 완료. 다음 배치 대기 중...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`✅ 크롤링 완료: 성공 ${results.success}/${results.total}, 새 글 ${results.newPosts}개`);

        res.json({
            success: true,
            message: "크롤링이 완료되었습니다!",
            data: results
        });

    } catch (error) {
        console.error("크롤링 실행 중 에러:", error);
        res.status(500).json({
            success: false,
            error: "크롤링 실행 중 오류가 발생했습니다.",
            message: error.message
        });
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
    console.log("🚀 모든 사이트의 새 글 확인을 시작합니다...");
    
    const results = {
        total: Object.keys(siteUrlMap).length,
        success: 0,
        failed: 0,
        newPosts: 0
    };

    for (const siteId in siteUrlMap) {
        try {
            const result = await checkSite(siteId, siteUrlMap[siteId]);
            if (result.success) {
                results.success++;
                if (result.hasNewPost) {
                    results.newPosts++;
                }
            } else {
                results.failed++;
            }
        } catch (error) {
            console.error(`[${siteId}] 크롤링 중 예상치 못한 에러:`, error);
            results.failed++;
        }
    }

    console.log(`✅ 크롤링 완료: 성공 ${results.success}/${results.total}, 새 글 ${results.newPosts}개`);
    return null;
});

/**
 * 특정 사이트를 체크하여 새로운 게시물이 있는지 확인
 * @param {string} siteId - 사이트 ID
 * @param {string} url - 사이트 URL
 * @returns {Object} 체크 결과
 */
async function checkSite(siteId, url) {
    try {
        const response = await axios.get(url, {
            timeout: 10000, // 10초 타임아웃
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CUK-Notice-Crawler/1.0)'
            }
        });

        const $ = cheerio.load(response.data);
        const latestPostElement = $("a.b-title").first();
        
        if (latestPostElement.length === 0) {
            console.log(`[${siteId}] 게시물을 찾을 수 없습니다.`);
            return { success: false, hasNewPost: false };
        }

        const articleNo = latestPostElement.attr("data-article-no");
        const title = latestPostElement.text().trim();
        const postNumberText = latestPostElement.closest("tr").find(".td-num").text().trim();
        const noticeType = isNaN(postNumberText) ? "important" : "general";

        // Firestore에서 마지막으로 확인된 게시물 정보 가져오기
        const stateRef = db.collection("crawler_state").doc(siteId);
        const doc = await stateRef.get();
        const lastKnownNo = doc.exists ? doc.data().no : null;

        if (lastKnownNo && lastKnownNo !== articleNo) {
            console.log(`🎉 [${siteId}] 새로운 게시물을 발견했습니다! (${noticeType})`);
            
            // 학과 중요 공지는 알림에서 제외
            if (siteId !== "catholic_notice" && noticeType === "important") {
                console.log(`-> [${siteId}] 학과 중요 공지이므로 알림을 보내지 않습니다.`);
                await stateRef.set({ 
                    no: articleNo, 
                    title: title,
                    updatedAt: new Date().toISOString()
                });
                return { success: true, hasNewPost: false };
            }

            const newPost = {
                no: articleNo,
                title: title,
                link: new URL(latestPostElement.attr("href"), url).href,
                type: noticeType,
                siteId: siteId,
                createdAt: new Date().toISOString()
            };

            await sendNotifications(newPost);
            await stateRef.set({ 
                no: articleNo, 
                title: title,
                updatedAt: new Date().toISOString()
            });

            return { success: true, hasNewPost: true };
        }

        // 상태 업데이트
        await stateRef.set({ 
            no: articleNo, 
            title: title,
            updatedAt: new Date().toISOString()
        });

        return { success: true, hasNewPost: false };

    } catch (error) {
        console.error(`[${siteId}] 크롤링 중 에러 발생:`, error.message);
        return { success: false, hasNewPost: false, error: error.message };
    }
}

/**
 * 새로운 게시물에 대한 알림을 발송
 * @param {Object} postInfo - 게시물 정보
 */
async function sendNotifications(postInfo) {
    try {
        // 환경 변수 검증
        if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
            console.error('❌ OneSignal 환경 변수가 설정되지 않았습니다.');
            return;
        }

        // 구독자 조회
        const snapshot = await db.collection("subscriptions")
            .where("sites", "array-contains", postInfo.siteId)
            .where("types", "array-contains", postInfo.type)
            .get();
        
        if (snapshot.empty) {
            console.log(`[${postInfo.siteId}] 해당 조건의 구독자가 없습니다.`);
            return;
        }

        const playerIds = snapshot.docs.map((doc) => doc.id);

        // OneSignal API 호출
        const response = await axios.post('https://onesignal.com/api/v1/notifications', {
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: playerIds,
            headings: { "en": `[${postInfo.siteId}] 새 글 알림` },
            contents: { "en": postInfo.title },
            url: postInfo.link,
            priority: 10
        }, {
            headers: {
                'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000 // 15초 타임아웃
        });

        console.log(`✅ [${postInfo.title}] 관련 알림 ${playerIds.length}건 발송 성공`);
        
        // 알림 발송 로그 저장
        await db.collection("notification_logs").add({
            postInfo: postInfo,
            playerIds: playerIds,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            success: true
        });

    } catch (error) {
        console.error("❌ OneSignal API 발송 실패:", error.response ? error.response.data : error.message);
        
        // 실패 로그 저장
        await db.collection("notification_logs").add({
            postInfo: postInfo,
            error: error.message,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            success: false
        });
    }
}