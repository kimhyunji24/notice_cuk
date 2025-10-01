<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import firebaseService from '@/services/firebase'
import BottomNavigation from '@/components/BottomNavigation.vue'

const subscriptionStore = useSubscriptionStore()

const subscriptions = computed(() => subscriptionStore.subscriptions)
const sites = computed(() => subscriptionStore.sites)
const isLoading = computed(() => subscriptionStore.isLoading)
const error = computed(() => subscriptionStore.error)

onMounted(async () => {
  await subscriptionStore.initialize()
})

const unsubscribe = async (subscriptionId: number) => {
  if (confirm('정말 구독을 해제하시겠습니까?')) {
    try {
      await subscriptionStore.unsubscribeFromSite(subscriptionId)
      alert('구독이 해제되었습니다.')
    } catch (err) {
      alert('구독 해제에 실패했습니다.')
    }
  }
}

const testNotification = async () => {
  try {
    // FCM 토큰이 없으면 알림 권한 요청
    if (!subscriptionStore.fcmToken) {
      const success = await subscriptionStore.requestNotificationPermission()
      if (!success) {
        alert('알림 권한이 필요합니다. 먼저 알림 권한을 허용해주세요.')
        return
      }
    }
    
    await subscriptionStore.sendTestNotification()
    alert('테스트 알림이 발송되었습니다!')
  } catch (err) {
    alert('테스트 알림 발송에 실패했습니다.')
  }
}

const subscribeToSite = async (siteId: string) => {
  try {
    // FCM 토큰이 없으면 알림 권한 요청
    if (!subscriptionStore.fcmToken) {
      console.log('FCM 토큰이 없어서 알림 권한 요청 시작...')
      
      // 1. 알림 권한 확인
      if (!('Notification' in window)) {
        alert('이 브라우저는 알림을 지원하지 않습니다.')
        return
      }
      
      // 2. 권한이 이미 허용되어 있는지 확인
      if (Notification.permission === 'granted') {
        console.log('알림 권한이 이미 허용되어 있습니다.')
      } else {
        const permission = await Notification.requestPermission()
        console.log('알림 권한 상태:', permission)
        
        if (permission !== 'granted') {
          alert('알림 권한이 거부되었습니다. 브라우저 설정에서 알림을 허용해주세요.')
          return
        }
      }
      
      // 3. FCM 토큰 요청
      const fcmToken = await firebaseService.requestPermissionAndGetToken()
      const deviceId = firebaseService.getDeviceId()

      console.log('FCM 토큰:', fcmToken)
      console.log('디바이스 ID:', deviceId)

      if (fcmToken && deviceId) {
        // 스토어에 토큰 업데이트
        subscriptionStore.updateTokens(fcmToken, deviceId)
        console.log('토큰이 업데이트되었습니다.')
      } else {
        alert('FCM 토큰을 생성할 수 없습니다. Firebase 설정을 확인해주세요.')
        return
      }
    }
    
    await subscriptionStore.subscribeToSite(siteId)
    alert('구독이 완료되었습니다!')
  } catch (err) {
    console.error('구독 실패:', err)
    alert('구독에 실패했습니다.')
  }
}

const isSubscribed = (siteId: string) => {
  return subscriptions.value.some(sub => sub.siteId === siteId && sub.isActive)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const runCrawler = async () => {
  try {
    await subscriptionStore.runCrawler()
    alert('크롤링이 완료되었습니다!')
  } catch (err) {
    alert('크롤링 실행에 실패했습니다.')
  }
}
</script>

<template>
  <div class="subscriptions">
    <header class="header">
      <h1 class="title">구독 관리</h1>
      <p class="subtitle">{{ subscriptions.length }}개 사이트 구독 중</p>
      <div class="header-actions">
        <button @click="testNotification" class="test-notification-btn" :disabled="isLoading">
          테스트 알림
        </button>
        <button @click="runCrawler" class="crawl-btn" :disabled="isLoading">
          크롤링 실행
        </button>
      </div>
    </header>

    <main class="main-content">
      <div v-if="isLoading" class="loading">
        구독 목록을 불러오는 중...
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else-if="subscriptions.length === 0" class="empty">
        <div class="empty-content">
          <div class="empty-icon">🔔</div>
          <h3>구독 중인 사이트가 없습니다</h3>
          <p>홈 화면에서 관심 있는 사이트를 구독해보세요!</p>
        </div>
      </div>
      
      <!-- 구독 가능한 사이트 목록 -->
      <div v-if="sites.length > 0" class="available-sites">
        <h3 class="section-title">구독 가능한 사이트</h3>
        <div class="site-list">
          <div 
            v-for="site in sites" 
            :key="site.id" 
            class="site-item"
          >
            <div class="site-info">
              <h4 class="site-name">{{ site.name }}</h4>
              <p class="site-url">{{ site.url }}</p>
            </div>
            <button 
              v-if="!isSubscribed(site.id)"
              @click="subscribeToSite(site.id)"
              class="subscribe-btn"
            >
              구독하기
            </button>
            <span v-else class="subscribed-badge">
              구독 중
            </span>
          </div>
        </div>
      </div>
      
      <div v-else class="subscription-list">
        <div 
          v-for="subscription in subscriptions" 
          :key="subscription.id" 
          class="subscription-card"
        >
          <div class="subscription-info">
            <h3 class="site-name">{{ subscription.siteName }}</h3>
            <p class="subscription-date">
              구독일: {{ formatDate(subscription.createdAt) }}
            </p>
            <p v-if="subscription.lastNotified" class="last-notified">
              마지막 알림: {{ formatDate(subscription.lastNotified) }}
            </p>
          </div>
          
          <div class="subscription-actions">
            <button 
              @click="unsubscribe(subscription.id)"
              :disabled="isLoading"
              class="unsubscribe-btn"
            >
              구독 해제
            </button>
          </div>
        </div>
      </div>
    </main>

    <BottomNavigation />
  </div>
</template>

<style scoped>
.subscriptions {
  min-height: 100vh;
  padding-bottom: 80px;
  background: #f8f9fa;
}

.header {
  background: white;
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #e9ecef;
  text-align: center;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 1rem;
}

.test-notification-btn, .crawl-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.test-notification-btn {
  background: #007bff;
  color: white;
}

.test-notification-btn:hover:not(:disabled) {
  background: #0056b3;
}

.crawl-btn {
  background: #28a745;
  color: white;
}

.crawl-btn:hover:not(:disabled) {
  background: #1e7e34;
}

.test-notification-btn:disabled, .crawl-btn:disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  font-size: 1rem;
  color: #666;
  margin: 0;
}

.main-content {
  padding: 1rem;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #e74c3c;
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.empty-content {
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-content h3 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
  color: #333;
}

.empty-content p {
  font-size: 0.9rem;
  margin: 0;
}

.available-sites {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

.site-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.site-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.site-info {
  flex: 1;
}

.site-name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: #333;
}

.site-url {
  font-size: 0.875rem;
  color: #666;
  margin: 0;
}

.subscribe-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.subscribe-btn:hover {
  background: #45a049;
}

.subscribed-badge {
  background: #e8f5e8;
  color: #4CAF50;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.subscription-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.subscription-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.subscription-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.subscription-info {
  margin-bottom: 1rem;
}

.site-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.subscription-date, .last-notified {
  font-size: 0.9rem;
  color: #666;
  margin: 0 0 0.25rem 0;
}

.subscription-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.test-btn, .unsubscribe-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.test-btn {
  background: #6c757d;
  color: white;
}

.test-btn:hover:not(:disabled) {
  background: #545b62;
}

.unsubscribe-btn {
  background: #dc3545;
  color: white;
}

.unsubscribe-btn:hover:not(:disabled) {
  background: #c82333;
}

.test-btn:disabled, .unsubscribe-btn:disabled {
  background: #e9ecef;
  color: #6c757d;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .subscription-actions {
    flex-direction: column;
  }
  
  .test-btn, .unsubscribe-btn {
    width: 100%;
  }
}
</style>
