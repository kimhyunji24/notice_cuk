import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { subscriptionApi, type Subscription, type CreateSubscriptionRequest } from '@/api/subscription'
import { siteApi, type Site } from '@/api/site'
import { noticeApi, type Notice } from '@/api/notice'
import firebaseService from '@/services/firebase'

export const useSubscriptionStore = defineStore('subscription', () => {
  // State
  const subscriptions = ref<Subscription[]>([])
  const sites = ref<Site[]>([])
  const notices = ref<Notice[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const fcmToken = ref<string | null>(null)
  const deviceId = ref<string | null>(null)

  // Getters
  const subscribedSites = computed(() => {
    return sites.value.filter(site => 
      subscriptions.value.some(sub => sub.siteId === site.id && sub.isActive)
    )
  })

  const unsubscribedSites = computed(() => {
    return sites.value.filter(site => 
      !subscriptions.value.some(sub => sub.siteId === site.id && sub.isActive)
    )
  })

  const subscriptionsByCategory = computed(() => {
    const grouped: Record<string, Subscription[]> = {}
    subscriptions.value.forEach(sub => {
      const site = sites.value.find(s => s.id === sub.siteId)
      if (site) {
        if (!grouped[site.category]) {
          grouped[site.category] = []
        }
        grouped[site.category].push(sub)
      }
    })
    return grouped
  })

  // Actions
  const initializeFirebase = async () => {
    try {
      deviceId.value = firebaseService.getDeviceId()
      
      // 기존 토큰이 있으면 로드
      const existingToken = await firebaseService.getFCMToken()
      if (existingToken) {
        fcmToken.value = existingToken
        console.log('기존 FCM 토큰 로드:', fcmToken.value)
        console.log('fcmToken.value 설정됨:', fcmToken.value ? '있음' : '없음')
      } else {
        console.log('기존 FCM 토큰 없음')
      }

      // 포그라운드 메시지 리스너 설정
      firebaseService.onMessage((payload) => {
        console.log('포그라운드 메시지 수신:', payload)
        // 필요시 상태 업데이트 또는 다른 처리
      })

    } catch (err) {
      console.error('Firebase 초기화 실패:', err)
      error.value = 'Firebase 초기화에 실패했습니다.'
    }
  }

  const requestNotificationPermission = async () => {
    try {
      console.log('🔔 알림 권한 요청 시작...')
      
      // 알림 권한 요청
      const hasPermission = await firebaseService.requestPermission()
      if (hasPermission) {
        fcmToken.value = await firebaseService.requestPermissionAndGetToken()
        console.log('FCM 토큰 획득:', fcmToken.value)
        return true
      } else {
        console.warn('알림 권한이 거부되었습니다.')
        return false
      }
    } catch (err) {
      console.error('알림 권한 요청 실패:', err)
      error.value = '알림 권한 요청에 실패했습니다.'
      return false
    }
  }

  const loadSites = async () => {
    try {
      isLoading.value = true
      error.value = null
      sites.value = await siteApi.getSites()
    } catch (err) {
      console.error('사이트 로드 실패:', err)
      // API 호출 실패 시 기본 사이트 데이터 사용
      sites.value = [
        { id: 'catholic_notice', name: '가톨릭대학교 공지사항', category: '공지사항', enabled: true },
        { id: 'dept_computer_info', name: '컴퓨터정보공학부', category: '공과대학', enabled: true },
        { id: 'dept_korean_history', name: '사학과', category: '인문대학', enabled: true },
        { id: 'dept_philosophy', name: '철학과', category: '인문대학', enabled: true },
        { id: 'dept_english', name: '영어영문학과', category: '인문대학', enabled: true },
        { id: 'dept_business', name: '경영학부', category: '경영대학', enabled: true },
        { id: 'dept_law', name: '법학과', category: '법과대학', enabled: true },
        { id: 'dept_chemistry', name: '화학과', category: '자연과학대학', enabled: true },
        { id: 'dept_mathematics', name: '수학과', category: '자연과학대학', enabled: true },
        { id: 'dept_physics', name: '물리학과', category: '자연과학대학', enabled: true }
      ]
      error.value = '백엔드 서버에 연결할 수 없습니다. 기본 사이트 목록을 표시합니다.'
    } finally {
      isLoading.value = false
    }
  }

  const loadSubscriptions = async () => {
    try {
      isLoading.value = true
      error.value = null
      subscriptions.value = await subscriptionApi.getSubscriptions()
    } catch (err) {
      console.error('구독 로드 실패:', err)
      // API 호출 실패 시 빈 구독 목록 사용
      subscriptions.value = []
      error.value = '백엔드 서버에 연결할 수 없습니다. 구독 기능을 사용할 수 없습니다.'
    } finally {
      isLoading.value = false
    }
  }

  const loadNotices = async () => {
    try {
      isLoading.value = true
      error.value = null
      notices.value = await noticeApi.getNotices()
    } catch (err) {
      console.error('공지사항 로드 실패:', err)
      // API 호출 실패 시 기본 공지사항 데이터 사용
      notices.value = [
        {
          id: 1,
          title: '🚨 테스트 공지사항 - 알림 기능 테스트 🚨',
          url: 'https://test.example.com',
          siteName: '컴퓨터정보공학부',
          publishedAt: new Date().toISOString(),
          isNew: true
        },
        {
          id: 2,
          title: '2025학년도 2학기 수강신청 안내',
          url: 'https://example.com/notice1',
          siteName: '가톨릭대학교 공지사항',
          publishedAt: new Date(Date.now() - 86400000).toISOString(),
          isNew: false
        },
        {
          id: 3,
          title: '졸업논문 제출 일정 안내',
          url: 'https://example.com/notice2',
          siteName: '사학과',
          publishedAt: new Date(Date.now() - 172800000).toISOString(),
          isNew: false
        }
      ]
      error.value = '백엔드 서버에 연결할 수 없습니다. 기본 공지사항을 표시합니다.'
    } finally {
      isLoading.value = false
    }
  }

  const subscribeToSite = async (siteId: string) => {
    if (!fcmToken.value || !deviceId.value) {
      throw new Error('FCM 토큰 또는 디바이스 ID가 없습니다.')
    }

    try {
      isLoading.value = true
      error.value = null

      const subscriptionData: CreateSubscriptionRequest = {
        siteId,
        fcmToken: fcmToken.value,
        deviceId: deviceId.value
      }

      const newSubscription = await subscriptionApi.createSubscription(subscriptionData)
      subscriptions.value.push(newSubscription)
      
      console.log('구독 성공:', newSubscription)
    } catch (err) {
      console.error('구독 실패:', err)
      error.value = '구독에 실패했습니다.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const unsubscribeFromSite = async (subscriptionId: number) => {
    try {
      isLoading.value = true
      error.value = null

      await subscriptionApi.deleteSubscription(subscriptionId)
      subscriptions.value = subscriptions.value.filter(sub => sub.id !== subscriptionId)
      
      console.log('구독 해제 성공:', subscriptionId)
    } catch (err) {
      console.error('구독 해제 실패:', err)
      error.value = '구독 해제에 실패했습니다.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const toggleSubscription = async (subscriptionId: number, isActive: boolean) => {
    try {
      isLoading.value = true
      error.value = null

      const updatedSubscription = await subscriptionApi.toggleSubscription(subscriptionId, isActive)
      const index = subscriptions.value.findIndex(sub => sub.id === subscriptionId)
      if (index !== -1) {
        subscriptions.value[index] = updatedSubscription
      }
      
      console.log('구독 상태 변경:', updatedSubscription)
    } catch (err) {
      console.error('구독 상태 변경 실패:', err)
      error.value = '구독 상태 변경에 실패했습니다.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const sendTestNotification = async () => {
    if (!fcmToken.value || !deviceId.value) {
      throw new Error('FCM 토큰 또는 디바이스 ID가 없습니다.')
    }

    try {
      const result = await noticeApi.sendTestNotification(fcmToken.value, deviceId.value)
      console.log('테스트 알림 발송:', result)
      return result
    } catch (err) {
      console.error('테스트 알림 발송 실패:', err)
      error.value = '테스트 알림 발송에 실패했습니다.'
      throw err
    }
  }

  const runCrawler = async () => {
    try {
      isLoading.value = true
      error.value = null

      const result = await noticeApi.crawlSites()
      console.log('크롤링 실행:', result)
      
      // 크롤링 후 공지사항 새로고침
      await loadNotices()
      
      return result
    } catch (err) {
      console.error('크롤링 실행 실패:', err)
      error.value = '크롤링 실행에 실패했습니다.'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateTokens = (fcmTokenValue: string, deviceIdValue: string) => {
    fcmToken.value = fcmTokenValue
    deviceId.value = deviceIdValue
  }

  const initialize = async () => {
    await initializeFirebase()
    await Promise.all([
      loadSites(),
      loadSubscriptions(),
      loadNotices()
    ])
    
    // 초기화 후 토큰 상태 로그
    console.log('스토어 초기화 완료 - FCM 토큰:', fcmToken.value ? '있음' : '없음')
    console.log('스토어 초기화 완료 - 디바이스 ID:', deviceId.value)
  }

  return {
    // State
    subscriptions,
    sites,
    notices,
    isLoading,
    error,
    fcmToken,
    deviceId,
    
    // Getters
    subscribedSites,
    unsubscribedSites,
    subscriptionsByCategory,
    
    // Actions
    initialize,
    initializeFirebase,
    requestNotificationPermission,
    loadSites,
    loadSubscriptions,
    loadNotices,
    subscribeToSite,
    unsubscribeFromSite,
    toggleSubscription,
    sendTestNotification,
    runCrawler,
    updateTokens
  }
})
