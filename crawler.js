// const axios = require('axios');
// const cheerio = require('cheerio');
// const db = require('./database.js');

// // 1. 주소록 (URL Map) 만들기
// // '별명'을 key로, 실제 '홈페이지 주소'를 value로 저장합니다.c
// const siteUrlMap = {
//     'dept_korean_language': 'https://korean.catholic.ac.kr/korean/community/notice.do', // 국어국문학과
//     'dept_philosophy': 'https://philosophy.catholic.ac.kr/philosophy/community/notice.do', // 철학과
//     'dept_korean_history': 'https://koreanhistory.catholic.ac.kr/koreanhistory/community/notice.do', // 국사학과
//     'dept_english': 'https://english.catholic.ac.kr/english/community/notice.do', // 영어영문학부
//     'dept_chinese': 'https://cn.catholic.ac.kr/cn/community/notice.do', // 중국언어문화학과
//     'dept_japanese': 'https://japanese.catholic.ac.kr/japanese/major/notice.do', // 일어일본문화학과
//     'dept_french': 'https://french.catholic.ac.kr/french/community/notice.do', // 프랑스어문화학과
//     'dept_social_welfare': 'https://socialwelfare.catholic.ac.kr/socialwelfare/community/notice.do', // 사회복지학과
//     'dept_psychology': 'https://psych.catholic.ac.kr/front/boardlist.do?bbsConfigFK=1043', // 심리학과
//     'dept_sociology': 'https://sociology.catholic.ac.kr/sociology/community/notice.do', // 사회학과
//     'dept_child_study': 'https://children.catholic.ac.kr/children/community/notice.do', // 아동학과
//     'dept_special_education': 'https://sped.catholic.ac.kr/sped/community/notice.do', // 특수교육과
//     'dept_business': 'https://business.catholic.ac.kr/business/community/notice.do', // 경영학과
//     'dept_accounting': 'https://accounting.catholic.ac.kr/accounting/community/notice.do', // 회계학과
//     'dept_international': 'https://is.catholic.ac.kr/is/community/notice.do', // 국제학부
//     'dept_law': 'https://law.catholic.ac.kr/law/community/notice.do', // 법학과
//     'dept_economics': 'https://economics.catholic.ac.kr/economics/community/notice.do', // 경제학과
//     'dept_public_admin': 'https://pa.catholic.ac.kr/pa/community/notice.do', // 행정학과
//     'dept_global_business': 'https://globalbiz.catholic.ac.kr/globalbiz/community/notice.do', // 글로벌경영학과
//     'dept_korean_culture': 'https://klc.catholic.ac.kr/klc/community/notice.do', // 한국어문화학과 (외국인 전담학과)

//     'dept_chemistry': 'https://chemistry.catholic.ac.kr/chemistry/community/notice.do', // 화학과
//     'dept_mathematics': 'https://math.catholic.ac.kr/math/community/notice.do', // 수학과
//     'dept_physics': 'https://physics.catholic.ac.kr/physics/community/notice.do', // 물리학과
//     'dept_spatial_consumer': 'https://design.catholic.ac.kr/design/community/notice.do', // 공간디자인/소비자학과
//     'dept_clothing': 'https://clothing.catholic.ac.kr/clothing/community/notice.do', // 의류학과
//     'dept_food_nutrition': 'https://fn.catholic.ac.kr/fn/community/notice.do', // 식품영양학과
//     'dept_media_tech': 'https://mtc.catholic.ac.kr/mtc/community/notice.do', // 미디어기술콘텐츠학과
//     'dept_computer_info': 'https://csie.catholic.ac.kr/csie/community/notice.do', // 컴퓨터정보공학부
//     'dept_info_communication': 'https://ice.catholic.ac.kr/ice/community/notice.do', // 정보통신전자공학부
//     'dept_biotech': 'https://biotech.catholic.ac.kr/biotech/community/notice.do', // 생명공학과
//     'dept_energy_environment': 'https://envi.catholic.ac.kr/envi/community/notice.do', // 에너지환경공학과
//     'dept_biomedical_chem': 'https://bmce.catholic.ac.kr/bmce/community/notice.do', // 바이오메디컬화학공학과
//     'dept_ai': 'https://ai.catholic.ac.kr/ai/community/notice.do', // 인공지능학과
//     'dept_data_science': 'https://datascience.catholic.ac.kr/datascience/community/notice.do', // 데이터사이언스학과
//     'dept_biomedical_sw': 'https://bmsw.catholic.ac.kr/bmsw/community/notice.do', // 바이오메디컬소프트웨어학과
//     'dept_biomedical_life': 'https://mbs.catholic.ac.kr/mbs/community/notice.do', // 의생명과학과

//     'dept_music': 'https://music.catholic.ac.kr/music/community/notice.do', // 음악과
//     'dept_vocal_foreign': 'https://voice.catholic.ac.kr/voice/community/notice.do', // 성악과(외국인 전담학과)
//     // 'dept_art_media': '', // 예술미디어융합학과

//     'dept_liberal_arts': 'https://liberal.catholic.ac.kr/liberal/community/notice.do', // 자유전공학부

//     'dept_general_college': 'https://catholic-college.catholic.ac.kr/catholic_college/notification/notice.do', // 학부대학
//     'dept_convergence': 'https://major-convergence.catholic.ac.kr/major_convergence/notice/notice.do', // 융합전공학부

//     'dept_teacher': 'https://teaching.catholic.ac.kr/teaching/community/notice.do', // 교직과
//     'dept_gbs': 'https://gbs.catholic.ac.kr/gbs/community/notice.do', // 글로벌 경영대학

//     'dept_pharmacy': 'https://pharmacy.catholic.ac.kr/pharmacy/community/notice.do', // 약학과

//     'catholic_notice': 'https://www.catholic.ac.kr/ko/campuslife/notice.do'
// };

// // 2. 각 사이트별 마지막 게시물 정보를 저장할 객체
// let lastKnownPosts = {};

// /**
//  * 웹사이트를 크롤링해서 최신 게시물을 확인하는 함수
//  * @param {string} siteId
//  * @param {string} url
//  *//**
//  * 웹사이트를 크롤링해서 최신 게시물을 확인하는 함수
//  * @param {string} siteId
//  * @param {string} url
//  */
// async function checkSite(siteId, url) {
//     try {
//         // console.log(`[${siteId}] 사이트 확인 중...`); // 너무 많은 로그를 막기 위해 주석 처리
//         const response = await axios.get(url);
//         const $ = cheerio.load(response.data);

//         const latestPostElement = $('a.b-title').first();
        
//         // 게시물이 하나도 없는 페이지는 에러를 일으킬 수 있으므로 확인 후 건너뛰기
//         if (latestPostElement.length === 0) {
//             // console.log(`[${siteId}] 게시물이 없어 건너뜁니다.`);
//             return;
//         }

//         const numberElement = latestPostElement.closest('tr').find('.td-num');

//         const title = latestPostElement.text().trim();
//         const articleNo = latestPostElement.attr('data-article-no');
//         const postNumberText = numberElement.text().trim();
//         const noticeType = isNaN(postNumberText) ? 'important' : 'general';

//         // 해당 사이트의 마지막 게시물 정보와 비교
//         if (lastKnownPosts[siteId] && lastKnownPosts[siteId] !== articleNo) {
//             console.log(`🎉 [${siteId}] 새로운 게시물을 발견했습니다! (${noticeType})`);
            
//             // --- 새로운 규칙 적용 ---
//             // 학과 공지이면서, 중요 공지이면 알림을 보내지 않음
//             if (siteId !== 'catholic_notice' && noticeType === 'important') {
//                 console.log(`-> [${siteId}] 중요 공지이므로 알림을 보내지 않습니다.`);
//                 // 다음 확인을 위해 마지막 게시물 번호는 업데이트해야 함
//                 lastKnownPosts[siteId] = articleNo;
//                 return; // 알림 발송 없이 함수 종료
//             }
//             // --- 규칙 적용 끝 ---

//             const newPost = {
//                 no: articleNo,
//                 title: title,
//                 link: new URL(latestPostElement.attr('href'), url).href,
//                 type: noticeType,
//                 siteId: siteId
//             };
//             sendNotifications(newPost);
//         }

//         // 마지막 확인된 게시물 번호 업데이트
//         lastKnownPosts[siteId] = articleNo;

//     } catch (error) {
//         // 에러 로그는 그대로 유지
//         console.error(`[${siteId}] 크롤링 중 에러 발생:`, error.message.substring(0, 100));
//     }
// }

// /**
//  * 새 글 정보를 받아 알림을 보내는 함수
//  * @param {object} postInfo - 새 글 정보 객체
//  */
// function sendNotifications(postInfo) {
//     console.log(`알림 발송 시작: [${postInfo.title}]`);
//     const sql = `SELECT * FROM subscriptions WHERE site_value = ? AND notice_type = ?`;
    
//     db.all(sql, [postInfo.siteId, postInfo.type], (err, rows) => {
//         if (err) return console.error('DB 에러:', err.message);
//         if (rows.length === 0) return; // 구독자가 없으면 조용히 종료

//         console.log(`${rows.length}명의 구독자에게 웹 푸시 알림을 보냅니다.`);
//         rows.forEach(subscriber => {
//             // 이제 webpush 방식만 있으므로, 별도 확인 없이 바로 실행
//             // TODO: 여기에 실제 웹 푸시 API 호출 코드가 들어갑니다.
//             console.log(`  -> WEBPUSH: ${subscriber.user_id} 님에게 [${postInfo.siteId}]의 새 글 알림 발송!`);
//         });
//     });
// }

// // --- 실행 부분 ---
// function runAllChecks() {
//     console.log('모든 사이트의 새 글 확인을 시작합니다...');
//     // 주소록에 있는 모든 사이트를 순회하며 checkSite 함수 실행
//     for (const siteId in siteUrlMap) {
//         checkSite(siteId, siteUrlMap[siteId]);
//     }
// }

// console.log('✅ 새 글 알리미 시스템이 시작되었습니다.');
// runAllChecks();
// setInterval(runAllChecks, 60000); // 1분마다 모든 사이트를 확인