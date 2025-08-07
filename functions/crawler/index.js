// functions/crawler/index.js
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { siteUrlMap } = require("../constants");
const { checkSite } = require("./checker");

exports.crawler = onSchedule("every 10 minutes", async (event) => {
    console.log("🚀 [Scheduler] 모든 사이트의 새 글 확인을 시작합니다...");
    const promises = Object.entries(siteUrlMap).map(([id, url]) => checkSite(id, url));
    await Promise.all(promises);
    console.log("✅ [Scheduler] 모든 사이트 확인 완료.");
    return null;
});