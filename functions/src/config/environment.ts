/**
 * 환경별 설정 관리
 * 개발/프로덕션 환경을 명확히 분리하고 타입 안전성을 보장합니다.
 */

import * as functions from 'firebase-functions';

export interface AppConfig {
  // Firebase 설정
  firebase: {
    projectId: string;
    region: string;
  };
  
  // 크롤링 설정
  crawler: {
    concurrentLimit: number;
    requestTimeout: number;
    scheduleInterval: string;
    maxRetries: number;
    retryDelay: number;
  };
  
  // FCM 설정
  fcm: {
    batchSize: number;
    vapidKey: string;
  };
  
  // API 설정
  api: {
    rateLimitWindow: number;
    rateLimitMax: number;
    corsOrigins: string[];
  };
  
  // 모니터링 설정
  monitoring: {
    enableMetrics: boolean;
    enableErrorTracking: boolean;
    webhookUrl?: string;
  };
  
  // 데이터베이스 설정
  database: {
    subscriptionCleanupDays: number;
    maxTokensPerBatch: number;
  };
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

/**
 * 개발 환경 설정
 */
const developmentConfig: AppConfig = {
  firebase: {
    projectId: 'cuknotice-dev',
    region: 'asia-northeast3'
  },
  crawler: {
    concurrentLimit: 3,
    requestTimeout: 10000,
    scheduleInterval: 'every 30 minutes', // 개발 환경에서는 더 긴 간격
    maxRetries: 2,
    retryDelay: 5000
  },
  fcm: {
    batchSize: 100,
    vapidKey: functions.config().fcm?.vapid_key || ''
  },
  api: {
    rateLimitWindow: 15 * 60 * 1000, // 15분
    rateLimitMax: 100,
    corsOrigins: ['http://localhost:3000', 'http://localhost:5000']
  },
  monitoring: {
    enableMetrics: false,
    enableErrorTracking: true
  },
  database: {
    subscriptionCleanupDays: 7, // 개발 환경에서는 짧게
    maxTokensPerBatch: 100
  }
};

/**
 * 프로덕션 환경 설정
 */
const productionConfig: AppConfig = {
  firebase: {
    projectId: 'cuknotice',
    region: 'asia-northeast3'
  },
  crawler: {
    concurrentLimit: 5,
    requestTimeout: 15000,
    scheduleInterval: 'every 10 minutes',
    maxRetries: 3,
    retryDelay: 3000
  },
  fcm: {
    batchSize: 500,
    vapidKey: functions.config().fcm?.vapid_key || ''
  },
  api: {
    rateLimitWindow: 15 * 60 * 1000,
    rateLimitMax: 50,
    corsOrigins: [
      'https://cuknotice.web.app',
      'https://cuknotice.firebaseapp.com'
    ]
  },
  monitoring: {
    enableMetrics: true,
    enableErrorTracking: true,
    webhookUrl: functions.config().monitoring?.webhook_url
  },
  database: {
    subscriptionCleanupDays: 30,
    maxTokensPerBatch: 500
  }
};

/**
 * 현재 환경에 맞는 설정을 반환합니다.
 */
export const getConfig = (): AppConfig => {
  if (isDevelopment || isEmulator) {
    console.log('🔧 개발 환경 설정 로드');
    return developmentConfig;
  }
  
  console.log('🚀 프로덕션 환경 설정 로드');
  return productionConfig;
};

/**
 * 환경 변수 검증
 */
export const validateEnvironment = (): void => {
  const config = getConfig();
  
  const requiredFields = [
    'firebase.projectId',
    'firebase.region'
  ];
  
  const missingFields: string[] = [];
  
  requiredFields.forEach(field => {
    const value = getNestedValue(config, field);
    if (!value) {
      missingFields.push(field);
    }
  });
  
  if (missingFields.length > 0) {
    throw new Error(`필수 환경 설정이 누락되었습니다: ${missingFields.join(', ')}`);
  }
  
  // VAPID 키 별도 확인
  if (!config.fcm.vapidKey || config.fcm.vapidKey.trim() === '') {
    console.warn('⚠️ FCM VAPID 키가 설정되지 않았습니다. 웹 푸시 알림이 작동하지 않을 수 있습니다.');
  } else {
    console.log('✅ FCM VAPID 키 확인 완료');
  }
  
  console.log('✅ 환경 설정 검증 완료');
};

/**
 * 중첩된 객체에서 값을 가져오는 헬퍼 함수
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 현재 환경 정보
 */
export const environment = {
  isDevelopment,
  isEmulator,
  isProduction: !isDevelopment && !isEmulator,
  nodeEnv: process.env.NODE_ENV || 'development'
};

// 설정 내보내기
export const config = getConfig();