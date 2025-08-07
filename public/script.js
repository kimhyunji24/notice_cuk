// public/script.js

const siteCheckboxes = document.querySelectorAll('input[name="site"]');
const typeCheckboxes = document.querySelectorAll('input[name="notice_type"]');
const webPushButton = document.getElementById('webpush-btn');
const selectedListElement = document.getElementById('selected-list');
const checkAllTypesButton = document.getElementById('check-all-types');


// 전역 변수로 messaging 객체를 선언
let messaging;
let vapidKey;

// API 설정: firebase.json의 rewrites 규칙을 사용하므로 상대 경로로 충분합니다.
const API_BASE_URL = '/api';
async function initializeApp() {
    try {
        console.log("Firebase 설정 정보 요청 중...");
        const response = await fetch(`${API_BASE_URL}/config`);
        if (!response.ok) {
            throw new Error('Firebase 설정을 가져오는 데 실패했습니다.');
        }
        const firebaseConfig = await response.json();
        vapidKey = firebaseConfig.vapidKey; // VAPID 키 저장

        firebase.initializeApp(firebaseConfig);
        messaging = firebase.messaging();
        console.log("Firebase 앱이 성공적으로 초기화되었습니다.");

    } catch (error) {
        console.error("초기화 오류:", error);
        alert("서비스를 초기화하는 데 실패했습니다. 페이지를 새로고침해주세요.");
    }
}



async function requestPermissionAndGetToken() {
    if (!messaging) {
        alert("Firebase Messaging이 초기화되지 않았습니다.");
        return null;
    }
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const fcmToken = await messaging.getToken({ vapidKey: vapidKey });
            return fcmToken;
        }
        return null;
    } catch (error) {
        console.error('FCM 토큰 요청 중 오류:', error);
        return null;
    }
}



async function handleSubscribe() {
    webPushButton.disabled = true;
    webPushButton.textContent = '처리 중...';

    const fcmToken = await requestPermissionAndGetToken();
    if (!fcmToken) {
        alert('알림 권한을 허용해야 구독이 가능합니다.');
        webPushButton.disabled = false;
        webPushButton.textContent = '알림 받기';
        return;
    }
    
    // ... (selectedSites, selectedTypes 가져오는 로직은 동일)

    try {
        const response = await fetch(`${API_BASE_URL}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fcmToken, selectedSites, noticeTypes: selectedTypes }),
        });
        // ... (응답 처리 로직은 동일)
    } catch (error) {
        // ... (에러 처리 로직은 동일)
    } finally {
        webPushButton.disabled = false;
        webPushButton.textContent = '알림 받기';
    }
}

// --- 이벤트 리스너 및 초기 실행 ---
webPushButton.addEventListener('click', handleSubscribe);
// ... (나머지 이벤트 리스너 동일)

// 페이지가 로드되면 Firebase 초기화 함수를 실행
document.addEventListener('DOMContentLoaded', initializeApp);

// // --- 이벤트 리스너 ---
// webPushButton.addEventListener('click', handleSubscribe);
// siteCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateSelectedList));
// typeCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateSelectedList));
// checkAllTypesButton.addEventListener('click', () => {
//     typeCheckboxes.forEach(checkbox => checkbox.checked = true);
//     updateSelectedList();
// });

// // --- 함수들 ---
// // getPlayerId 함수를 더 명확하게 수정
// async function getPlayerId() {
//     // OneSignal이 완전히 로드될 때까지 기다림
//     await OneSignal.Slidedown.prompt.isShowing();

//     const playerId = OneSignal.User.onesignalId;
//     console.log('[public/script.js] 현재 Player ID:', playerId);

//     if (playerId) {
//         return playerId;
//     } else {
//         console.log('[public/script.js] Player ID가 없으므로 알림 권한을 요청합니다.');
//         // 알림 권한을 요청하고 사용자의 선택을 기다림
//         const permission = await OneSignal.Notifications.requestPermission();
//         if (permission) {
//              // 권한 획득 후 Player ID를 다시 조회
//             const newPlayerId = OneSignal.User.onesignalId;
//             console.log('[public/script.js] 새로운 Player ID:', newPlayerId);
//             return newPlayerId;
//         } else {
//             return null; // 사용자가 거부한 경우
//         }
//     }
// }
// async function handleSubscribe() {
//     console.log('[public/script.js] "알림 받기" 버튼 클릭');
//     webPushButton.disabled = true;
//     webPushButton.textContent = '처리 중...';
//     try {
//         console.log('[public/script.js] Player ID 가져오기 시작');
//         const playerId = await getPlayerId();
//         if (!playerId) {
//             throw new Error('OneSignal Player ID를 가져올 수 없습니다. 알림이 차단되었는지 확인해주세요.');
//         }
//         console.log('[public/script.js] Player ID:', playerId);

//         const selectedSites = getSelectedValues(siteCheckboxes);
//         const selectedTypes = getSelectedValues(typeCheckboxes);
//         console.log('[public/script.js] 선택된 사이트:', selectedSites);
//         console.log('[public/script.js] 선택된 알림 종류:', selectedTypes);

//         if (selectedSites.length === 0 && selectedTypes.length === 0) {
//             alert('알림 받을 학과 또는 알림 종류를 하나 이상 선택해주세요!');
//             // 함수가 여기서 종료되므로 finally 블록으로 바로 이동합니다.
//             return; 
//         }

//         console.log('[public/script.js] /api/subscribe 요청 시작');
//         const response = await fetch(`${API_BASE_URL}/subscribe`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ playerId, selectedSites, noticeTypes: selectedTypes })
//         });
//         console.log('[public/script.js] /api/subscribe 응답 상태:', response.status);

//         if (!response.ok) {
//             const errorData = await response.json().catch(() => ({}));
//             throw new Error(errorData.error || `서버 에러: ${response.status}`);
//         }
//         const result = await response.json();
//         console.log('[public/script.js] 구독 성공:', result.message);
//         alert(result.message || '구독이 성공적으로 완료되었습니다!');
//     } catch (error) {
//         console.error('[public/script.js] 구독 처리 중 에러 발생:', error);
//         alert(`구독 요청 중 문제가 발생했습니다: ${error.message}`);
//     } finally {
//         webPushButton.disabled = false;
//         webPushButton.textContent = '알림 받기';
//         console.log('[public/script.js] "알림 받기" 버튼 활성화');
//     }
// }

// function getSelectedValues(checkboxes) {
//     return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
// }

// function getSelectedLabels(checkboxes) {
//     return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.parentElement.textContent.trim());
// }

// function updateSelectedList() {
//     const siteLabels = getSelectedLabels(siteCheckboxes);
//     const typeLabels = getSelectedLabels(typeCheckboxes);
//     let displayText = "선택한 학과 또는 종류가 없습니다.";
//     if (siteLabels.length > 0 || typeLabels.length > 0) {
//         const sitesText = siteLabels.length > 0 ? `학과: ${siteLabels.join(', ')}` : '';
//         const typesText = typeLabels.length > 0 ? `종류: ${typeLabels.join(', ')}` : '';
//         displayText = [sitesText, typesText].filter(Boolean).join(' | ');
//     }
//     selectedListElement.textContent = displayText;
// }

// updateSelectedList();