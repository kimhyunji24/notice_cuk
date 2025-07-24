// const express = require('express');
// const cors = require('cors');
// const app = express();
// const PORT = 3000;
// const db = require('./database.js'); // 데이터베이스 연결 가져오기

// const corsOptions = {
//   origin: 'http://127.0.0.1:5502',
//   optionsSuccessStatus: 200
// };

// app.use(cors(corsOptions));
// app.use(express.json());

// // server.js 파일

// app.post('/api/subscribe', (req, res) => {
//     console.log('서버가 받은 데이터:', req.body);

//     // 프론트엔드로부터 받은 데이터를 변수에 저장
//     let { selectedSites, method, noticeTypes } = req.body;
//     const userId = 'test_user_01';

//     // --- 리팩토링 핵심 로직 ---
//     // 1. 만약 선택한 학과가 없다면, '모든 학과'를 의미하는 기본값을 설정
//     if (!selectedSites || selectedSites.length === 0) {
//         // 'catholic_notice'는 우리가 이전에 정한 '가톨릭대학교 전체 공지사항'을 의미하는 값입니다.
//         // 이 부분은 나중에 전체 공지사항을 크롤링할 때 사용할 수 있습니다.
//         // 지금은 임시로 하나의 대표값만 넣습니다.
//         selectedSites = ['catholic_notice']; 
//         console.log('선택된 학과가 없어 기본값으로 설정:', selectedSites);
//     }

//     // 2. 만약 선택한 알림 종류가 없다면, '모든 종류'를 의미하는 기본값을 설정
//     if (!noticeTypes || noticeTypes.length === 0) {
//         noticeTypes = ['important', 'general'];
//         console.log('선택된 종류가 없어 기본값으로 설정:', noticeTypes);
//     }
//     // -------------------------


//     const stmt = db.prepare("INSERT INTO subscriptions (user_id, site_value, method, notice_type) VALUES (?, ?, ?, ?)");

//     // 모든 조합을 DB에 저장
//     selectedSites.forEach(site => {
//         noticeTypes.forEach(type => {
//             stmt.run(userId, site, method, type, (err) => {
//                 if (err) {
//                     console.error('DB 저장 실패:', err.message);
//                 }
//             });
//         });
//     });

//     stmt.finalize();

//     res.json({ status: 'success', message: '구독 정보가 데이터베이스에 성공적으로 저장되었습니다!' });
// });

// app.listen(PORT, () => {
//     console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
// });


// ----------------------------------------------------------------
// 1. 필요한 라이브러리 가져오기
// ----------------------------------------------------------------
const express = require('express');
const cors = require('cors');

const axios = require('axios');
const cheerio = require('cheerio');
const db = require('./database.js');
require('dotenv').config();


// ----------------------------------------------------------------
// 2. Express 서버 설정
// ----------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 3000; // Render.com이 지정하는 포트를 사용하도록 설정

app.use(cors()); // 모든 출처의 요청을 허용 (호스팅 환경에 적합)
app.use(express.json());


// ----------------------------------------------------------------
// 3. API 엔드포인트: 구독 정보 받기
// ----------------------------------------------------------------
app.post('/api/subscribe', (req, res) => {
    console.log('서버가 받은 데이터:', req.body);

    let { playerId, selectedSites, noticeTypes } = req.body;

    // --- 유효성 검사 및 기본값 설정 ---
    if (!playerId) {
        return res.status(400).json({ status: 'error', message: 'Player ID가 없습니다.' });
    }
    if (!selectedSites || selectedSites.length === 0) {
        selectedSites = ['catholic_notice']; // 학과 선택이 없으면 '전체 공지'로 간주
    }
    if (!noticeTypes || noticeTypes.length === 0) {
        noticeTypes = ['important', 'general']; // 종류 선택이 없으면 '모두'로 간주
    }
    // ------------------------------------

    // 기존 구독 정보를 삭제하여 중복 방지
    db.run("DELETE FROM subscriptions WHERE user_id = ?", [playerId], (err) => {
        if (err) {
            console.error('기존 구독 정보 삭제 실패:', err.message);
            return res.status(500).json({ status: 'error', message: '서버 내부 오류가 발생했습니다.' });
        }

        // 새로운 구독 정보 저장
        const stmt = db.prepare("INSERT INTO subscriptions (user_id, site_value, method, notice_type) VALUES (?, ?, 'webpush', ?)");
        selectedSites.forEach(site => {
            noticeTypes.forEach(type => {
                stmt.run(playerId, site, type);
            });
        });
        stmt.finalize();
        res.json({ status: 'success', message: '구독 정보가 성공적으로 갱신되었습니다!' });
    });
});


// ----------------------------------------------------------------
// 4. 크롤러 로직
// ----------------------------------------------------------------
const siteUrlMap = {
    'dept_korean_language': 'https://korean.catholic.ac.kr/korean/community/notice.do', // 국어국문학과
    'dept_philosophy': 'https://philosophy.catholic.ac.kr/philosophy/community/notice.do', // 철학과
    'dept_korean_history': 'https://koreanhistory.catholic.ac.kr/koreanhistory/community/notice.do', // 국사학과
    'dept_english': 'https://english.catholic.ac.kr/english/community/notice.do', // 영어영문학부
    'dept_chinese': 'https://cn.catholic.ac.kr/cn/community/notice.do', // 중국언어문화학과
    'dept_japanese': 'https://japanese.catholic.ac.kr/japanese/major/notice.do', // 일어일본문화학과
    'dept_french': 'https://french.catholic.ac.kr/french/community/notice.do', // 프랑스어문화학과
    'dept_social_welfare': 'https://socialwelfare.catholic.ac.kr/socialwelfare/community/notice.do', // 사회복지학과
    'dept_psychology': 'https://psych.catholic.ac.kr/front/boardlist.do?bbsConfigFK=1043', // 심리학과
    'dept_sociology': 'https://sociology.catholic.ac.kr/sociology/community/notice.do', // 사회학과
    'dept_child_study': 'https://children.catholic.ac.kr/children/community/notice.do', // 아동학과
    'dept_special_education': 'https://sped.catholic.ac.kr/sped/community/notice.do', // 특수교육과
    'dept_business': 'https://business.catholic.ac.kr/business/community/notice.do', // 경영학과
    'dept_accounting': 'https://accounting.catholic.ac.kr/accounting/community/notice.do', // 회계학과
    'dept_international': 'https://is.catholic.ac.kr/is/community/notice.do', // 국제학부
    'dept_law': 'https://law.catholic.ac.kr/law/community/notice.do', // 법학과
    'dept_economics': 'https://economics.catholic.ac.kr/economics/community/notice.do', // 경제학과
    'dept_public_admin': 'https://pa.catholic.ac.kr/pa/community/notice.do', // 행정학과
    'dept_global_business': 'https://globalbiz.catholic.ac.kr/globalbiz/community/notice.do', // 글로벌경영학과
    'dept_korean_culture': 'https://klc.catholic.ac.kr/klc/community/notice.do', // 한국어문화학과 (외국인 전담학과)

    'dept_chemistry': 'https://chemistry.catholic.ac.kr/chemistry/community/notice.do', // 화학과
    'dept_mathematics': 'https://math.catholic.ac.kr/math/community/notice.do', // 수학과
    'dept_physics': 'https://physics.catholic.ac.kr/physics/community/notice.do', // 물리학과
    'dept_spatial_consumer': 'https://design.catholic.ac.kr/design/community/notice.do', // 공간디자인/소비자학과
    'dept_clothing': 'https://clothing.catholic.ac.kr/clothing/community/notice.do', // 의류학과
    'dept_food_nutrition': 'https://fn.catholic.ac.kr/fn/community/notice.do', // 식품영양학과
    'dept_media_tech': 'https://mtc.catholic.ac.kr/mtc/community/notice.do', // 미디어기술콘텐츠학과
    'dept_computer_info': 'https://csie.catholic.ac.kr/csie/community/notice.do', // 컴퓨터정보공학부
    'dept_info_communication': 'https://ice.catholic.ac.kr/ice/community/notice.do', // 정보통신전자공학부
    'dept_biotech': 'https://biotech.catholic.ac.kr/biotech/community/notice.do', // 생명공학과
    'dept_energy_environment': 'https://envi.catholic.ac.kr/envi/community/notice.do', // 에너지환경공학과
    'dept_biomedical_chem': 'https://bmce.catholic.ac.kr/bmce/community/notice.do', // 바이오메디컬화학공학과
    'dept_ai': 'https://ai.catholic.ac.kr/ai/community/notice.do', // 인공지능학과
    'dept_data_science': 'https://datascience.catholic.ac.kr/datascience/community/notice.do', // 데이터사이언스학과
    'dept_biomedical_sw': 'https://bmsw.catholic.ac.kr/bmsw/community/notice.do', // 바이오메디컬소프트웨어학과
    'dept_biomedical_life': 'https://mbs.catholic.ac.kr/mbs/community/notice.do', // 의생명과학과

    'dept_music': 'https://music.catholic.ac.kr/music/community/notice.do', // 음악과
    'dept_vocal_foreign': 'https://voice.catholic.ac.kr/voice/community/notice.do', // 성악과(외국인 전담학과)
    // 'dept_art_media': '', // 예술미디어융합학과

    'dept_liberal_arts': 'https://liberal.catholic.ac.kr/liberal/community/notice.do', // 자유전공학부

    'dept_general_college': 'https://catholic-college.catholic.ac.kr/catholic_college/notification/notice.do', // 학부대학
    'dept_convergence': 'https://major-convergence.catholic.ac.kr/major_convergence/notice/notice.do', // 융합전공학부

    'dept_teacher': 'https://teaching.catholic.ac.kr/teaching/community/notice.do', // 교직과
    'dept_gbs': 'https://gbs.catholic.ac.kr/gbs/community/notice.do', // 글로벌 경영대학

    'dept_pharmacy': 'https://pharmacy.catholic.ac.kr/pharmacy/community/notice.do', // 약학과

    'catholic_notice': 'https://www.catholic.ac.kr/ko/campuslife/notice.do'
};

let lastKnownPosts = {};

async function checkSite(siteId, url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const latestPostElement = $('a.b-title').first();
        if (latestPostElement.length === 0) return;

        const numberElement = latestPostElement.closest('tr').find('.td-num');
        const title = latestPostElement.text().trim();
        const articleNo = latestPostElement.attr('data-article-no');
        const postNumberText = numberElement.text().trim();
        const noticeType = isNaN(postNumberText) ? 'important' : 'general';

        if (lastKnownPosts[siteId] && lastKnownPosts[siteId] !== articleNo) {
            console.log(`🎉 [${siteId}] 새로운 게시물을 발견했습니다! (${noticeType})`);
            
            if (siteId !== 'catholic_notice' && noticeType === 'important') {
                console.log(`-> [${siteId}] 학과 중요 공지이므로 알림을 보내지 않습니다.`);
                lastKnownPosts[siteId] = articleNo;
                return;
            }

            const newPost = {
                no: articleNo,
                title: title,
                link: new URL(latestPostElement.attr('href'), url).href,
                type: noticeType,
                siteId: siteId
            };
            sendNotifications(newPost);
        }
        lastKnownPosts[siteId] = articleNo;
    } catch (error) {
        console.error(`[${siteId}] 크롤링 중 에러 발생:`, error.message.substring(0, 100));
    }
}function sendNotifications(postInfo) {
    const sql = `SELECT user_id FROM subscriptions WHERE site_value = ? AND notice_type = ?`;
    db.all(sql, [postInfo.siteId, postInfo.type], (err, rows) => {
        if (err) {
            console.error('DB 에러:', err.message);
            return;
        }
        if (rows.length === 0) {
            // 해당 공지를 수신할 구독자가 없으므로 조용히 종료
            return;
        }

        const playerIds = rows.map(row => row.user_id); // 알림 보낼 사용자들의 playerId 목록
        console.log(`[${postInfo.title}] 관련 구독자 ${playerIds.length}명에게 알림 발송을 시도합니다.`);

        // --- OneSignal API 호출 시작 ---
        axios.post('https://onesignal.com/api/v1/notifications', {
            // 1. 어떤 앱에서 보내는 알림인지 명시
            app_id: process.env.ONESIGNAL_APP_ID,

            // 2. 누구에게 보낼지 명시 (DB에서 가져온 playerId 목록)
            include_player_ids: playerIds,

            // 3. 알림 내용 구성
            headings: { "en": `[${postInfo.siteId}] 새 글 알림` }, // 알림 제목
            contents: { "en": postInfo.title }, // 알림 내용

            // 4. 알림 클릭 시 이동할 페이지 주소
            url: postInfo.link
        }, {
            // 5. 인증 정보 (권한)
            headers: {
                'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}` // process.env로 키 불러오기
            }
        }).then(response => {
            console.log("✅ OneSignal API 발송 성공");
        }).catch(error => {
            console.error("❌ OneSignal API 발송 실패:", error.response ? error.response.data : error.message);
        });
        // --- OneSignal API 호출 끝 ---
    });
}

function runAllChecks() {
    console.log('모든 사이트의 새 글 확인을 시작합니다...');
    for (const siteId in siteUrlMap) {
        checkSite(siteId, siteUrlMap[siteId]);
    }
}


// ----------------------------------------------------------------
// 5. 서버 실행 및 크롤러 시작
// ----------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`✅ 서버가 내부 포트 ${PORT}에서 대기 중입니다.`);
    console.log(`🚀 공개 주소: https://gadaealrim.onrender.com`);
    
    runAllChecks();
    setInterval(runAllChecks, 600000); // 10분마다 실행
});
