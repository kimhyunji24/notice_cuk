// public/script.js (최종 수정본)

// 필요한 HTML 요소들
const siteCheckboxes = document.querySelectorAll('input[name="site"]');
const typeCheckboxes = document.querySelectorAll('input[name="notice_type"]');
const webPushButton = document.getElementById('webpush-btn');
const selectedListElement = document.getElementById('selected-list');
const checkAllTypesButton = document.getElementById('check-all-types');

// API 설정 - firebase.json의 rewrites 규칙을 사용하므로 상대 경로로 충분합니다.
const API_BASE_URL = '';

// --- OneSignal 초기화 ---
window.OneSignal = window.OneSignal || [];
OneSignal.push(function() {
    OneSignal.init({
        appId: "0a6879a0-d45c-45ff-8ffd-da673baef262", // 본인의 App ID
        allowLocalhostAsSecureOrigin: true,
    });
});

// --- 이벤트 리스너 설정 ---
webPushButton.addEventListener('click', handleSubscribe);
siteCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateSelectedList));
typeCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateSelectedList));
checkAllTypesButton.addEventListener('click', () => {
    typeCheckboxes.forEach(checkbox => checkbox.checked = true);
    updateSelectedList();
});

// --- 함수들 ---
/**
 * OneSignal Player ID를 가져오는 함수 (v16 SDK 공식 문서 기준)
 * @returns {Promise<string|null>} Player ID 또는 null
 */
async function getPlayerId() {
    // OneSignal SDK가 완전히 로드될 때까지 기다립니다.
    await OneSignal.initialized;
    
    // 현재 사용자 ID를 가져옵니다.
    const playerId = OneSignal.User.onesignalId;

    if (playerId) {
        console.log('기존 Player ID:', playerId);
        return playerId;
    } else {
        // ID가 없는 경우, 사용자에게 알림 권한을 요청합니다.
        console.log('Player ID가 없어 알림 권한을 요청합니다.');
        await OneSignal.Notifications.requestPermission();
        
        // 권한 요청 후 ID가 할당될 때까지 잠시 기다립니다.
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newPlayerId = OneSignal.User.onesignalId;
        console.log('새로 발급된 Player ID:', newPlayerId);
        return newPlayerId;
    }
}

/**
 * 구독 요청을 처리하는 메인 함수
 */
async function handleSubscribe() {
    webPushButton.disabled = true;
    webPushButton.textContent = '처리 중...';

    try {
        const playerId = await getPlayerId();
        if (!playerId) {
            throw new Error('OneSignal Player ID를 가져올 수 없습니다. 알림이 차단되었는지 확인해주세요.');
        }

        const selectedSites = getSelectedValues(siteCheckboxes);
        const selectedTypes = getSelectedValues(typeCheckboxes);

        if (selectedSites.length === 0 && selectedTypes.length === 0) {
            alert('알림 받을 학과 또는 알림 종류를 하나 이상 선택해주세요!');
            return;
        }

        const requestData = {
            playerId: playerId,
            selectedSites: selectedSites,
            noticeTypes: selectedTypes
        };

        const response = await fetch(`${API_BASE_URL}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `서버 에러: ${response.status}`);
        }

        const result = await response.json();
        alert(result.message || '구독이 성공적으로 완료되었습니다!');

    } catch (error) {
        console.error('구독 처리 중 에러 발생:', error);
        alert(`구독 요청 중 문제가 발생했습니다: ${error.message}`);
    } finally {
        webPushButton.disabled = false;
        webPushButton.textContent = '알림 받기';
    }
}

function getSelectedValues(checkboxes) {
    return Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
}

function getSelectedLabels(checkboxes) {
    return Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.parentElement.textContent.trim());
}

function updateSelectedList() {
    const siteLabels = getSelectedLabels(siteCheckboxes);
    const typeLabels = getSelectedLabels(typeCheckboxes);
    let displayText = "선택한 학과 또는 종류가 없습니다.";
    if (siteLabels.length > 0 || typeLabels.length > 0) {
        const sitesText = siteLabels.length > 0 ? `학과: ${siteLabels.join(', ')}` : '';
        const typesText = typeLabels.length > 0 ? `종류: ${typeLabels.join(', ')}` : '';
        displayText = [sitesText, typesText].filter(Boolean).join(' | ');
    }
    selectedListElement.textContent = displayText;
}

// 페이지 로드 시 초기 상태 설정
updateSelectedList();