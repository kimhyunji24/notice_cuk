// functions/api/routes.js
const express = require("express");
const admin = require("firebase-admin");
const { body, validationResult } = require("express-validator");
const { siteUrlMap } = require("../constants");
const { checkSite } = require("../crawler/checker");

const router = express.Router();
const db = admin.firestore();

// POST /api/subscribe
router.post(
    "/subscribe",
    body("playerId").isString().withMessage("Player ID는 문자열이어야 합니다.").notEmpty().withMessage("Player ID는 필수입니다."),
    body("selectedSites").isArray().withMessage("선택된 사이트는 배열이어야 합니다."),
    body("noticeTypes").isArray().withMessage("알림 종류는 배열이어야 합니다."),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        let { playerId, selectedSites, noticeTypes } = req.body;
        if (selectedSites.length === 0) selectedSites = ["catholic_notice"];
        if (noticeTypes.length === 0) noticeTypes = ["important", "general"];

        try {
            await db.collection("subscriptions").doc(playerId).set({
                sites: selectedSites,
                types: noticeTypes,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            res.status(200).json({ success: true, message: "구독 정보가 성공적으로 갱신되었습니다!" });
        } catch (error) {
            console.error(`[API] /subscribe Firestore 저장 실패:`, error);
            res.status(500).json({ success: false, error: "서버 오류가 발생했습니다." });
        }
    }
);

// GET /api/status
router.get("/status", async (req, res) => {
    try {
        const snapshot = await db.collection("crawler_state").get();
        const lastPosts = {};
        snapshot.forEach(doc => {
            lastPosts[doc.id] = doc.data();
        });
        res.status(200).json({
            success: true,
            data: lastPosts,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error(`[API] /status 데이터 조회 실패:`, error);
        res.status(500).json({ success: false, error: "상태 데이터를 불러오는 데 실패했습니다." });
    }
});

// POST /api/crawl (수동 실행용)
router.post("/crawl", async (req, res) => {
    console.log("🚀 [API] 수동 크롤링 요청을 받았습니다.");
    try {
        // 비동기로 실행하고 바로 응답을 보내 타임아웃 방지
        const promises = Object.entries(siteUrlMap).map(([id, url]) => checkSite(id, url));
        Promise.all(promises);
        res.status(202).send("✅ 크롤링 작업을 시작했습니다. 완료까지 몇 분 정도 소요될 수 있습니다.");
    } catch (error) {
        console.error(`[API] /crawl 실행 실패:`, error);
        res.status(500).send("❌ 크롤링 작업 시작 중 오류가 발생했습니다.");
    }
});


module.exports = router;