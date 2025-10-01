<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import BottomNavigation from '@/components/BottomNavigation.vue'

const subscriptionStore = useSubscriptionStore()

const fcmToken = computed(() => subscriptionStore.fcmToken)
const deviceId = computed(() => subscriptionStore.deviceId)
const isLoading = computed(() => subscriptionStore.isLoading)

onMounted(async () => {
  await subscriptionStore.initialize()
})

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('클립보드에 복사되었습니다!')
  } catch (err) {
    console.error('복사 실패:', err)
    alert('복사에 실패했습니다.')
  }
}

const sendTestNotification = async () => {
  try {
    const fcmToken = subscriptionStore.fcmToken
    const deviceId = subscriptionStore.deviceId

    if (!fcmToken || !deviceId) {
      alert('먼저 알림 권한을 허용해주세요.')
      return
    }

    // 백엔드로 테스트 알림 전송
    const response = await fetch('http://localhost:8080/api/test-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `fcmToken=${encodeURIComponent(fcmToken)}&deviceId=${encodeURIComponent(deviceId)}`
    })
    
    if (response.ok) {
      console.log('✅ Firebase Cloud Messaging 푸시 알림이 전송되었습니다!')
      console.log('포그라운드에서 푸시 알림을 확인해주세요.')
      
      // 포그라운드에서 즉시 알림 표시
      if (Notification.permission === 'granted') {
        new Notification('알리알리 테스트 알림', {
          body: '알리알리 서비스가 정상적으로 작동하고 있습니다!',
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'aliali-test-notification'
        })
      }
      
      alert('푸시 알림이 전송되었습니다!')
    } else {
      console.error('❌ 테스트 알림 전송 실패:', response.status)
      alert('테스트 알림 전송에 실패했습니다.')
    }
  } catch (error) {
    console.error('❌ 테스트 알림 전송 오류:', error)
    alert('테스트 알림 전송 중 오류가 발생했습니다.')
  }
}

const refreshData = async () => {
  await subscriptionStore.loadSites()
  await subscriptionStore.loadNotices()
  await subscriptionStore.loadSubscriptions()
}
</script>

<template>
  <div class="settings">
    <header class="header">
      <h1 class="title">설정</h1>
    </header>

    <main class="main-content">
      <div class="section">
        <h2 class="section-title">디버깅 정보</h2>
        
        <div class="info-card">
          <h3>FCM 토큰</h3>
          <div class="info-content">
            <p class="info-text">{{ fcmToken || '토큰을 가져오는 중...' }}</p>
            <button 
              v-if="fcmToken"
              @click="copyToClipboard(fcmToken)"
              class="copy-btn"
            >
              복사
            </button>
          </div>
        </div>

        <div class="info-card">
          <h3>디바이스 ID</h3>
          <div class="info-content">
            <p class="info-text">{{ deviceId || 'ID를 가져오는 중...' }}</p>
            <button 
              v-if="deviceId"
              @click="copyToClipboard(deviceId)"
              class="copy-btn"
            >
              복사
            </button>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">테스트</h2>
        
        <div class="action-card">
          <h3>테스트 알림 전송</h3>
          <p>현재 FCM 토큰으로 테스트 알림을 전송합니다.</p>
          <button 
            @click="sendTestNotification"
            :disabled="!fcmToken || isLoading"
            class="action-btn"
          >
            {{ isLoading ? '전송 중...' : '알림 전송' }}
          </button>
        </div>

        <div class="action-card">
          <h3>데이터 새로고침</h3>
          <p>서버에서 최신 데이터를 가져옵니다.</p>
          <button 
            @click="refreshData"
            :disabled="isLoading"
            class="action-btn"
          >
            {{ isLoading ? '새로고침 중...' : '새로고침' }}
          </button>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">앱 정보</h2>
        
        <div class="info-card">
          <h3>버전</h3>
          <p class="info-text">1.0.0</p>
        </div>

        <div class="info-card">
          <h3>개발자</h3>
          <p class="info-text">알리알리 팀</p>
        </div>
      </div>
    </main>

    <BottomNavigation />
  </div>
</template>

<style scoped>
.settings {
  min-height: 100vh;
  padding-bottom: 80px;
  background: #f8f9fa;
}

.header {
  background: white;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.main-content {
  padding: 1rem;
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 1rem;
}

.info-card, .action-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-card h3, .action-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.info-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.info-text {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
  word-break: break-all;
  flex: 1;
}

.copy-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: #0056b3;
}

.action-card p {
  font-size: 0.9rem;
  color: #666;
  margin: 0 0 1rem 0;
}

.action-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
}

.action-btn:hover:not(:disabled) {
  background: #1e7e34;
}

.action-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .info-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .copy-btn {
    align-self: flex-end;
  }
}
</style>
