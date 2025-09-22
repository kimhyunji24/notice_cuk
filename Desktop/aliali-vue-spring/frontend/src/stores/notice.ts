import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { noticeApi, type Site, type Notice, type Subscription } from '@/api/notice'
import firebaseService from '@/services/firebase'

export const useNoticeStore = defineStore('notice', () => {
  // State
  const sites = ref<Site[]>([])
  const notices = ref<Notice[]>([])
  const subscriptions = ref<Subscription[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const fcmToken = ref<string | null>(null)
  const deviceId = ref<string | null>(null)
  const isInitialized = ref(false)

  // Getters
  const enabledSites = computed(() => sites.value.filter(site => site.enabled))
  const newNotices = computed(() => notices.value.filter(notice => notice.isNew === true))
  const activeSubscriptions = computed(() => subscriptions.value.filter(sub => sub.isActive))

  // Actions
  const initializeFirebase = async () => {
    // 이미 초기화되었으면 중복 실행 방지
    if (isInitialized.value) {
      console.log('⚠️ Notice Store가 이미 초기화되었습니다. 중복 실행을 방지합니다.')
      return true
    }
    
    try {
      firebaseService.initialize()
      deviceId.value = firebaseService.getDeviceId()
      
      // 메시지 리스너 설정
      firebaseService.onMessage((payload) => {
        console.log('새 알림:', payload)
        
        // 새 공지사항이 있으면 목록 새로고침 (강제 새로고침)
        fetchNotices(true)
      })
      
      isInitialized.value = true
      return true
    } catch (error) {
      console.error('Firebase 초기화 실패:', error)
      return false
    }
  }

  const requestPermissionAndGetToken = async () => {
    try {
      const token = await firebaseService.requestPermissionAndGetToken()
      if (token) {
        fcmToken.value = token
        return token
      }
      return null
    } catch (error) {
      console.error('FCM 토큰 요청 실패:', error)
      return null
    }
  }

  const fetchSites = async () => {
    try {
      loading.value = true
      error.value = null
      sites.value = await noticeApi.getSites()
    } catch (err) {
      error.value = '사이트 목록을 불러오는데 실패했습니다.'
      console.error('Failed to fetch sites:', err)
    } finally {
      loading.value = false
    }
  }

  const fetchNotices = async (forceRefresh = false) => {
    // 이미 로딩 중이면 중복 호출 방지
    if (loading.value && !forceRefresh) {
      console.log('⚠️ fetchNotices가 이미 실행 중입니다. 중복 호출을 방지합니다.')
      return
    }
    
    try {
      console.log('🔍 fetchNotices 시작')
      loading.value = true
      error.value = null
      const fetchedNotices = await noticeApi.getNotices()
      console.log('📥 API에서 받은 공지사항 수:', fetchedNotices.length)
      console.log('📥 RealFCMTest 포함 여부:', fetchedNotices.some(n => n.title.includes('RealFCMTest')))
      
      // isNew 필드 디버깅
      const isNewNotices = fetchedNotices.filter(n => n.isNew === true)
      console.log('📥 isNew=true인 공지사항 수:', isNewNotices.length)
      console.log('📥 전체 공지사항 중 isNew=true 비율:', `${isNewNotices.length}/${fetchedNotices.length}`)
      console.log('📥 isNew 필드 샘플:', fetchedNotices.slice(0, 3).map(n => ({ 
        id: n.id, 
        title: n.title.substring(0, 20) + '...', 
        isNew: n.isNew,
        type: typeof n.isNew
      })))
      
      notices.value = fetchedNotices
      console.log('💾 스토어에 저장된 공지사항 수:', notices.value.length)
    } catch (err) {
      error.value = '공지사항을 불러오는데 실패했습니다.'
      console.error('Failed to fetch notices:', err)
    } finally {
      loading.value = false
      console.log('✅ fetchNotices 완료')
    }
  }

  const fetchSubscriptions = async () => {
    if (!deviceId.value) return
    
    try {
      loading.value = true
      error.value = null
      subscriptions.value = await noticeApi.getSubscriptionsByDevice(deviceId.value)
    } catch (err) {
      error.value = '구독 목록을 불러오는데 실패했습니다.'
      console.error('Failed to fetch subscriptions:', err)
    } finally {
      loading.value = false
    }
  }

  const crawlSites = async () => {
    try {
      loading.value = true
      error.value = null
      const message = await noticeApi.crawlSites()
      console.log('크롤링 완료:', message)
      // 크롤링 후 공지사항 목록 새로고침
      await fetchNotices()
    } catch (err) {
      error.value = '크롤링에 실패했습니다.'
      console.error('Failed to crawl sites:', err)
    } finally {
      loading.value = false
    }
  }

  const subscribeToSite = async (siteId: string) => {
    if (!fcmToken.value || !deviceId.value) {
      error.value = 'FCM 토큰이 없습니다. 알림 권한을 허용해주세요.'
      return false
    }

    try {
      loading.value = true
      error.value = null
      const subscription = await noticeApi.createSubscription(fcmToken.value, deviceId.value, siteId)
      subscriptions.value.push(subscription)
      return true
    } catch (err) {
      error.value = '구독에 실패했습니다.'
      console.error('Failed to subscribe to site:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  const unsubscribeFromSite = async (subscriptionId: number) => {
    try {
      loading.value = true
      error.value = null
      await noticeApi.deleteSubscription(subscriptionId)
      subscriptions.value = subscriptions.value.filter(sub => sub.id !== subscriptionId)
    } catch (err) {
      error.value = '구독 해제에 실패했습니다.'
      console.error('Failed to unsubscribe from site:', err)
    } finally {
      loading.value = false
    }
  }

  const testNotification = async (subscriptionId: number) => {
    try {
      loading.value = true
      error.value = null
      const message = await noticeApi.testSubscription(subscriptionId)
      console.log('테스트 알림 전송:', message)
    } catch (err) {
      error.value = '테스트 알림 전송에 실패했습니다.'
      console.error('Failed to send test notification:', err)
    } finally {
      loading.value = false
    }
  }


  const isSubscribed = (siteId: string) => {
    return activeSubscriptions.value.some(sub => sub.siteId === siteId)
  }

  const getSubscriptionBySiteId = (siteId: string) => {
    return activeSubscriptions.value.find(sub => sub.siteId === siteId)
  }

  return {
    // State
    sites,
    notices,
    subscriptions,
    loading,
    error,
    fcmToken,
    deviceId,
    isInitialized,
    
    // Getters
    enabledSites,
    newNotices,
    activeSubscriptions,
    
    // Actions
    initializeFirebase,
    requestPermissionAndGetToken,
    fetchSites,
    fetchNotices,
    fetchSubscriptions,
    crawlSites,
    subscribeToSite,
    unsubscribeFromSite,
    testNotification,
    isSubscribed,
    getSubscriptionBySiteId
  }
})
