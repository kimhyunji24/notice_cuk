// functions/services/fcm.js
const admin = require("firebase-admin");

/**
 * 게시물 정보를 구독자들에게 FCM으로 발송
 * @param {object} postInfo - 게시물 정보
 */
async function sendNotifications(postInfo) {
  const db = admin.firestore();
  const messaging = admin.messaging();

  const snapshot = await db.collection("subscriptions")
    .where("sites", "array-contains", postInfo.siteId)
    .where("types", "array-contains", postInfo.type)
    .get();

  if (snapshot.empty) {
    console.log(`[FCM Service] '${postInfo.title}'에 대한 구독자가 없습니다.`);
    return;
  }

  const tokens = snapshot.docs.map(doc => doc.id);

  const message = {
    notification: {
      title: `[${postInfo.siteId}] 새 글 알림`,
      body: postInfo.title,
    },
    webpush: {
      fcmOptions: {
        link: postInfo.link,
      },
    },
    tokens: tokens,
  };

  try {
    const response = await MessagingEachForMulticast(message);
    console.log(`✅ [FCM Service] '${postInfo.title}' 알림 ${response.successCount}건 발송 성공`);
  } catch (error) {
    console.error("❌ [FCM Service] FCM 발송 실패:", error);
  }
}

module.exports = { sendNotifications };