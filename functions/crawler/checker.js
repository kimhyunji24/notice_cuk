// functions/crawler/checker.js
const axios = require("axios");
const cheerio = require("cheerio");
const admin = require("firebase-admin");
const { sendNotifications } = require("../services/onesignal");

const db = admin.firestore();

/**
 * 단일 사이트를 확인하여 새 글이 있으면 알림을 보냄
 * @param {string} siteId - 사이트 고유 ID
 * @param {string} url - 크롤링할 URL
 */
async function checkSite(siteId, url) {
    console.log(`[Crawler] [${siteId}] 크롤링 시작: ${url}`);
    try {
        const { data } = await axios.get(url, { timeout: 15000 });
        const $ = cheerio.load(data);

        const stateRef = db.collection("crawler_state").doc(siteId);
        const doc = await stateRef.get();
        const processedNos = (doc.exists && Array.isArray(doc.data().processedNos)) ? doc.data().processedNos : [];

        const newPosts = [];
        const currentNos = [];

        const postElements = $("a.b-title").slice(0, 15);
        if (postElements.length === 0) {
            console.warn(`[Crawler] [${siteId}] 최신 게시물을 찾을 수 없습니다.`);
            return;
        }

        postElements.each((index, el) => {
            const element = $(el);
            const articleNo = element.attr("data-article-no");
            if (!articleNo) return;

            currentNos.push(articleNo);

            if (!processedNos.includes(articleNo)) {
                const title = element.text().trim();
                const postNumberText = element.closest("tr").find(".td-num").text().trim();
                const noticeType = isNaN(parseInt(postNumberText, 10)) ? "important" : "general";

                if (siteId !== "catholic_notice" && noticeType === "important") {
                    console.log(`-> [Crawler] [${siteId}] 학과 중요 공지 '${title}'는 알림에서 제외합니다.`);
                    return;
                }

                newPosts.push({
                    no: articleNo,
                    title,
                    link: new URL(element.attr("href"), url).href,
                    type: noticeType,
                    siteId,
                });
            }
        });

        if (newPosts.length > 0) {
            console.log(`🎉 [Crawler] [${siteId}] 총 ${newPosts.length}개의 새 게시물을 발견했습니다!`);
            const sortedNewPosts = newPosts.sort((a, b) => parseInt(a.no, 10) - parseInt(b.no, 10));
            for (const post of sortedNewPosts) {
                await sendNotifications(post);
            }
        }

        const latestPost = postElements.first();
        const latestTitle = latestPost.length > 0 ? latestPost.text().trim() : "N/A";
        const updatedNos = [...new Set([...currentNos, ...processedNos])].slice(0, 20);

        await stateRef.set({
            processedNos: updatedNos,
            title: latestTitle, // 상태 확인 페이지를 위한 최신 제목
            no: currentNos[0] || null, // 상태 확인 페이지를 위한 최신 번호
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error(`[Crawler] [${siteId}] 크롤링 실패:`, error.message);
    }
}

module.exports = { checkSite };