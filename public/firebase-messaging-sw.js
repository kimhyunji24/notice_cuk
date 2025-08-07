importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js");

// 백그라운드에서 실행되므로, fetch를 통해 설정을 가져옴
self.addEventListener('activate', async () => {
    try {
        const response = await fetch('/api/config');
        const firebaseConfig = await response.json();
        firebase.initializeApp(firebaseConfig);
        
        const messaging = firebase.messaging();
        console.log("백그라운드 메시지 핸들러가 설정되었습니다.");

        messaging.onBackgroundMessage((payload) => {
            console.log("[firebase-messaging-sw.js] 백그라운드 메시지 수신:", payload);
            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body,
                icon: '/cuk_logo.png', // public 폴더에 로고 이미지 추가 권장
            };
            self.registration.showNotification(notificationTitle, notificationOptions);
        });
    } catch (error) {
        console.error("서비스 워커에서 Firebase 초기화 실패:", error);
    }
});