// Firebase Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');
// Firebase 설정 (실제 환경에서는 환경변수에서 가져와야 함)
const firebaseConfig = {
  apiKey: "AIzaSyDZvIopijEsI9MrC-WHSqS1G9arX_U5m5Y",
  authDomain: "cuknotice.firebaseapp.com",
  projectId: "cuknotice",
  storageBucket: "cuknotice.firebasestorage.app",
  messagingSenderId: "218411557852",
  appId: "1:218411557852:web:896358449c61ee029ce519",
  measurementId: "G-84PX1VTECE"
};


// Firebase 초기화
firebase.initializeApp(firebaseConfig);

// Messaging 인스턴스 가져오기
const messaging = firebase.messaging();

// 백그라운드 메시지 처리
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] 백그라운드 메시지 수신:', payload);

    const { title, body, icon } = payload.notification;
    const { url, siteId, isImportant } = payload.data || {};

    // 알림 옵션 설정
    const notificationOptions = {
        body: body || '새로운 공지사항이 있습니다.',
        icon: icon || '/icon-192.png',
        badge: '/badge-72.png',
        tag: `notice-${siteId}`, // 같은 사이트의 알림들을 그룹핑
        requireInteraction: isImportant === 'true', // 중요공지는 사용자 액션 필요
        actions: [
            {
                action: 'open',
                title: '확인하기',
                icon: '/icon-192.png'
            },
            {
                action: 'close',
                title: '닫기'
            }
        ],
        data: {
            url: url || '/',
            siteId,
            isImportant
        }
    };

    // 알림 표시
    return self.registration.showNotification(
        title || 'CUK 공지사항 알리미',
        notificationOptions
    );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] 알림 클릭:', event);

    event.notification.close();

    const { action } = event;
    const { url, siteId } = event.notification.data || {};

    if (action === 'close') {
        // 닫기 액션 - 아무것도 하지 않음
        return;
    }

    // 기본 클릭 또는 '확인하기' 액션
    if (action === 'open' || !action) {
        const targetUrl = url || '/';
        
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // 이미 열린 창이 있는지 확인
                    for (const client of clientList) {
                        if (client.url.includes(new URL(targetUrl).pathname) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // 새 창 열기
                    if (clients.openWindow) {
                        return clients.openWindow(targetUrl);
                    }
                })
        );
    }
});

// 푸시 구독 변경 처리
self.addEventListener('pushsubscriptionchange', (event) => {
    console.log('[firebase-messaging-sw.js] 푸시 구독 변경:', event);
    
    // 필요시 서버에 새로운 구독 정보 업데이트
    event.waitUntil(
        // 새로운 구독 정보로 서버 업데이트 로직
        fetch('/api/update-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                oldSubscription: event.oldSubscription,
                newSubscription: event.newSubscription
            })
        })
    );
});

// Service Worker 설치
self.addEventListener('install', (event) => {
    console.log('[firebase-messaging-sw.js] Service Worker 설치됨');
    self.skipWaiting();
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
    console.log('[firebase-messaging-sw.js] Service Worker 활성화됨');
    event.waitUntil(clients.claim());
});

// 에러 처리
self.addEventListener('error', (event) => {
    console.error('[firebase-messaging-sw.js] Service Worker 에러:', event.error);
});

// 처리되지 않은 rejection 처리
self.addEventListener('unhandledrejection', (event) => {
    console.error('[firebase-messaging-sw.js] Unhandled rejection:', event.reason);
});