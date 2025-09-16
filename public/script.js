// Firebase v9+ 공식 문서 기반 FCM 구현
// 참고: https://firebase.google.com/docs/cloud-messaging/js/client
// 성공 사례: https://velog.io/@chy8165/FCM을-이용해-웹-푸시알림-구현-웹-PWA

// Firebase 인스턴스
let firebaseApp = null;
let messaging = null;

class NotificationApp {
    constructor() {
        this.fcmToken = null;
        this.selectedSites = new Set();
        this.allSites = {};
        this.currentCategory = 'all';
        this.userSubscriptions = [];
        this.isEditingMode = false;
        
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
        this.manageSubscriptionsBtn = document.getElementById('manage-subscriptions');
        this.subscriptionList = document.getElementById('subscription-list');
        this.editSubscriptionsBtn = document.getElementById('edit-subscriptions');
        this.saveSubscriptionsBtn = document.getElementById('save-subscriptions');
        this.cancelEditBtn = document.getElementById('cancel-edit');
        
        this.filterTabs = document.querySelectorAll('.filter-tab');
    }

    attachEventListeners() {
        this.enableNotificationsBtn.addEventListener('click', () => this.requestNotificationPermission());
        this.searchInput.addEventListener('input', (e) => this.filterSites(e.target.value));
        this.saveBtn.addEventListener('click', () => this.saveSubscription());
        this.selectAllBtn.addEventListener('click', () => this.selectAllSites());
        this.clearAllBtn.addEventListener('click', () => this.clearAllSites());
        this.testNotificationBtn.addEventListener('click', () => this.sendTestNotification());
        this.manageSubscriptionsBtn.addEventListener('click', () => this.showSubscriptionManagement());
        this.editSubscriptionsBtn.addEventListener('click', () => this.startEditMode());
        this.saveSubscriptionsBtn.addEventListener('click', () => this.saveSubscriptionChanges());
        this.cancelEditBtn.addEventListener('click', () => this.cancelEditMode());
        
        this.filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.filterByCategory(e.target.dataset.category));
        });
    }

    async initialize() {
        try {
            console.log('🚀 앱 초기화 시작...');
            
            // Firebase 초기화 대기
            await this.initializeFirebase();
            
            // 알림 지원 여부 확인
            await this.checkMessagingSupport();
            
            // 권한 상태 확인
            await this.checkNotificationPermission();
            
            // 사이트 목록 로드
            await this.loadSites();
            
            this.hideLoading();
            console.log('✅ 앱 초기화 완료');
            
        } catch (error) {
            console.error('❌ 앱 초기화 실패:', error);
            this.showError('앱 초기화에 실패했습니다: ' + error.message);
        }
    }

    async initializeFirebase() {
        // Firebase v9+ 로드 대기
        let retries = 0;
        const maxRetries = 20;
        
        while (!window.firebaseV9 && retries < maxRetries) {
            console.log(`⏳ Firebase v9+ 로드 대기... (${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (!window.firebaseV9) {
            throw new Error('Firebase v9+ SDK 로드 실패');
        }

        // EnvironmentConfig 로드 대기
        let configRetries = 0;
        const maxConfigRetries = 20;
        
        while (!window.EnvironmentConfig && configRetries < maxConfigRetries) {
            console.log(`⏳ EnvironmentConfig 로드 대기... (${configRetries + 1}/${maxConfigRetries})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            configRetries++;
        }
        
        if (!window.EnvironmentConfig) {
            throw new Error('EnvironmentConfig 로드 실패');
        }
        
        // Firebase 앱 초기화
        const firebaseConfig = window.EnvironmentConfig.getFirebaseConfig();
        firebaseApp = window.firebaseV9.initializeApp(firebaseConfig);
        console.log('✅ Firebase 앱 초기화 완료:', firebaseConfig.projectId);
        
        return firebaseApp;
    }

    async checkMessagingSupport() {
        try {
            // 메시징 지원 여부 확인 (공식 문서 권장)
            const isMessagingSupported = await window.firebaseV9.isSupported();
            
            if (!isMessagingSupported) {
                throw new Error('이 브라우저는 FCM을 지원하지 않습니다.');
            }
            
            // 메시징 인스턴스 초기화
            messaging = window.firebaseV9.getMessaging(firebaseApp);
            console.log('✅ Firebase Messaging 초기화 완료');
            
            // 포그라운드 메시지 리스너 설정
            this.setupForegroundMessaging();
            
        } catch (error) {
            console.error('❌ 메시징 지원 확인 실패:', error);
            throw error;
        }
    }

    setupForegroundMessaging() {
        if (!messaging) return;
        
        // 공식 문서 권장 방식: onMessage 사용
        window.firebaseV9.onMessage(messaging, (payload) => {
            console.log('🔔 포그라운드 메시지 수신:', payload);
            
            const { title, body, icon } = payload.notification || {};
            const { url, siteId } = payload.data || {};
            
            // 브라우저 알림 표시
            if (title && body) {
                this.showBrowserNotification(title, body, icon, url);
            }
            
            // UI 업데이트
            this.showSuccess(`새 공지: ${title}`);
        });
        
        console.log('✅ 포그라운드 메시지 리스너 설정 완료');
    }

    showBrowserNotification(title, body, icon, url) {
        if (Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: icon || '/icon-192.png',
                badge: '/badge-72.png',
                tag: 'cuk-notice',
                requireInteraction: true,
                actions: url ? [
                    { action: 'open', title: '공지 보기' }
                ] : []
            });

            notification.onclick = () => {
                if (url) {
                    window.open(url, '_blank');
                }
                notification.close();
            };
        }
    }

    async checkNotificationPermission() {
        const permission = Notification.permission;
        console.log('🔔 현재 알림 권한:', permission);
        
        if (permission === 'granted') {
            await this.getFirebaseToken();
            this.showSubscriptionCard();
        } else if (permission === 'denied') {
            this.showPermissionCard();
            this.showError('알림이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.');
        } else {
            this.showPermissionCard();
        }
    }

    async requestNotificationPermission() {
        try {
            console.log('🔔 알림 권한 요청...');
            
            // 공식 문서 권장: Notification.requestPermission() 사용
            const permission = await Notification.requestPermission();
            console.log('🔔 알림 권한 응답:', permission);
            
            if (permission === 'granted') {
                this.showSuccess('알림 권한이 허용되었습니다!');
                await this.getFirebaseToken();
                this.showSubscriptionCard();
            } else {
                this.showError('알림 권한이 거부되었습니다.');
            }
            
        } catch (error) {
            console.error('❌ 알림 권한 요청 실패:', error);
            this.showError('알림 권한 요청 중 오류가 발생했습니다: ' + error.message);
        }
    }

    async getFirebaseToken() {
        try {
            if (!messaging) {
                throw new Error('Firebase Messaging이 초기화되지 않았습니다.');
            }
            
            console.log('🎫 FCM 토큰 요청 중...');
            
            // 공식 문서 권장 방식: getToken with vapidKey
            const firebaseConfig = window.EnvironmentConfig.getFirebaseConfig();
            this.fcmToken = await window.firebaseV9.getToken(messaging, {
                vapidKey: firebaseConfig.vapidKey
            });
            
            if (!this.fcmToken) {
                throw new Error('FCM 토큰을 받지 못했습니다.');
            }
            
            console.log('✅ FCM 토큰 획득 성공');
            console.log('토큰 길이:', this.fcmToken.length);
            
        } catch (error) {
            console.error('❌ FCM 토큰 획득 실패:', error);
            
            if (error.code === 'messaging/unsupported-browser') {
                this.showError('이 브라우저는 푸시 알림을 지원하지 않습니다.');
            } else if (error.code === 'messaging/permission-blocked') {
                this.showError('알림 권한이 차단되어 있습니다. 브라우저 설정을 확인해주세요.');
            } else {
                this.showError('푸시 알림 토큰을 가져오는데 실패했습니다: ' + error.message);
            }
            
            throw error;
        }
    }
    
    // 디바이스 토큰을 알림창으로 표시
    showDeviceToken() {
        if (!this.fcmToken) {
            this.showError('FCM 토큰이 없습니다. 알림 권한을 먼저 허용해주세요.');
            return;
        }
        
        // 토큰 복사 버튼이 있는 알림창 생성
        const tokenDialog = document.createElement('div');
        tokenDialog.className = 'token-dialog';
        
        const dialogContent = document.createElement('div');
        dialogContent.className = 'token-dialog-content';
        
        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'token-dialog-header';
        dialogHeader.innerHTML = `
            <h3>디바이스 토큰</h3>
            <button class="token-dialog-close">×</button>
        `;
        
        const tokenDisplay = document.createElement('div');
        tokenDisplay.className = 'token-display';
        
        // 토큰을 더 읽기 쉽게 표시 (앞부분과 뒷부분만)
        const shortToken = this.fcmToken.length > 40 ? 
            `${this.fcmToken.substring(0, 20)}...${this.fcmToken.substring(this.fcmToken.length - 20)}` : 
            this.fcmToken;
            
        tokenDisplay.innerHTML = `
            <p class="token-info">이 토큰은 이 기기에서만 유효합니다. 디버깅 용도로만 사용하세요.</p>
            <div class="token-text">${shortToken}</div>
            <div class="token-length">토큰 길이: ${this.fcmToken.length}자</div>
        `;
        
        const tokenActions = document.createElement('div');
        tokenActions.className = 'token-actions';
        
        const copyButton = document.createElement('button');
        copyButton.className = 'btn btn-primary';
        copyButton.textContent = '토큰 복사';
        copyButton.onclick = () => {
            navigator.clipboard.writeText(this.fcmToken)
                .then(() => {
                    this.showSuccess('토큰이 클립보드에 복사되었습니다.');
                    tokenDialog.remove();
                })
                .catch(err => {
                    this.showError('토큰 복사 실패: ' + err.message);
                });
        };
        
        const fullTokenButton = document.createElement('button');
        fullTokenButton.className = 'btn btn-secondary';
        fullTokenButton.textContent = '전체 토큰 보기';
        fullTokenButton.onclick = () => {
            tokenDisplay.querySelector('.token-text').textContent = this.fcmToken;
            fullTokenButton.style.display = 'none';
        };
        
        tokenActions.appendChild(copyButton);
        tokenActions.appendChild(fullTokenButton);
        
        dialogContent.appendChild(dialogHeader);
        dialogContent.appendChild(tokenDisplay);
        dialogContent.appendChild(tokenActions);
        tokenDialog.appendChild(dialogContent);
        
        // 닫기 버튼 이벤트
        const closeButton = dialogContent.querySelector('.token-dialog-close');
        closeButton.onclick = () => tokenDialog.remove();
        
        // 배경 클릭 시 닫기
        tokenDialog.onclick = (e) => {
            if (e.target === tokenDialog) {
                tokenDialog.remove();
            }
        };
        
        document.body.appendChild(tokenDialog);
    }

    async loadSites() {
        try {
            const apiConfig = window.EnvironmentConfig.getApiConfig();
            console.log('📚 사이트 목록 로드 시도:', apiConfig.baseUrl);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);

            const response = await fetch(`${apiConfig.baseUrl}/sites`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success && data.data) {
                this.allSites = data.data.reduce((acc, site) => {
                    acc[site.id] = site;
                    return acc;
                }, {});
                
                console.log('✅ 사이트 목록 로드 완료:', Object.keys(this.allSites).length, '개');
                this.renderSites();
            } else {
                throw new Error('사이트 데이터 형식이 올바르지 않습니다.');
            }
            
        } catch (error) {
            console.error('❌ 사이트 목록 로드 실패:', error);
            
            if (error.name === 'AbortError') {
                this.showError('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
            } else if (error.message.includes('HTTP 5')) {
                this.showError('서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.');
            } else {
                this.showError('학과 목록을 불러오는데 실패했습니다: ' + error.message);
            }
            
            this.loadFallbackSites();
        }
    }

    loadFallbackSites() {
        // 기본 사이트 목록
        this.allSites = {
            'catholic_notice': { id: 'catholic_notice', name: '가톨릭대학교 공지사항', category: 'general' },
            'dept_ai': { id: 'dept_ai', name: 'AI학과', category: 'department' },
            'dept_computer': { id: 'dept_computer', name: '컴퓨터정보공학부', category: 'department' }
        };
        
        console.log('⚠️ 기본 사이트 목록 사용');
        this.renderSites();
    }

    renderSites() {
        const sites = this.getFilteredSites();
        
        if (sites.length === 0) {
            this.sitesContainer.innerHTML = `
                <div class="no-results">
                    <p>검색 결과가 없습니다.</p>
                    <p>다른 검색어나 필터를 시도해보세요.</p>
                </div>
            `;
            return;
        }
        
        this.sitesContainer.innerHTML = sites.map(site => `
            <div class="site-item" data-site-id="${site.id}">
                <div class="site-checkbox">
                    <input type="checkbox" id="site-${site.id}" class="site-checkbox-input" value="${site.id}">
                    <label for="site-${site.id}" class="site-label">
                        <span class="site-name">${site.name}</span>
                        <span class="site-category">${this.getCategoryName(site.category)}</span>
                    </label>
                </div>
            </div>
        `).join('');

        // 체크박스 이벤트 리스너 추가
        this.sitesContainer.querySelectorAll('.site-checkbox-input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const siteId = e.target.value;
                const siteItem = e.target.closest('.site-item');
                
                if (e.target.checked) {
                    this.selectedSites.add(siteId);
                    if (siteItem) siteItem.classList.add('selected');
                } else {
                    this.selectedSites.delete(siteId);
                    if (siteItem) siteItem.classList.remove('selected');
                }
                this.updateSelectedCount();
            });
        });
        
        // 전체 사이트 아이템에 클릭 이벤트 추가 (모바일 터치 경험 개선)
        this.sitesContainer.querySelectorAll('.site-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // 체크박스 자체를 클릭한 경우는 처리하지 않음
                if (e.target.type === 'checkbox') return;
                
                const siteId = item.dataset.siteId;
                const checkbox = item.querySelector(`input[value="${siteId}"]`);
                
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    
                    // 체인지 이벤트 수동 발생
                    const event = new Event('change');
                    checkbox.dispatchEvent(event);
                }
            });
        });

        // 이미 선택된 사이트들 체크 상태로 표시
        this.selectedSites.forEach(siteId => {
            const checkbox = this.sitesContainer.querySelector(`input[value="${siteId}"]`);
            const siteItem = checkbox?.closest('.site-item');
            
            if (checkbox) {
                checkbox.checked = true;
                if (siteItem) siteItem.classList.add('selected');
            }
        });

        this.updateSelectedCount();
    }

    getFilteredSites() {
        let sites = Object.values(this.allSites);
        
        // 카테고리 필터
        if (this.currentCategory !== 'all') {
            sites = sites.filter(site => site.category === this.currentCategory);
        }
        
        // 검색 필터
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            sites = sites.filter(site => 
                site.name.toLowerCase().includes(searchTerm)
            );
        }
        
        return sites.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }

    getCategoryName(category) {
        const categoryNames = {
            'general': '일반',
            'department': '학과',
            'graduate': '대학원'
        };
        return categoryNames[category] || category;
    }

    filterSites(searchTerm) {
        this.renderSites();
    }

    filterByCategory(category) {
        this.currentCategory = category;
        
        // 탭 활성화 상태 업데이트
        this.filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        this.renderSites();
    }

    selectAllSites() {
        const visibleCheckboxes = this.sitesContainer.querySelectorAll('.site-checkbox');
        visibleCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedSites.add(checkbox.value);
        });
        this.updateSelectedCount();
    }

    clearAllSites() {
        const visibleCheckboxes = this.sitesContainer.querySelectorAll('.site-checkbox');
        visibleCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            this.selectedSites.delete(checkbox.value);
        });
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        this.selectedCountSpan.textContent = `선택됨: ${this.selectedSites.size}개`;
        this.saveBtn.disabled = this.selectedSites.size === 0;
        
        // 선택된 항목이 있으면 저장 버튼 활성화 및 스타일 변경
        if (this.selectedSites.size > 0) {
            this.saveBtn.classList.add('btn-active');
        } else {
            this.saveBtn.classList.remove('btn-active');
        }
    }

    async saveSubscription() {
        if (!this.fcmToken) {
            this.showError('FCM 토큰이 없습니다. 알림 권한을 다시 확인해주세요.');
            return;
        }

        if (this.selectedSites.size === 0) {
            this.showError('구독할 학과를 선택해주세요.');
            return;
        }

        try {
            this.saveBtn.disabled = true;
            this.saveBtn.textContent = '저장 중...';

            const subscriptionData = {
                token: this.fcmToken,
                siteIds: Array.from(this.selectedSites),
                platform: navigator.platform || 'unknown',
                userAgent: navigator.userAgent.substring(0, 100)
            };

            console.log('💾 구독 정보 저장 요청:', {
                token: this.fcmToken.substring(0, 20) + '...',
                siteIds: subscriptionData.siteIds,
                platform: subscriptionData.platform
            });

            const apiConfig = window.EnvironmentConfig.getApiConfig();
            const response = await fetch(`${apiConfig.baseUrl}/subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(subscriptionData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess(`구독이 완료되었습니다! (${this.selectedSites.size}개 학과)`);
                console.log('✅ 구독 저장 성공');
            } else {
                throw new Error(result.message || '구독 저장에 실패했습니다.');
            }

        } catch (error) {
            console.error('❌ 구독 저장 실패:', error);
            this.showError('구독 저장에 실패했습니다: ' + error.message);
        } finally {
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = '구독 저장';
        }
    }

    async sendTestNotification() {
        if (!this.fcmToken) {
            this.showError('FCM 토큰이 없습니다.');
            return;
        }

        try {
            this.testNotificationBtn.disabled = true;
            this.testNotificationBtn.textContent = '전송 중...';

            const apiConfig = window.EnvironmentConfig.getApiConfig();
            const response = await fetch(`${apiConfig.baseUrl}/test-notification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: this.fcmToken,
                    title: '테스트 알림',
                    body: 'CUK 공지사항 알리미 테스트입니다.',
                    url: window.location.href
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('테스트 알림이 전송되었습니다!');
            } else {
                throw new Error(result.message || '테스트 알림 전송에 실패했습니다.');
            }

        } catch (error) {
            console.error('❌ 테스트 알림 전송 실패:', error);
            this.showError('테스트 알림 전송에 실패했습니다: ' + error.message);
        } finally {
            this.testNotificationBtn.disabled = false;
            this.testNotificationBtn.textContent = '테스트 알림';
        }
    }

    showPermissionCard() {
        this.permissionCard.classList.remove('hidden');
        this.subscriptionCard.classList.add('hidden');
    }

    showSubscriptionCard() {
        this.permissionCard.classList.add('hidden');
        this.subscriptionCard.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingState.classList.add('hidden');
    }

    showMessage(message, type = 'info') {
        // 메시지 영역이 숨겨져 있으면 표시
        this.messageArea.classList.remove('hidden');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        // 메시지 내용
        const messageContent = document.createElement('span');
        messageContent.textContent = message;
        messageDiv.appendChild(messageContent);
        
        // 닫기 버튼
        const closeButton = document.createElement('button');
        closeButton.className = 'message-close';
        closeButton.innerHTML = '×';
        closeButton.setAttribute('aria-label', '메시지 닫기');
        closeButton.onclick = () => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
                
                // 메시지가 더 이상 없으면 메시지 영역 숨기기
                if (this.messageArea.children.length === 0) {
                    this.messageArea.classList.add('hidden');
                }
            }
        };
        messageDiv.appendChild(closeButton);
        
        this.messageArea.appendChild(messageDiv);
        
        // 3초 후 메시지 제거
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
                
                // 메시지가 더 이상 없으면 메시지 영역 숨기기
                if (this.messageArea.children.length === 0) {
                    this.messageArea.classList.add('hidden');
                }
            }
        }, 3000);
    }

    showError(message) {
        this.showMessage(message, 'error');
        console.error('🚨 에러:', message);
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
        console.log('✅ 성공:', message);
    }

    showWarning(message) {
        this.showMessage(message, 'warning');
        console.warn('⚠️ 경고:', message);
    }

    // 구독 관리 기능들
    async showSubscriptionManagement() {
        if (!this.fcmToken) {
            this.showError('FCM 토큰이 없습니다. 알림 권한을 먼저 허용해주세요.');
            return;
        }

        try {
            this.showLoading('구독 정보를 불러오는 중...');
            
            const apiConfig = window.EnvironmentConfig.getApiConfig();
            const response = await fetch(`${apiConfig.baseUrl}/user/subscription/${this.fcmToken}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.userSubscriptions = result.data.sites;
                this.renderSubscriptionList(result.data);
                this.showSubscriptionCard();
            } else {
                throw new Error(result.error || '구독 정보를 불러오는데 실패했습니다.');
            }

        } catch (error) {
            console.error('❌ 구독 정보 조회 실패:', error);
            this.showError('구독 정보를 불러오는데 실패했습니다: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderSubscriptionList(subscriptionData) {
        if (!this.subscriptionList) return;

        const { sites, siteDetails, totalSites, subscribedAt, lastUpdated } = subscriptionData;
        
        this.subscriptionList.innerHTML = `
            <div class="subscription-header">
                <h3>📋 내 구독 목록</h3>
                <div class="subscription-stats">
                    <span class="stat-item">총 ${totalSites}개 학과</span>
                    <span class="stat-item">구독일: ${new Date(subscribedAt).toLocaleDateString()}</span>
                </div>
            </div>
            
            <div class="subscription-list">
                ${siteDetails.map(site => `
                    <div class="subscription-item" data-site-id="${site.siteId}">
                        <div class="site-info">
                            <h4>${this.getSiteName(site.siteId)}</h4>
                            <p class="site-details">
                                최신글: ${site.lastTitle || '정보 없음'}<br>
                                게시물 수: ${site.postCount}개
                            </p>
                        </div>
                        <div class="site-actions">
                            <button class="btn-remove" onclick="notificationApp.removeSubscription('${site.siteId}')">
                                구독 해제
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="subscription-actions">
                <button id="edit-subscriptions" class="btn-primary">구독 수정</button>
                <button id="delete-all-subscriptions" class="btn-danger" onclick="notificationApp.deleteAllSubscriptions()">
                    전체 구독 해제
                </button>
            </div>
        `;

        // 이벤트 리스너 재등록
        this.editSubscriptionsBtn = document.getElementById('edit-subscriptions');
        if (this.editSubscriptionsBtn) {
            this.editSubscriptionsBtn.addEventListener('click', () => this.startEditMode());
        }
    }

    getSiteName(siteId) {
        const site = this.allSites[siteId];
        return site ? site.name : siteId;
    }

    startEditMode() {
        this.isEditingMode = true;
        this.showSubscriptionCard();
        this.selectedSites = new Set(this.userSubscriptions);
        this.renderSites();
        this.updateSelectedCount();
        
        // UI 변경
        if (this.editSubscriptionsBtn) this.editSubscriptionsBtn.style.display = 'none';
        if (this.saveSubscriptionsBtn) this.saveSubscriptionsBtn.style.display = 'inline-block';
        if (this.cancelEditBtn) this.cancelEditBtn.style.display = 'inline-block';
    }

    cancelEditMode() {
        this.isEditingMode = false;
        this.selectedSites.clear();
        this.showSubscriptionManagement();
        
        // UI 변경
        if (this.editSubscriptionsBtn) this.editSubscriptionsBtn.style.display = 'inline-block';
        if (this.saveSubscriptionsBtn) this.saveSubscriptionsBtn.style.display = 'none';
        if (this.cancelEditBtn) this.cancelEditBtn.style.display = 'none';
    }

    async saveSubscriptionChanges() {
        if (!this.fcmToken) {
            this.showError('FCM 토큰이 없습니다.');
            return;
        }

        try {
            this.saveSubscriptionsBtn.disabled = true;
            this.saveSubscriptionsBtn.textContent = '저장 중...';

            const apiConfig = window.EnvironmentConfig.getApiConfig();
            const response = await fetch(`${apiConfig.baseUrl}/user/subscription/${this.fcmToken}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    siteIds: Array.from(this.selectedSites)
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('구독이 성공적으로 업데이트되었습니다!');
                this.userSubscriptions = result.data.sites;
                this.cancelEditMode();
            } else {
                throw new Error(result.error || '구독 업데이트에 실패했습니다.');
            }

        } catch (error) {
            console.error('❌ 구독 업데이트 실패:', error);
            this.showError('구독 업데이트에 실패했습니다: ' + error.message);
        } finally {
            this.saveSubscriptionsBtn.disabled = false;
            this.saveSubscriptionsBtn.textContent = '구독 저장';
        }
    }

    async removeSubscription(siteId) {
        if (!this.fcmToken) {
            this.showError('FCM 토큰이 없습니다.');
            return;
        }

        if (!confirm(`${this.getSiteName(siteId)} 구독을 해제하시겠습니까?`)) {
            return;
        }

        try {
            const updatedSites = this.userSubscriptions.filter(id => id !== siteId);
            
            const apiConfig = window.EnvironmentConfig.getApiConfig();
            const response = await fetch(`${apiConfig.baseUrl}/user/subscription/${this.fcmToken}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    siteIds: updatedSites
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess(`${this.getSiteName(siteId)} 구독이 해제되었습니다.`);
                this.userSubscriptions = updatedSites;
                this.showSubscriptionManagement(); // 목록 새로고침
            } else {
                throw new Error(result.error || '구독 해제에 실패했습니다.');
            }

        } catch (error) {
            console.error('❌ 구독 해제 실패:', error);
            this.showError('구독 해제에 실패했습니다: ' + error.message);
        }
    }

    async deleteAllSubscriptions() {
        if (!this.fcmToken) {
            this.showError('FCM 토큰이 없습니다.');
            return;
        }

        if (!confirm('모든 구독을 해제하시겠습니까?')) {
            return;
        }

        try {
            const apiConfig = window.EnvironmentConfig.getApiConfig();
            const response = await fetch(`${apiConfig.baseUrl}/user/subscription/${this.fcmToken}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showSuccess('모든 구독이 해제되었습니다.');
                this.userSubscriptions = [];
                this.showPermissionCard(); // 권한 요청 화면으로 돌아가기
            } else {
                throw new Error(result.error || '구독 삭제에 실패했습니다.');
            }

        } catch (error) {
            console.error('❌ 구독 삭제 실패:', error);
            this.showError('구독 삭제에 실패했습니다: ' + error.message);
        }
    }
}

// Service Worker 등록 (공식 문서 권장 방식)
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('✅ Service Worker 등록 성공:', registration.scope);
            return registration;
        } catch (error) {
            console.error('❌ Service Worker 등록 실패:', error);
            throw error;
        }
    } else {
        throw new Error('Service Worker를 지원하지 않는 브라우저입니다.');
    }
}

// 모바일 네비게이션 처리
class MobileNavigation {
    constructor(app) {
        this.app = app;
        this.navHome = document.getElementById('nav-home');
        this.navSubscribe = document.getElementById('nav-subscribe');
        this.navManage = document.getElementById('nav-manage');
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        if (this.navHome) {
            this.navHome.addEventListener('click', (e) => {
                e.preventDefault();
                this.setActiveNav('home');
                this.app.showSubscriptionForm();
            });
        }
        
        if (this.navSubscribe) {
            this.navSubscribe.addEventListener('click', (e) => {
                e.preventDefault();
                this.setActiveNav('subscribe');
                this.app.showSubscriptionForm();
            });
        }
        
        if (this.navManage) {
            this.navManage.addEventListener('click', (e) => {
                e.preventDefault();
                this.setActiveNav('manage');
                this.app.showSubscriptionManagement();
            });
        }
        
        // 토큰 버튼 이벤트 리스너 추가
        const navToken = document.getElementById('nav-token');
        if (navToken) {
            navToken.addEventListener('click', (e) => {
                e.preventDefault();
                this.setActiveNav('token');
                this.app.showDeviceToken();
            });
        }
        
        // 푸터의 알림 테스트 버튼 이벤트 리스너 추가
        const testNotificationFooter = document.getElementById('test-notification-footer');
        if (testNotificationFooter) {
            testNotificationFooter.addEventListener('click', (e) => {
                e.preventDefault();
                this.app.sendTestNotification();
            });
        }
    }
    
    setActiveNav(navId) {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        const activeNav = document.getElementById(`nav-${navId}`);
        if (activeNav) {
            activeNav.classList.add('active');
        }
    }
}

// NotificationApp 클래스에 새 메소드 추가
NotificationApp.prototype.showSubscriptionForm = function() {
    this.subscriptionForm.classList.remove('hidden');
    this.subscriptionList.classList.add('hidden');
    document.querySelector('.subscription-edit-actions').classList.add('hidden');
};

// 앱 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Service Worker 등록
        await registerServiceWorker();
        
        // 메인 앱 초기화
        const app = new NotificationApp();
        
        // 모바일 네비게이션 초기화
        const mobileNav = new MobileNavigation(app);
        
        // 전역에서 접근 가능하도록 설정 (디버깅용)
        window.notificationApp = app;
        window.mobileNav = mobileNav;
        
    } catch (error) {
        console.error('❌ 앱 시작 실패:', error);
        
        // 기본 에러 메시지 표시
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h3>앱 시작 실패</h3>
            <p>${error.message}</p>
            <button onclick="location.reload()">새로고침</button>
        `;
        document.body.appendChild(errorDiv);
    }
});