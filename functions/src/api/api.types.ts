export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: string[];
}

export interface SubscriptionRequest {
  token: string;
  sites: string[];
}

export interface SiteStatus {
  lastTitle?: string;
  lastPostNo?: string;
  updatedAt?: string;
  postCount?: number;
  isActive: boolean;
}