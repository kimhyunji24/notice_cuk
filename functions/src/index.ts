import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { apiRouter } from './api/router';
import { crawlerService } from './crawler/crawler.service';
import { monitoringService } from './services/monitoring.service';
import { subscriptionService } from './services/subscription.service';
import { config, validateEnvironment, environment } from './config/environment';

// 환경 설정 검증
try {
  validateEnvironment();
} catch (error) {
  console.error('❌ 환경 설정 오류:', error);
  process.exit(1);
}

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: config.firebase.projectId
  });
}

console.log(`🚀 Functions 시작 - 환경: ${environment.nodeEnv}, 프로젝트: ${config.firebase.projectId}`);
// API HTTP Function
export const api = functions
  .region('asia-northeast3')
  .runWith({
    memory: '512MB',
    timeoutSeconds: 30
  })
  .https
  .onRequest(apiRouter);

// 크롤러 Scheduled Function - 환경별 간격 설정
export const crawler = functions
  .region(config.firebase.region)
  .runWith({
    memory: '1GB',
    timeoutSeconds: 540
  })
  .pubsub
  .schedule(config.crawler.scheduleInterval)
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('🚀 크롤러 시작 -', context.timestamp);
    try {
      const result = await crawlerService.crawlAllSites();
      console.log('✅ 크롤러 완료:', result);
      return result;
    } catch (error) {
      console.error('❌ 크롤러 실행 오류:', error);
      
      // 프로덕션 환경에서는 모니터링 웹훅으로 에러 알림
      if (config.monitoring.enableErrorTracking && config.monitoring.webhookUrl) {
        await notifyError('크롤러 실행 실패', error, context);
      }
      
      throw error;
    }
  });

/**
 * 에러 알림 전송
 */
async function notifyError(title: string, error: any, context?: any): Promise<void> {
  // 실제 구현에서는 Slack, Discord, 이메일 등으로 알림 전송
  console.error(`🚨 ${title}:`, error.message);
}

// 시스템 모니터링 Scheduled Function - 1시간마다 실행
export const monitoring = functions
  .region(config.firebase.region)
  .runWith({
    memory: '256MB',
    timeoutSeconds: 300
  })
  .pubsub
  .schedule('every 1 hours')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    if (!config.monitoring.enableMetrics) {
      console.log('📊 모니터링이 비활성화되어 있습니다.');
      return;
    }

    console.log('📊 시스템 모니터링 시작 -', context.timestamp);
    try {
      const metrics = await monitoringService.collectAndStoreMetrics();
      console.log('✅ 모니터링 완료:', {
        crawlerSuccess: metrics.crawler.successfulSites,
        crawlerFailed: metrics.crawler.failedSites,
        fcmSubscribers: metrics.fcm.totalSubscribers,
        memoryUsage: metrics.system.memoryUsage
      });
      return metrics;
    } catch (error) {
      console.error('❌ 모니터링 실행 오류:', error);
      throw error;
    }
  });

// 헬스체크 Scheduled Function - 30분마다 실행
export const healthCheck = functions
  .region(config.firebase.region)
  .runWith({
    memory: '256MB',
    timeoutSeconds: 60
  })
  .pubsub
  .schedule('every 30 minutes')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('🏥 헬스체크 시작 -', context.timestamp);
    try {
      const health = await monitoringService.performHealthCheck();
      console.log('🏥 헬스체크 완료:', health.status);
      
      if (health.status === 'unhealthy') {
        await notifyError('시스템 헬스체크 실패', new Error(`상태: ${health.status}`), health);
      }
      
      return health;
    } catch (error) {
      console.error('❌ 헬스체크 실행 오류:', error);
      throw error;
    }
  });

// 데이터 정리 Scheduled Function - 매일 새벽 2시 실행
export const cleanup = functions
  .region(config.firebase.region)
  .runWith({
    memory: '256MB',
    timeoutSeconds: 300
  })
  .pubsub
  .schedule('0 2 * * *') // 매일 새벽 2시
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('🧹 데이터 정리 시작 -', context.timestamp);
    try {
      // 만료된 구독 정리
      const cleanedSubscriptions = await subscriptionService.cleanupExpiredSubscriptions();
      
      // 오래된 모니터링 데이터 정리 (30일 이상)
      const cleanedMetrics = await monitoringService.cleanupOldMetrics(30);
      
      console.log('🧹 데이터 정리 완료:', {
        cleanedSubscriptions,
        cleanedMetrics
      });
      
      return { cleanedSubscriptions, cleanedMetrics };
    } catch (error) {
      console.error('❌ 데이터 정리 실행 오류:', error);
      throw error;
    }
  });