// 필요한 HTML 요소들
const siteCheckboxes = document.querySelectorAll('input[name="site"]');
const typeCheckboxes = document.querySelectorAll('input[name="notice_type"]');
const webPushButton = document.getElementById('webpush-btn');
const selectedListElement = document.getElementById('selected-list');
const checkAllTypesButton = document.getElementById('check-all-types');

// API 설정 - 로컬 개발 환경 감지
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost 
    ? 'http://localhost:8234/cuk-alarm-c7f09/asia-northeast3' 
    : 'https://cuk-alarm-c7f09.a.run.app';

console.log('API Base URL:', API_BASE_URL);

// --- OneSignal 초기화 (페이지 로드 시 1회 실행) ---
window.OneSignal = window.OneSignal || [];
OneSignal.push(function() {
    OneSignal.init({
        appId: "0a6879a0-d45c-45ff-8ffd-da673baef262",
    });
});
// ---------------------------------------------

// --- 이벤트 리스너 설정 ---
webPushButton.addEventListener('click', handleSubscribe);
siteCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateSelectedList));
typeCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateSelectedList));
checkAllTypesButton.addEventListener('click', () => {
    typeCheckboxes.forEach(checkbox => checkbox.checked = true);
    updateSelectedList();
});

// --- 유틸리티 함수들 ---

/**
 * OneSignal Player ID를 안전하게 가져오는 함수
 * @returns {Promise<string|null>} Player ID 또는 null
 */
async function getPlayerId() {
    try {
        // OneSignal이 초기화될 때까지 대기
        await new Promise(resolve => {
            if (OneSignal.initialized) {
                resolve();
            } else {
                OneSignal.push(() => resolve());
            }
        });

        const playerId = await OneSignal.getUserId();
        return playerId;
    } catch (error) {
        console.error('Player ID 가져오기 실패:', error);
        return null;
    }
}

/**
 * 선택된 체크박스들의 값을 배열로 반환
 * @param {NodeList} checkboxes - 체크박스 요소들
 * @returns {string[]} 선택된 값들의 배열
 */
function getSelectedValues(checkboxes) {
    return Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
}

/**
 * 선택된 체크박스들의 라벨을 배열로 반환
 * @param {NodeList} checkboxes - 체크박스 요소들
 * @returns {string[]} 선택된 라벨들의 배열
 */
function getSelectedLabels(checkboxes) {
    return Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.parentElement.textContent.trim());
}

/**
 * 선택된 항목들을 화면에 표시
 */
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

/**
 * 입력 데이터 유효성 검사
 * @param {string} playerId - OneSignal Player ID
 * @param {string[]} selectedSites - 선택된 사이트들
 * @param {string[]} selectedTypes - 선택된 알림 타입들
 * @returns {Object} 검사 결과
 */
function validateInput(playerId, selectedSites, selectedTypes) {
    const errors = [];

    if (!playerId) {
        errors.push('알림을 허용해주세요! 알림 허용 창이 차단되었거나, 아직 ID가 발급되지 않았습니다.');
    }

    if (selectedSites.length === 0 && selectedTypes.length === 0) {
        errors.push('알림 받을 학과 또는 알림 종류를 하나 이상 선택해주세요!');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * 구독 요청을 처리하는 메인 함수
 */
async function handleSubscribe() {
    try {
        // 버튼 비활성화
        webPushButton.disabled = true;
        webPushButton.textContent = '처리 중...';

        // Player ID 가져오기
        const playerId = await getPlayerId();
        const selectedSites = getSelectedValues(siteCheckboxes);
        const selectedTypes = getSelectedValues(typeCheckboxes);

        // 입력 데이터 검증
        const validation = validateInput(playerId, selectedSites, selectedTypes);
        if (!validation.isValid) {
            alert(validation.errors.join('\n'));
            return;
        }

        // API 요청 데이터 준비
        const requestData = {
            playerId: playerId,
            selectedSites: selectedSites,
            method: 'webpush',
            noticeTypes: selectedTypes
        };

        console.log('구독 요청 데이터:', requestData);
        console.log('API URL:', `${API_BASE_URL}/api/subscribe`);

        // API 호출
        const response = await fetch(`${API_BASE_URL}/api/subscribe`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        console.log('API 응답 상태:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `서버 에러: ${response.status}`);
        }

        const result = await response.json();
        console.log('API 응답 데이터:', result);
        
        alert(result.message || '구독이 성공적으로 완료되었습니다!');

    } catch (error) {
        console.error('구독 처리 중 에러 발생:', error);
        alert(`구독 요청 중 문제가 발생했습니다: ${error.message}`);
    } finally {
        // 버튼 상태 복원
        webPushButton.disabled = false;
        webPushButton.textContent = '알림 받기';
    }
}

// 초기 상태 설정
updateSelectedList();