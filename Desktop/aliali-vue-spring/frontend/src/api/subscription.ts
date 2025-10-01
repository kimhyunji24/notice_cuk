import { apiClient } from './client'

export interface Subscription {
  id: number
  fcmToken: string
  deviceId: string
  siteId: string
  siteName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastNotified: string | null
}

export interface CreateSubscriptionRequest {
  siteId: string
  fcmToken: string
  deviceId: string
}

export interface SubscriptionResponse {
  subscriptions: Subscription[]
  total: number
}

export const subscriptionApi = {
  // 구독 목록 조회
  getSubscriptions: async (): Promise<Subscription[]> => {
    const response = await apiClient.get('/subscriptions')
    return response.data
  },

  // 구독 생성
  createSubscription: async (data: CreateSubscriptionRequest): Promise<Subscription> => {
    const response = await apiClient.post('/subscriptions', data)
    return response.data
  },

  // 구독 삭제
  deleteSubscription: async (id: number): Promise<void> => {
    await apiClient.delete(`/subscriptions/${id}`)
  },

  // 구독 활성화/비활성화
  toggleSubscription: async (id: number, isActive: boolean): Promise<Subscription> => {
    const response = await apiClient.patch(`/subscriptions/${id}`, { isActive })
    return response.data
  },

  // 특정 사이트 구독 조회
  getSubscriptionsBySite: async (siteId: string): Promise<Subscription[]> => {
    const response = await apiClient.get(`/subscriptions?siteId=${siteId}`)
    return response.data
  }
}

export default subscriptionApi
