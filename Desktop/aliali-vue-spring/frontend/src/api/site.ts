import { apiClient } from './client'

export interface Site {
  id: string
  name: string
  url: string
  selector: string
  titleSelector: string
  linkSelector: string
  category: string
  enabled: boolean
  lastCrawled: string | null
  createdAt: string
  updatedAt: string
}

export interface SiteResponse {
  sites: Site[]
  total: number
}

export const siteApi = {
  // 사이트 목록 조회
  getSites: async (): Promise<Site[]> => {
    const response = await apiClient.get('/sites')
    return response.data
  },

  // 카테고리별 사이트 조회
  getSitesByCategory: async (category: string): Promise<Site[]> => {
    const response = await apiClient.get(`/sites?category=${category}`)
    return response.data
  },

  // 활성 사이트만 조회
  getActiveSites: async (): Promise<Site[]> => {
    const response = await apiClient.get('/sites?enabled=true')
    return response.data
  },

  // 사이트 상세 조회
  getSite: async (id: string): Promise<Site> => {
    const response = await apiClient.get(`/sites/${id}`)
    return response.data
  },

  // 사이트 활성화/비활성화
  toggleSite: async (id: string, enabled: boolean): Promise<Site> => {
    const response = await apiClient.patch(`/sites/${id}`, { enabled })
    return response.data
  }
}

export default siteApi
