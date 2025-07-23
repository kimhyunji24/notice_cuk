// 필요한 HTML 요소들
const siteCheckboxes = document.querySelectorAll('input[name="site"]');
const typeCheckboxes = document.querySelectorAll('input[name="notice_type"]');
const webPushButton = document.getElementById('webpush-btn');
const selectedListElement = document.getElementById('selected-list');
const checkAllTypesButton = document.getElementById('check-all-types');

// --- 이벤트 리스너 설정 ---
webPushButton.addEventListener('click', subscribe);

// 모든 체크박스에 클릭 이벤트 추가
siteCheckboxes.forEach(checkbox => checkbox.addEventListener('click', updateSelectedList));
typeCheckboxes.forEach(checkbox => checkbox.addEventListener('click', updateSelectedList));

// '전체선택' 버튼 클릭 이벤트
checkAllTypesButton.addEventListener('click', () => {
    typeCheckboxes.forEach(checkbox => checkbox.checked = true);
    updateSelectedList();
});


// --- 함수들 ---
async function subscribe() {
    const selectedSites = getSelectedValues(siteCheckboxes);
    const selectedTypes = getSelectedValues(typeCheckboxes);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
        appId: "0a6879a0-d45c-45ff-8ffd-da673baef262",
        });
    });
    
    if (selectedSites.length === 0 && selectedTypes.length === 0) {
        alert('알림 받을 학과 또는 알림 종류를 하나 이상 선택해주세요!');
        return;
    }

    const dataToSend = {
        selectedSites: selectedSites,
        method: 'webpush', // 알림 방식을 'webpush'로 고정
        noticeTypes: selectedTypes
    };

    try {
        const response = await fetch('http://localhost:3000/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });
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
    for (const checkbox of checkboxes) {
        if (checkbox.checked) {
            values.push(checkbox.value);
        }
    }
    return values;
}

function getSelectedLabels(checkboxes) {
    const labels = [];
    for (const checkbox of checkboxes) {
        if (checkbox.checked) {
            labels.push(checkbox.parentElement.textContent.trim());
        }
    }
    return labels;
}

// 페이지 로드 시 한 번 실행
updateSelectedList();