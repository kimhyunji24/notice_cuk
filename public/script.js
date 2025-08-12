// 환경 설정에서 Firebase 설정 가져오기
const envConfig = window.EnvironmentConfig;
const firebaseConfig = envConfig.getFirebaseConfig();
const apiConfig = envConfig.getApiConfig();

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// VAPID 키 설정
messaging.usePublicVapidKey(firebaseConfig.vapidKey);

class NotificationApp {
    constructor() {
        this.fcmToken = null;
        this.selectedSites = new Set();
        this.allSites = {};
        this.currentCategory = 'all';
        
        this.initializeElements();
        this.attachEventListeners();
        this.initialize();
    }

    initializeElements() {
        // DOM 요소들
        this.permissionCard = document.getElementById('permission-card');
        this.subscriptionCard = document.getElementById('subscription-card');
        this.loadingState = document.getElementById('loading-state');
        this.subscriptionForm = document.getElementById('subscription-form');
        this.messageArea = document.getElementById('message-area');
        
        this.enableNotificationsBtn = document.getElementById('enable-notifications');
        this.searchInput = document.getElementById('search-input');
        this.sitesContainer = document.getElementById('sites-container');
        this.selectedCountSpan = document.getElementById('selected-count');
        this.saveBtn = document.getElementById('save-subscription');
        this.selectAllBtn = document.getElementById('select-all');
        this.clearAllBtn = document.getElementById('clear-all');
        this.testNotificationBtn = document.getElementById('test-notification');
        
        this.filterTabs = document.querySelectorAll('.filter-tab');
    }

    attachEventListeners() {
        this.enableNotificationsBtn.addEventListener('click', () => this.requestNotificationPermission());
        this.searchInput.addEventListener('input', (e) => this.filterSites(e.target.value));
        this.saveBtn.addEventListener('click', () => this.saveSubscription());
        this.selectAllBtn.addEventListener('click', () => this.selectAllSites());
        this.clearAllBtn.addEventListener('click', () => this.clearAllSites());
        this.testNotificationBtn.addEventListener('click', () => this.sendTestNotification());
        
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.filterByCategory(e.target.dataset.category));
        });
    }

    async initialize() {
        try {
            await this.checkNotificationPermission();
            await this.loadSites();
            this.hideLoading();
        } catch (error) {
            console.error('초기화 실패:', error);
            this.showError('앱 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
        }
    }

    async checkNotificationPermission() {
        const permission = Notification.permission;
        
        if (permission === 'granted') {
            this.permissionCard.classList.add('hidden');
            await this.getFirebaseToken();
        } else if (permission === 'denied') {
            this.showPermissionCard();
            this.showWarning('알림이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.');
        } else {
            this.showPermissionCard();
        }
    }

    showPermissionCard() {
        this.permissionCard.classList.remove('hidden');
    }

    async requestNotificationPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                this.permissionCard.classList.add('hidden');
                await this.getFirebaseToken();
                this.showSuccess('알림 권한이 허용되었습니다!');
            } else {
                this.showError('알림 권한이 거부되었습니다. 브라우저 설정에서 수동으로 허용해주세요.');
            }
        } catch (error) {
            console.error('알림 권한 요청 실패:', error);
            this.showError('알림 권한 요청 중 오류가 발생했습니다.');
        }
    }

    async getFirebaseToken() {
        try {
            this.fcmToken = await messaging.getToken();
            console.log('FCM 토큰 획득 성공');
        } catch (error) {
            console.error('FCM 토큰 획득 실패:', error);
            this.showError('푸시 알림 토큰을 가져오는데 실패했습니다.');
        }
    }

    async loadSites() {
        try {
            const response = await fetch(`${apiConfig.baseUrl}/sites`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: apiConfig.timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // API 응답을 기존 형식으로 변환
                this.allSites = {};
                data.data.sites.forEach(site => {
                    this.allSites[site.id] = {
                        name: site.name,
                        category: site.category
                    };
                });
                
                console.log(`📚 ${data.data.totalCount}개 학과 목록 로드 완료`);
                this.renderSites();
            } else {
                throw new Error(data.error || '사이트 목록 로드 실패');
            }
            
        } catch (error) {
            console.error('사이트 목록 로드 실패:', error);
            this.showError('학과 목록을 불러오는데 실패했습니다. 네트워크 연결을 확인해주세요.');
            
            // 실패 시 기본 목록 표시
            this.loadFallbackSites();
        }
    }

    /**
     * API 실패 시 사용할 기본 사이트 목록
     */
    loadFallbackSites() {
        this.allSites = {
            'dept_computer_info': { name: '컴퓨터정보공학부', category: '공학계열' },
            'dept_ai': { name: '인공지능학과', category: '공학계열' },
            'dept_data_science': { name: '데이터사이언스학과', category: '공학계열' },
            'dept_korean_language': { name: '국어국문학과', category: '인문계열' },
            'dept_english': { name: '영어영문학과', category: '인문계열' },
            'dept_business': { name: '경영학부', category: '경영계열' },
            'dept_accounting': { name: '회계학과', category: '경영계열' },
            'dept_mathematics': { name: '수학과', category: '자연계열' },
            'dept_chemistry': { name: '화학과', category: '자연계열' },
            'dept_psychology': { name: '심리학과', category: '사회계열' },
            'dept_sociology': { name: '사회학과', category: '사회계열' },
            'catholic_notice': { name: '가톨릭대학교 공지사항', category: '대학공지' }
        };
        
        this.renderSites();
        console.warn('⚠️ 기본 사이트 목록을 사용합니다.');
    }

    renderSites() {
        const filteredSites = this.getFilteredSites();
        this.sitesContainer.innerHTML = '';

        Object.entries(filteredSites).forEach(([siteId, site]) => {
            const siteElement = this.createSiteElement(siteId, site);
            this.sitesContainer.appendChild(siteElement);
        });

        if (Object.keys(filteredSites).length === 0) {
            this.sitesContainer.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
        }
    }

    createSiteElement(siteId, site) {
        const div = document.createElement('div');
        div.className = 'site-item';
        
        const isSelected = this.selectedSites.has(siteId);
        if (isSelected) {
            div.classList.add('selected');
        }

        div.innerHTML = `
            <div class="site-checkbox">
                <input type="checkbox" id="site-${siteId}" ${isSelected ? 'checked' : ''}>
                <label for="site-${siteId}">
                    <span class="site-name">${site.name}</span>
                    <span class="site-category">${site.category}</span>
                </label>
            </div>
        `;

        const checkbox = div.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => this.toggleSite(siteId, checkbox.checked));

        return div;
    }

    toggleSite(siteId, isSelected) {
        if (isSelected) {
            this.selectedSites.add(siteId);
        } else {
            this.selectedSites.delete(siteId);
        }
        
        this.updateSelectedCount();
        this.updateSaveButtonState();
    }

    getFilteredSites() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const filtered = {};

        Object.entries(this.allSites).forEach(([siteId, site]) => {
            const matchesSearch = site.name.toLowerCase().includes(searchTerm);
            const matchesCategory = this.currentCategory === 'all' || site.category === this.currentCategory;
            
            if (matchesSearch && matchesCategory) {
                filtered[siteId] = site;
            }
        });

        return filtered;
    }

    filterSites(searchTerm) {
        this.renderSites();
    }

    filterByCategory(category) {
        this.currentCategory = category;
        
        // 탭 활성 상태 업데이트
        this.filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        this.renderSites();
    }

    selectAllSites() {
        const filteredSites = this.getFilteredSites();
        Object.keys(filteredSites).forEach(siteId => {
            this.selectedSites.add(siteId);
        });
        this.renderSites();
        this.updateSelectedCount();
        this.updateSaveButtonState();
    }

    clearAllSites() {
        this.selectedSites.clear();
        this.renderSites();
        this.updateSelectedCount();
        this.updateSaveButtonState();
    }

    updateSelectedCount() {
        this.selectedCountSpan.textContent = `선택됨: ${this.selectedSites.size}개`;
    }

    updateSaveButtonState() {
        const hasSelections = this.selectedSites.size > 0;
        const hasToken = !!this.fcmToken;
        
        this.saveBtn.disabled = !hasSelections || !hasToken;
    }

    async saveSubscription() {
        if (!this.fcmToken) {
            this.showError('FCM 토큰이 없습니다. 페이지를 새로고침 후 다시 시도해주세요.');
            return;
        }

        if (this.selectedSites.size === 0) {
            this.showError('구독할 학과를 선택해주세요.');
            return;
        }

        try {
            this.setSaveButtonLoading(true);

            const response = await fetch(`${apiConfig.baseUrl}/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: this.fcmToken,
                    sites: Array.from(this.selectedSites)
                }),
                timeout: apiConfig.timeout
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess(`구독 설정이 완료되었습니다! (${this.selectedSites.size}개 학과)`);
            } else {
                this.showError(data.error || '구독 설정에 실패했습니다.');
            }

        } catch (error) {
            console.error('구독 저장 실패:', error);
            this.showError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            this.setSaveButtonLoading(false);
        }
    }

    setSaveButtonLoading(isLoading) {
        const btnText = this.saveBtn.querySelector('.btn-text');
        const btnLoading = this.saveBtn.querySelector('.btn-loading');
        
        if (isLoading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
            this.saveBtn.disabled = true;
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
            this.updateSaveButtonState();
        }
    }

    async sendTestNotification() {
        if (!this.fcmToken) {
            this.showError('알림 권한을 먼저 허용해주세요.');
            return;
        }

        try {
            new Notification('테스트 알림', {
                body: 'CUK 공지사항 알리미가 정상적으로 작동하고 있습니다!',
                icon: '/icon-192.png',
                badge: '/badge-72.png'
            });
            
            this.showSuccess('테스트 알림이 발송되었습니다!');
        } catch (error) {
            console.error('테스트 알림 실패:', error);
            this.showError('테스트 알림 발송에 실패했습니다.');
        }
    }

    hideLoading() {
        this.loadingState.classList.add('hidden');
        this.subscriptionForm.classList.remove('hidden');
    }

    showMessage(message, type) {
        this.messageArea.className = `message-area ${type}`;
        this.messageArea.innerHTML = `
            <div class="message ${type}">
                ${message}
                <button class="message-close" onclick="this.parentElement.parentElement.classList.add('hidden')">&times;</button>
            </div>
        `;
        this.messageArea.classList.remove('hidden');

        // 3초 후 자동 숨김
        setTimeout(() => {
            this.messageArea.classList.add('hidden');
        }, 3000);
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showWarning(message) {
        this.showMessage(message, 'warning');
    }
}

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new NotificationApp();
});

// Service Worker 등록
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then(registration => {
            console.log('Service Worker 등록 성공:', registration);
            messaging.useServiceWorker(registration);
        })
        .catch(error => {
            console.error('Service Worker 등록 실패:', error);
        });
}

// 포그라운드 메시지 처리
messaging.onMessage(payload => {
    console.log('포그라운드 메시지 수신:', payload);
    
    const { title, body, icon } = payload.notification;
    
    new Notification(title, {
        body,
        icon: icon || '/icon-192.png',
        badge: '/badge-72.png',
        requireInteraction: true
    });
});