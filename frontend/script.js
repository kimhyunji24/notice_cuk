// 필요한 HTML 요소들
const siteCheckboxes = document.querySelectorAll('input[name="site"]');
const typeCheckboxes = document.querySelectorAll('input[name="notice_type"]');
const webPushButton = document.getElementById('webpush-btn');
const selectedListElement = document.getElementById('selected-list');
const checkAllTypesButton = document.getElementById('check-all-types');

// --- OneSignal 초기화 (페이지 로드 시 1회 실행) ---
window.OneSignal = window.OneSignal || [];
OneSignal.push(function() {
    OneSignal.init({
        appId: "여기에-발급받은-OneSignal-APP-ID-입력", // 본인의 App ID로 교체
    });
});
// ---------------------------------------------

// --- 이벤트 리스너 설정 ---
webPushButton.addEventListener('click', subscribe);
siteCheckboxes.forEach(checkbox => checkbox.addEventListener('click', updateSelectedList));
typeCheckboxes.forEach(checkbox => checkbox.addEventListener('click', updateSelectedList));
checkAllTypesButton.addEventListener('click', () => {
    typeCheckboxes.forEach(checkbox => checkbox.checked = true);
    updateSelectedList();
});

// --- 함수들 ---
async function subscribe() {
    // OneSignal에서 사용자 ID(playerId) 가져오기
    const playerId = await OneSignal.getUserId();
    if (!playerId) {
        alert('알림을 허용해주세요! 알림 허용 창이 차단되었거나, 아직 ID가 발급되지 않았습니다.');
        return;
    }

    const selectedSites = getSelectedValues(siteCheckboxes);
    const selectedTypes = getSelectedValues(typeCheckboxes);

    if (selectedSites.length === 0 && selectedTypes.length === 0) {
        alert('알림 받을 학과 또는 알림 종류를 하나 이상 선택해주세요!');
        return;
    }

    const dataToSend = {
        playerId: playerId,
        selectedSites: selectedSites,
        method: 'webpush',
        noticeTypes: selectedTypes
    };

    try {
        const response = await fetch('https://gadaealrim.onrender.com/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });
        if (!response.ok) { // 응답이 성공적이지 않을 경우 에러 처리
            throw new Error(`서버 에러: ${response.status}`);
        }
        const result = await response.json();
        alert(result.message);
    } catch (error) {
        console.error('서버 통신 중 에러 발생:', error);
        alert('구독 요청 중 문제가 발생했습니다.');
    }
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

function getSelectedValues(checkboxes) {
    const values = [];
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) values.push(checkbox.value);
    });
    return values;
}

function getSelectedLabels(checkboxes) {
    const labels = [];
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) labels.push(checkbox.parentElement.textContent.trim());
    });
    return labels;
}

updateSelectedList();