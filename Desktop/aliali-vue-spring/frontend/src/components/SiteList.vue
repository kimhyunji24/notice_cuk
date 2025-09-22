<script setup lang="ts">
import { computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import firebaseService from '@/services/firebase'

const subscriptionStore = useSubscriptionStore()

const sites = computed(() => subscriptionStore.sites)
const subscriptions = computed(() => subscriptionStore.subscriptions)
const isLoading = computed(() => subscriptionStore.isLoading)
const error = computed(() => subscriptionStore.error)

const isSubscribed = (siteId: string) => {
  return subscriptions.value.some(sub => sub.siteId === siteId && sub.isActive)
}

const getSubscriptionBySiteId = (siteId: string) => {
  return subscriptions.value.find(sub => sub.siteId === siteId && sub.isActive)
}

const toggleSubscription = async (siteId: string) => {
  try {
    const isCurrentlySubscribed = isSubscribed(siteId)
    
    if (isCurrentlySubscribed) {
      const subscription = getSubscriptionBySiteId(siteId)
      if (subscription) {
        await subscriptionStore.unsubscribeFromSite(subscription.id)
        alert('구독이 해제되었습니다.')
      }
    } else {
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
    }
  } catch (err) {
    console.error('구독 토글 실패:', err)
    alert('구독 상태 변경에 실패했습니다.')
  }
}

const testNotification = async (siteId: string) => {
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
</script>

<template>
  <div class="site-list">
    <div v-if="isLoading" class="loading">
      사이트 목록을 불러오는 중...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else-if="sites.length === 0" class="empty">
      등록된 사이트가 없습니다.
    </div>
    
    <div v-else class="sites">
      <div 
        v-for="site in sites" 
        :key="site.id" 
        class="site-card"
      >
        <div class="site-info">
          <h3 class="site-name">{{ site.name }}</h3>
          <p class="site-category">{{ site.category }}</p>
          <p class="site-url">{{ site.url }}</p>
        </div>
        
        <div class="site-actions">
          <button 
            @click="toggleSubscription(site.id)"
            :class="['subscribe-btn', { 'subscribed': isSubscribed(site.id) }]"
          >
            {{ isSubscribed(site.id) ? '구독 중' : '구독하기' }}
          </button>
          
          <button 
            v-if="isSubscribed(site.id)"
            @click="testNotification(site.id)"
            class="test-btn"
          >
            테스트
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.site-list {
  width: 100%;
}

.loading, .error, .empty {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #e74c3c;
}

.sites {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.site-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.site-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.site-info {
  flex: 1;
}

.site-name {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.site-category {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.site-url {
  font-size: 0.8rem;
  color: #999;
  word-break: break-all;
}

.site-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.subscribe-btn, .test-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.subscribe-btn {
  background: #007bff;
  color: white;
}

.subscribe-btn:hover {
  background: #0056b3;
}

.subscribe-btn.subscribed {
  background: #28a745;
}

.subscribe-btn.subscribed:hover {
  background: #1e7e34;
}

.test-btn {
  background: #6c757d;
  color: white;
}

.test-btn:hover {
  background: #545b62;
}

@media (max-width: 768px) {
  .site-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .site-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
