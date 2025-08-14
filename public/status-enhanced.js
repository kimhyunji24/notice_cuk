/**
 * 개선된 상태 모니터링 페이지
 */

class SystemStatusMonitor {
    constructor() {
        this.envConfig = window.EnvironmentConfig;
        this.apiConfig = this.envConfig.getApiConfig();
        this.autoRefreshInterval = null;
        this.countdownInterval = null;
        this.refreshDelay = 30; // 30초
        this.currentCountdown = this.refreshDelay;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initialize();
    }

    initializeElements() {
        this.loadingEl = document.getElementById('loading');
        this.statusContentEl = document.getElementById('status-content');
        this.errorContentEl = document.getElementById('error-content');
        this.errorMessageEl = document.getElementById('error-message');
        
        this.autoRefreshCheckbox = document.getElementById('auto-refresh');
        this.countdownEl = document.getElementById('countdown');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.retryBtn = document.getElementById('retry-btn');
        this.lastUpdateEl = document.getElementById('last-update');
        
        this.systemBadgeEl = document.getElementById('system-badge');
        this.systemMetricsEl = document.getElementById('system-metrics');
        this.crawlerBadgeEl = document.getElementById('crawler-badge');
        this.crawlerMetricsEl = document.getElementById('crawler-metrics');
        this.subscriptionBadgeEl = document.getElementById('subscription-badge');
        this.subscriptionMetricsEl = document.getElementById('subscription-metrics');
        this.serviceBadgeEl = document.getElementById('service-badge');
        this.serviceMetricsEl = document.getElementById('service-metrics');
        
        this.sitesTbodyEl = document.getElementById('sites-tbody');
    }

    attachEventListeners() {
        this.refreshBtn.addEventListener('click', () => this.loadStatus());
        this.retryBtn.addEventListener('click', () => this.loadStatus());
        this.autoRefreshCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });
    }

    async initialize() {
        await this.loadStatus();
        this.startAutoRefresh();
    }

    async loadStatus() {
        try {
            this.showLoading();
            
            const response = await fetch(`${this.apiConfig.baseUrl}/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: this.apiConfig.timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.renderStatus(data.data);
                this.showStatus();
                this.updateLastUpdate();
            } else {
                throw new Error(data.error || '상태 정보를 불러오는데 실패했습니다.');
            }
            
        } catch (error) {
            console.error('상태 조회 실패:', error);
            this.showError(error.message);
        }
    }

    renderStatus(data) {
        this.allSites = data.crawler.sites; //getMostPopularSite가 this.allSite를 참조하게

        this.renderSystemStatus(data.system, data.health);
        this.renderCrawlerStatus(data.crawler);
        this.renderSubscriptionStatus(data.subscriptions);
        this.renderServiceStatus(data.health);
        this.renderSitesTable(data.crawler.sites);
    }

    renderSystemStatus(system, health) {
        const status = health.overall;
        this.updateStatusCard('system', status);
        
        const metrics = [
            { label: '환경', value: system.environment },
            { label: '리전', value: system.region },
            { label: '업타임', value: this.formatUptime(system.uptime) },
            { label: '메모리 사용량', value: `${system.memoryUsage.used}/${system.memoryUsage.total} MB` }
        ];
        
        this.renderMetrics(this.systemMetricsEl, metrics);
    }

    renderCrawlerStatus(crawler) {
        const totalSites = crawler.totalSites;
        const lastUpdate = crawler.lastUpdate;
        
        // 크롤링 상태 판단 (간단한 휴리스틱)
        const status = lastUpdate ? 'healthy' : 'warning';
        this.updateStatusCard('crawler', status);
        
        const metrics = [
            { label: '총 사이트', value: totalSites },
            { label: '마지막 업데이트', value: this.formatDateTime(lastUpdate) },
            { label: '활성 사이트', value: this.countActiveSites(crawler.sites) }
        ];
        
        this.renderMetrics(this.crawlerMetricsEl, metrics);
    }

    renderSubscriptionStatus(subscriptions) {
        const metrics = [
            { label: '총 구독자', value: subscriptions.totalSubscribers },
            { label: '구독된 사이트', value: Object.keys(subscriptions.siteSubscriptions).length },
            { label: '인기 사이트', value: this.getMostPopularSite(subscriptions.siteSubscriptions) }
        ];
        
        this.renderMetrics(this.subscriptionMetricsEl, metrics);
    }

    renderServiceStatus(health) {
        const status = health.overall;
        this.updateStatusCard('service', status);
        
        const metrics = [
            { label: 'Firestore', value: health.services.firestore ? '정상' : '오류' },
            { label: 'FCM', value: health.services.fcm ? '정상' : '오류' },
            { label: '크롤러', value: health.services.crawler ? '정상' : '오류' }
        ];
        
        this.renderMetrics(this.serviceMetricsEl, metrics);
    }

    renderSitesTable(sites) {
        this.sitesTbodyEl.innerHTML = '';
        
        Object.entries(sites).forEach(([siteId, siteData]) => {
            const row = document.createElement('tr');
            
            const statusClass = siteData.updatedAt ? 'success' : 'warning';
            const lastCrawled = this.formatDateTime(siteData.updatedAt);
            
            row.innerHTML = `
                <td><span class="site-status ${statusClass}"></span></td>
                <td>${siteData.name}</td>
                <td>${siteData.category}</td>
                <td>${lastCrawled}</td>
                <td>${siteData.postCount || 0}</td>
                <td title="${siteData.lastTitle || ''}">${this.truncateText(siteData.lastTitle || '-', 30)}</td>
            `;
            
            this.sitesTbodyEl.appendChild(row);
        });
    }

    renderMetrics(container, metrics) {
        container.innerHTML = '';
        
        metrics.forEach(metric => {
            const row = document.createElement('div');
            row.className = 'metric-row';
            row.innerHTML = `
                <span class="metric-label">${metric.label}:</span>
                <span class="metric-value">${metric.value}</span>
            `;
            container.appendChild(row);
        });
    }

    updateStatusCard(cardType, status) {
        const cardEl = document.getElementById(`${cardType}-status`);
        const badgeEl = document.getElementById(`${cardType}-badge`);
        
        // 카드 클래스 업데이트
        cardEl.className = `status-card ${status}`;
        
        // 배지 업데이트
        badgeEl.className = `status-badge ${status}`;
        badgeEl.textContent = this.getStatusText(status);
    }

    getStatusText(status) {
        const statusTexts = {
            'healthy': '정상',
            'degraded': '주의',
            'unhealthy': '오류'
        };
        return statusTexts[status] || '확인 중';
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}시간 ${minutes}분`;
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`;
        
        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    countActiveSites(sites) {
        return Object.values(sites).filter(site => site.lastCrawledAt).length;
    }

    getMostPopularSite(siteSubscriptions) {
        if (!siteSubscriptions || Object.keys(siteSubscriptions).length === 0) {
            return '-';
        }
        
        const mostPopular = Object.entries(siteSubscriptions)
            .sort(([,a], [,b]) => b - a)[0];
        
        const siteId = mostPopular[0];
        const siteName = this.allSites[siteId] ? this.allSites[siteId].name : siteId;

        return `${siteName} (${mostPopular[1]}명)`;
    }
    truncateText(text, maxLength) {
        if (!text) return '-';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    startAutoRefresh() {
        this.stopAutoRefresh(); // 기존 타이머 정리
        
        this.currentCountdown = this.refreshDelay;
        this.updateCountdown();
        
        this.countdownInterval = setInterval(() => {
            this.currentCountdown--;
            this.updateCountdown();
            
            if (this.currentCountdown <= 0) {
                this.loadStatus();
                this.currentCountdown = this.refreshDelay;
            }
        }, 1000);
    }

    stopAutoRefresh() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        this.countdownEl.textContent = '자동 새로고침 중지됨';
    }

    updateCountdown() {
        this.countdownEl.textContent = `다음 업데이트: ${this.currentCountdown}초`;
    }

    updateLastUpdate() {
        this.lastUpdateEl.textContent = new Date().toLocaleTimeString('ko-KR');
    }

    showLoading() {
        this.loadingEl.classList.remove('hidden');
        this.statusContentEl.classList.add('hidden');
        this.errorContentEl.classList.add('hidden');
    }

    showStatus() {
        this.loadingEl.classList.add('hidden');
        this.statusContentEl.classList.remove('hidden');
        this.errorContentEl.classList.add('hidden');
    }

    showError(message) {
        this.loadingEl.classList.add('hidden');
        this.statusContentEl.classList.add('hidden');
        this.errorContentEl.classList.remove('hidden');
        this.errorMessageEl.textContent = message;
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    new SystemStatusMonitor();
});