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
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/test-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        fcmToken: fcmToken,
        deviceId: deviceId
      })
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
    const testTitle = 'RealFCMTest: 🚨 테스트 공지사항 - 알림 기능 테스트 🚨'
    const testUrl = 'https://test.example.com'
    const siteId = 'dept_computer_info' // 컴퓨터정보공학부
    
    // 중복 체크 (제목과 URL로 간단한 중복 체크)
    const existingNotice = noticeStore.notices.find(notice => 
      notice.title === testTitle && notice.url === testUrl
    )
    
    if (existingNotice) {
      console.log('🔄 중복 테스트 공지사항 발견:', existingNotice)
      
      // 기존 공지사항을 isNew=true로 변경하고 목록 새로고침
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/notices/${existingNotice.id}/mark-new`, {
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
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/test-notice`, {
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
    
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/crawl/all`, {
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

const getCrawlingStatus = () => {
  // 상태 페이지로 이동
  import('@/router').then(({ default: router }) => {
    router.push('/status')
  })
}
</script>

<template>
  <div class="home">
    <!-- 헤더 영역 -->
    <header class="pt-6 pb-4 sm:pt-8 sm:pb-6 px-4 max-w-7xl mx-auto">
      <div class="mb-6 sm:mb-8 flex items-center gap-3">
        <img src="/AliAli_Logo.png" alt="AliAli Logo" class="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-[#191F28] font-inkliquid">AliAli</h1>
          <p class="text-base sm:text-lg text-[#8B95A1] font-inkliquid">놓치지 않는 공지사항 알림</p>
        </div>
      </div>

      <!-- 상태 카드 그리드 -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div class="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-sm">
          <span class="block text-[#8B95A1] text-xs sm:text-sm mb-1">새 공지</span>
          <span class="block text-2xl sm:text-3xl font-bold text-[#3182F6]">{{ newNoticesCount }}</span>
        </div>
        <div class="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-sm">
          <span class="block text-[#8B95A1] text-xs sm:text-sm mb-1">구독 중</span>
          <span class="block text-2xl sm:text-3xl font-bold text-[#191F28]">{{ activeSubscriptionsCount }}</span>
        </div>
      </div>
      
      <!-- 알림 권한 및 테스트 버튼 -->
      <div class="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-sm mb-4 sm:mb-6">
        <h3 class="text-[#191F28] font-bold mb-3 sm:mb-4">알림 설정</h3>
        <div class="flex flex-wrap gap-2 sm:gap-3">
          <button 
            v-if="!hasNotificationPermission"
            @click="requestNotificationPermission" 
            class="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#3182F6] text-white rounded-xl text-xs sm:text-sm hover:bg-blue-600 transition-colors"
          >
            🔔 알림 권한 허용
          </button>
          <button 
            v-else
            @click="sendTestNotification" 
            class="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#E8F3FF] text-[#3182F6] rounded-xl text-xs sm:text-sm hover:bg-[#DBEDFF] transition-colors"
          >
            📢 테스트 알림
          </button>
          <button 
            @click="createTestNotice" 
            class="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 text-[#4E5968] rounded-xl text-xs sm:text-sm hover:bg-gray-200 transition-colors"
          >
            📝 테스트 공지 생성
          </button>
        </div>
        <div v-if="hasNotificationPermission" class="mt-3 text-sm text-[#3182F6] font-medium flex items-center">
          <span class="mr-1">✅</span> 알림이 활성화되었습니다
        </div>
      </div>
      
      <!-- 관리자 도구 (접기/펼치기 가능하게 하거나 하단으로 이동 추천, 일단 카드화) -->
      <div class="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-4 sm:p-5 shadow-sm">
        <h3 class="text-[#191F28] font-bold mb-3 sm:mb-4">관리자 도구</h3>
        <div class="flex flex-wrap gap-2 sm:gap-3 mb-2 sm:mb-3">
          <button 
            @click="manualCrawlAllSites" 
            class="px-3 py-1.5 sm:px-4 sm:py-2 border border-[#E5E8EB] text-[#4E5968] rounded-xl text-xs sm:text-sm hover:bg-gray-50 transition-colors"
          >
            🚀 전체 크롤링
          </button>
          <button 
            @click="getCrawlingStatus" 
            class="px-3 py-1.5 sm:px-4 sm:py-2 border border-[#E5E8EB] text-[#4E5968] rounded-xl text-xs sm:text-sm hover:bg-gray-50 transition-colors"
          >
            📊 상태 확인
          </button>
        </div>
        <p class="text-xs text-[#8B95A1]">자동 크롤링: 10분 간격</p>
      </div>
    </header>

    <!-- 메인 컨텐츠 -->
    <main class="px-4 pb-24 max-w-7xl mx-auto">
      <div class="mb-6 sm:mb-8">
        <h2 class="text-lg sm:text-xl font-bold text-[#191F28] mb-3 sm:mb-4">최신 공지사항</h2>
        <NoticeList />
      </div>
      
      <div class="mb-6 sm:mb-8">
        <h2 class="text-lg sm:text-xl font-bold text-[#191F28] mb-3 sm:mb-4">사이트 관리</h2>
        <SiteList />
      </div>
    </main>

    <!-- 하단 네비게이션 -->
    <BottomNavigation />
  </div>
</template>

<style scoped>
/* Scoped styles removed in favor of Tailwind utility classes */
</style>
