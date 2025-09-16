// Firebase Cloud Messaging Service Worker
// 공식 문서: https://firebase.google.com/docs/cloud-messaging/js/receive
// 성공 사례: https://velog.io/@chy8165/FCM을-이용해-웹-푸시알림-구현-웹-PWA

// Firebase v10 호환 SDK 임포트 (Service Worker에서는 compat 버전 사용)
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// 환경 설정 로드
importScripts('/config.js');

// Firebase 설정 가져오기
let firebaseConfig;
try {
    const envConfig = new EnvironmentConfig();
    firebaseConfig = envConfig.getFirebaseConfig();
    console.log('[SW] 🔥 Firebase 설정 로드 완료:', firebaseConfig.projectId);
} catch (error) {
    console.error('[SW] ❌ Firebase 설정 로드 실패, 기본값 사용:', error);
    // 기본값 사용 (프로덕션 환경)
    firebaseConfig = {
        apiKey: "AIzaSyDZvIopijEsI9MrC-WHSqS1G9arX_U5m5Y",
        authDomain: "cuknotice.firebaseapp.com",
        projectId: "cuknotice",
        storageBucket: "cuknotice.firebasestorage.app",
        messagingSenderId: "218411557852",
        appId: "1:218411557852:web:896358449c61ee029ce519",
        measurementId: "G-84PX1VTECE"
    };
}

// Firebase 앱 초기화
firebase.initializeApp(firebaseConfig);

// Firebase Messaging 인스턴스 가져오기
const messaging = firebase.messaging();

console.log('[SW] ✅ Firebase Messaging 초기화 완료');

// 백그라운드 메시지 처리 (공식 문서 권장 방식)
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] 🔔 백그라운드 메시지 수신:', {
        messageId: payload.messageId,
        from: payload.from,
        notification: payload.notification,
        data: payload.data
    });

    // 메시지에서 알림 정보 추출
    const { title, body, icon, image } = payload.notification || {};
    const { url, siteId, isImportant, category } = payload.data || {};

    // 알림 제목과 내용 설정
    const notificationTitle = title || 'CUK 공지사항';
    const notificationBody = body || '새로운 공지사항이 있습니다.';

    // 알림 옵션 구성 (공식 문서 권장 방식)
    const notificationOptions = {
        body: notificationBody,
        icon: icon || '/icon-192.png',
        badge: '/badge-72.png',
        image: image,
        tag: siteId || 'cuk-notice',
        requireInteraction: isImportant === 'true',
        silent: false,
        timestamp: Date.now(),
        data: {
            url: url,
            siteId: siteId,
            category: category,
            clickAction: url ? 'open_url' : 'focus_app'
        },
        actions: [
            {
                action: 'open',
                title: '공지 보기',
                icon: '/icon-open.png'
            },
            {
                action: 'close',
                title: '닫기',
                icon: '/icon-close.png'
            }
        ]
    };

    // 중요도에 따른 알림 설정 조정
    if (isImportant === 'true') {
        notificationOptions.requireInteraction = true;
        notificationOptions.vibrate = [200, 100, 200];
    }

    // 카테고리별 아이콘 설정
    if (category) {
        const categoryIcons = {
            'general': '/icon-general.png',
            'department': '/icon-department.png',
            'graduate': '/icon-graduate.png'
        };
        notificationOptions.icon = categoryIcons[category] || notificationOptions.icon;
    }

    // 백그라운드 알림 표시
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 알림 클릭 처리 (공식 문서 권장 방식)
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] 🖱️ 알림 클릭:', {
        action: event.action,
        notification: {
            tag: event.notification.tag,
            data: event.notification.data
        }
    });

    // 알림 닫기
    event.notification.close();

    const { url, clickAction } = event.notification.data || {};

    if (event.action === 'close') {
        // 닫기 액션 - 아무것도 하지 않음
        return;
    }

    if (event.action === 'open' || !event.action) {
        // 공지 보기 액션 또는 기본 클릭
        if (url) {
            // 새 탭에서 URL 열기
            event.waitUntil(
                clients.openWindow(url).then(windowClient => {
                    console.log('[SW] ✅ 새 탭에서 URL 열기:', url);
                    return windowClient;
                }).catch(error => {
                    console.error('[SW] ❌ URL 열기 실패:', error);
                })
            );
        } else {
            // 기본 앱으로 포커스
            event.waitUntil(
                clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                    // 기존 창이 있으면 포커스
                    for (let i = 0; i < clientList.length; i++) {
                        const client = clientList[i];
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            console.log('[SW] ✅ 기존 창으로 포커스');
                            return client.focus();
                        }
                    }
                    
                    // 기존 창이 없으면 새 창 열기
                    if (clients.openWindow) {
                        console.log('[SW] ✅ 새 창 열기');
                        return clients.openWindow('/');
                    }
                }).catch(error => {
                    console.error('[SW] ❌ 창 포커스/열기 실패:', error);
                })
            );
        }
    }
});

// 알림 닫기 처리
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] ❌ 알림 닫기:', {
        tag: event.notification.tag,
        timestamp: new Date().toISOString()
    });
    
    // 분석을 위한 로그 (필요시)
    // analytics.track('notification_dismissed', { tag: event.notification.tag });
});

// Service Worker 설치 이벤트
self.addEventListener('install', (event) => {
    console.log('[SW] ⚙️ Service Worker 설치 중...');
    
    // 즉시 활성화
    event.waitUntil(self.skipWaiting());
});

// Service Worker 활성화 이벤트
self.addEventListener('activate', (event) => {
    console.log('[SW] ✅ Service Worker 활성화');
    
    // 모든 클라이언트에서 즉시 제어
    event.waitUntil(self.clients.claim());
});

// 에러 처리
self.addEventListener('error', (event) => {
    console.error('[SW] ❌ Service Worker 에러:', event.error);
});

// Unhandled Promise Rejection 처리
self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] ❌ Unhandled Promise Rejection:', event.reason);
    event.preventDefault();
});

console.log('[SW] 🚀 Firebase Messaging Service Worker 로드 완료');