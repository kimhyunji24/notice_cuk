<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useNoticeStore } from '@/stores/notice'
import { useSubscriptionStore } from '@/stores/subscription'
import firebaseService from '@/services/firebase'
import SiteList from '@/components/SiteList.vue'
import NoticeList from '@/components/NoticeList.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'

const noticeStore = useNoticeStore()
const subscriptionStore = useSubscriptionStore()

const newNoticesCount = computed(() => {
  const count = noticeStore.newNotices.length
  console.log('newNoticesCount 계산됨 (isNew=true인 공지사항):', count)
  return count
})
const activeSubscriptionsCount = computed(() => noticeStore.activeSubscriptions.length)
const isLoading = computed(() => noticeStore.loading)
const error = computed(() => noticeStore.error)
const hasNotificationPermission = computed(() => {
  const hasToken = subscriptionStore.fcmToken !== null
  console.log('hasNotificationPermission 계산됨:', hasToken, '토큰:', subscriptionStore.fcmToken ? '있음' : '없음')
  return hasToken
})

onMounted(async () => {
  // 이미 초기화되었으면 중복 실행 방지
  if (noticeStore.isInitialized) {
    console.log('⚠️ Notice Store가 이미 초기화되었습니다. 중복 초기화를 방지합니다.')
    return
  }
  
  console.log('🏠 HomeView 초기화 시작...')
  
  try {
    await noticeStore.initializeFirebase()
    await noticeStore.fetchNotices()
    await noticeStore.fetchSites()
    await noticeStore.fetchSubscriptions()
    
    // 초기화 후 토큰 상태 확인
    console.log('홈 뷰 초기화 완료 - FCM 토큰:', subscriptionStore.fcmToken ? '있음' : '없음')
    console.log('홈 뷰 초기화 완료 - 디바이스 ID:', subscriptionStore.deviceId)
    
    // 강제로 반응형 업데이트 트리거
    if (subscriptionStore.fcmToken) {
      console.log('토큰이 있으므로 UI 업데이트 트리거')
      // nextTick을 사용하여 DOM 업데이트 후 실행
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('✅ HomeView 초기화 완료')
  } catch (error) {
    console.error('❌ HomeView 초기화 실패:', error)
  }
})

const requestNotificationPermission = async () => {
  try {
    console.log('🔔 알림 권한 요청 시작...')
    
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
      subscriptionStore.fcmToken = fcmToken
      subscriptionStore.deviceId = deviceId
      
      alert('알림이 성공적으로 활성화되었습니다!\n\nFCM 토큰: ' + fcmToken.substring(0, 20) + '...')
      
      // 구독 목록 새로고침
      await subscriptionStore.loadSubscriptions()
    } else {
      alert('알림을 활성화하는 데 실패했습니다.\n\nFirebase 설정을 확인해주세요.')
    }
  } catch (error: any) {
    console.error('Failed to enable notifications:', error)
    alert('알림 활성화 중 오류가 발생했습니다: ' + error.message)
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
  } catch (error: any) {
    console.error('❌ 테스트 알림 전송 오류:', error)
    alert('테스트 알림 전송 중 오류가 발생했습니다.')
  }
}

const createTestNotice = async () => {
  try {
    const testTitle = '🚨 테스트 공지사항 - 알림 기능 테스트 🚨'
    const testUrl = 'https://test.example.com'
    const siteId = 'dept_computer_info' // 컴퓨터정보공학부
    
    // 중복 체크 (제목과 URL로 간단한 중복 체크)
    const existingNotice = noticeStore.notices.find(notice => 
      notice.title === testTitle && notice.url === testUrl
    )
    
    if (existingNotice) {
      console.log('🔄 중복 테스트 공지사항 발견:', existingNotice)
      
      // 기존 공지사항을 isNew=true로 변경하고 목록 새로고침
      const response = await fetch(`http://localhost:8080/api/notices/${existingNotice.id}/mark-new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        console.log('✅ 기존 테스트 공지사항을 isNew=true로 변경했습니다.')
        await noticeStore.fetchNotices(true) // 강제 새로고침
        alert('✅ 기존 테스트 공지사항을 새 공지사항으로 표시했습니다!')
      } else {
        alert('⚠️ 중복된 테스트 공지사항입니다!\n\n이미 같은 제목과 URL의 공지사항이 존재합니다.')
      }
      return
    }
    
    // 백엔드로 테스트 공지사항 생성 요청
    const response = await fetch('http://localhost:8080/api/test-notice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `siteId=${encodeURIComponent(siteId)}&title=${encodeURIComponent(testTitle)}`
    })
    
    if (response.ok) {
      const result = await response.text()
      console.log('✅ 백엔드 테스트 공지사항 생성 성공:', result)
      
      // 프론트엔드에서도 즉시 알림 표시
      if (Notification.permission === 'granted') {
        new Notification('새 공지사항이 등록되었습니다!', {
          body: testTitle,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'aliali-new-notice'
        })
      }
      
      // 공지사항 목록 새로고침
      await noticeStore.fetchNotices()
      
      alert('✅ 백엔드에 테스트 공지사항이 생성되고 푸시 알림이 발송되었습니다!\n\n중복 체크: 통과')
    } else {
      console.error('❌ 백엔드 테스트 공지사항 생성 실패:', response.status)
      alert('백엔드 서버에 연결할 수 없습니다. 프론트엔드에서만 테스트합니다.')
      
      // 백엔드 실패 시 프론트엔드에서만 생성
      const testNotice = {
        id: Date.now(),
        title: testTitle,
        content: '',
        url: testUrl,
        externalId: 'test-' + Date.now(),
        siteId: 'dept_computer_info',
        siteName: '컴퓨터정보공학부',
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isNew: true
      }
      
      noticeStore.notices.unshift(testNotice)
      
      if (Notification.permission === 'granted') {
        new Notification('새 공지사항이 등록되었습니다!', {
          body: testNotice.title,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'aliali-new-notice'
        })
      }
      
      alert('⚠️ 프론트엔드에서만 테스트 공지사항이 생성되었습니다.')
    }
  } catch (error: any) {
    console.error('❌ 테스트 공지사항 생성 오류:', error)
    alert('테스트 공지사항 생성 중 오류가 발생했습니다.')
  }
}

// ==================== 크롤링 관련 메서드 ====================

const manualCrawlAllSites = async () => {
  try {
    console.log('🔧 전체 사이트 수동 크롤링 시작...')
    
    const response = await fetch('http://localhost:8080/api/crawl/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      const result = await response.text()
      console.log('✅ 전체 사이트 크롤링 성공:', result)
      
      // 공지사항 목록 새로고침
      await noticeStore.fetchNotices()
      
      alert('✅ 전체 사이트 크롤링이 완료되었습니다!\n\n새로운 공지사항을 확인해보세요.')
    } else {
      const errorText = await response.text()
      console.error('❌ 전체 사이트 크롤링 실패:', response.status, errorText)
      alert('크롤링 중 오류가 발생했습니다: ' + errorText)
    }
  } catch (error: any) {
    console.error('❌ 전체 사이트 크롤링 오류:', error)
    alert('크롤링 중 오류가 발생했습니다: ' + error.message)
  }
}

const getCrawlingStatus = async () => {
  try {
    console.log('📊 크롤링 상태 확인...')
    
    const response = await fetch('http://localhost:8080/api/crawl/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      const status = await response.json()
      console.log('📊 크롤링 상태:', status)
      
      const statusText = `
📊 크롤링 상태 정보:

🔧 크롤러 설정:
- 활성화: ${status.crawlerEnabled ? '✅' : '❌'}
- 간격: ${status.crawlerInterval / 1000}초
- 동시 처리: ${status.concurrentLimit}개
- 타임아웃: ${status.requestTimeout / 1000}초

📈 사이트 현황:
- 전체 사이트: ${status.totalSitesCount}개
- 활성 사이트: ${status.enabledSitesCount}개

⏰ 마지막 크롤링 시간:
${Object.entries(status.lastCrawledTimes)
  .slice(0, 5)
  .map(([siteId, time]) => `- ${siteId}: ${time}`)
  .join('\n')}
      `.trim()
      
      alert(statusText)
    } else {
      console.error('❌ 크롤링 상태 확인 실패:', response.status)
      alert('크롤링 상태를 확인할 수 없습니다.')
    }
  } catch (error: any) {
    console.error('❌ 크롤링 상태 확인 오류:', error)
    alert('크롤링 상태 확인 중 오류가 발생했습니다: ' + error.message)
  }
}
</script>

<template>
  <div class="home">
    <!-- 헤더 -->
    <header class="header">
      <div class="header-content">
        <h1 class="title">알리알리</h1>
        <p class="subtitle">공지사항 알림 서비스</p>
      </div>
      <div class="stats">
        <div class="stat-item">
          <span class="stat-number">{{ newNoticesCount }}</span>
          <span class="stat-label">새 공지</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ activeSubscriptionsCount }}</span>
          <span class="stat-label">구독 중</span>
        </div>
      </div>
      
      <div class="notification-permission">
        <button 
          v-if="!hasNotificationPermission"
          @click="requestNotificationPermission" 
          class="permission-btn"
        >
          🔔 알림 권한 허용
        </button>
        <button 
          v-else
          @click="sendTestNotification" 
          class="test-btn"
        >
          📢 테스트 알림
        </button>
        <button 
          @click="createTestNotice" 
          class="test-notice-btn"
        >
          📝 테스트 공지사항 생성
        </button>
        <div v-if="hasNotificationPermission" class="permission-status">
          ✅ 알림이 활성화되었습니다
        </div>
      </div>
      
      <!-- 크롤링 컨트롤 -->
      <div class="crawling-controls">
        <h3 class="control-title">🔧 크롤링 관리</h3>
        <div class="control-buttons">
          <button 
            @click="manualCrawlAllSites" 
            class="crawl-btn crawl-all-btn"
          >
            🚀 전체 사이트 크롤링
          </button>
          <button 
            @click="getCrawlingStatus" 
            class="crawl-btn status-btn"
          >
            📊 크롤링 상태 확인
          </button>
        </div>
        <div class="crawl-info">
          <p>💡 자동 크롤링은 10분마다 실행됩니다</p>
          <p>🔧 수동 크롤링으로 즉시 새 공지사항을 확인할 수 있습니다</p>
        </div>
      </div>
    </header>

    <!-- 메인 컨텐츠 -->
    <main class="main-content">
      <div class="section">
        <h2 class="section-title">최신 공지사항</h2>
        <NoticeList />
      </div>
      
      <div class="section">
        <h2 class="section-title">사이트 관리</h2>
        <SiteList />
      </div>
    </main>

    <!-- 하단 네비게이션 -->
    <BottomNavigation />
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  padding-bottom: 80px; /* 하단 네비게이션 공간 */
}

.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem 1rem;
  text-align: center;
}

.header-content {
  margin-bottom: 1.5rem;
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

.stats {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

.notification-permission {
  margin-top: 1rem;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.permission-btn, .test-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.permission-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.test-btn {
  background: rgba(33, 150, 243, 0.8);
  border-color: rgba(33, 150, 243, 0.9);
}

.test-btn:hover {
  background: rgba(33, 150, 243, 1);
  border-color: rgba(33, 150, 243, 1);
}

.test-notice-btn {
  background: rgba(255, 107, 107, 0.9);
  color: white;
  border: 2px solid rgba(255, 107, 107, 0.9);
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-left: 10px;
}

.test-notice-btn:hover {
  background: rgba(255, 107, 107, 1);
  border-color: rgba(255, 107, 107, 1);
}

.permission-status {
  color: #28a745;
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 0.5rem;
}

/* 크롤링 컨트롤 스타일 */
.crawling-controls {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  margin-top: 1rem;
  backdrop-filter: blur(10px);
}

.control-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
}

.control-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.crawl-btn {
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 180px;
}

.crawl-all-btn {
  background: #4ecdc4;
  color: white;
}

.crawl-all-btn:hover {
  background: #45b7b8;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
}

.status-btn {
  background: #95a5a6;
  color: white;
}

.status-btn:hover {
  background: #7f8c8d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(149, 165, 166, 0.3);
}

.crawl-info {
  text-align: center;
  font-size: 0.85rem;
  opacity: 0.9;
  line-height: 1.4;
}

.crawl-info p {
  margin: 0.25rem 0;
}

.main-content {
  padding: 1rem;
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

@media (max-width: 768px) {
  .title {
    font-size: 2rem;
  }
  
  .stats {
    gap: 1.5rem;
  }
  
  .stat-number {
    font-size: 1.5rem;
  }
}
</style>
