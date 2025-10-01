import apiClient from './client'

export interface Site {
  id: string
  name: string
  url: string
  selector: string
  titleSelector: string
  linkSelector: string
  category: string
  enabled: boolean
  lastCrawled: string
  createdAt: string
  updatedAt: string
}

export interface Notice {
  id: number
  title: string
  content: string
  url: string
  externalId: string
  siteId: string
  siteName: string
  publishedAt: string
  createdAt: string
  updatedAt: string
  isNew: boolean
}

export interface Subscription {
  id: number
  fcmToken: string
  deviceId: string
  siteId: string
  siteName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastNotified: string
}

export const noticeApi = {
  // 사이트 목록 조회
  getSites: async (): Promise<Site[]> => {
    const response = await apiClient.get('/sites')
    return response.data
  },

  // 공지사항 목록 조회
  getNotices: async (): Promise<Notice[]> => {
    const response = await apiClient.get('/notices')
    return response.data
  },

  // 크롤링 실행
  crawlSites: async (): Promise<string> => {
    const response = await apiClient.post('/crawl')
    return response.data
  },

  // 테스트 알림 전송
  sendTestNotification: async (fcmToken: string, deviceId: string): Promise<string> => {
    const response = await apiClient.post('/test-notification', null, {
      params: { fcmToken, deviceId }
    })
    return response.data
  },

  // 구독 생성
  createSubscription: async (fcmToken: string, deviceId: string, siteId: string): Promise<Subscription> => {
    const response = await apiClient.post('/subscriptions', {
      fcmToken,
      deviceId,
      siteId
    })
    return response.data
  },

  // 디바이스별 구독 목록 조회
  getSubscriptionsByDevice: async (deviceId: string): Promise<Subscription[]> => {
    const response = await apiClient.get(`/subscriptions/device/${deviceId}`)
    return response.data
  },

  // 구독 삭제
  deleteSubscription: async (id: number): Promise<void> => {
    await apiClient.delete(`/subscriptions/${id}`)
  },

  // 구독 테스트 알림
  testSubscription: async (id: number): Promise<string> => {
    const response = await apiClient.post(`/subscriptions/${id}/test`)
    return response.data
  }
}
