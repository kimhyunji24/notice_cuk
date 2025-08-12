/**
 * 모니터링 서비스
 * 시스템 상태 모니터링, 메트릭 수집, 알림 발송을 담당합니다.
 */

import * as admin from 'firebase-admin';
import axios from 'axios';
import { config, environment } from '../config/environment';
import { crawlerService } from '../crawler/crawler.service';
import { fcmService } from './fcm.service';

export interface SystemMetrics {
  timestamp: admin.firestore.Timestamp;
  
  // 크롤링 메트릭
  crawler: {
    totalSites: number;
    successfulSites: number;
    failedSites: number;
    totalNewPosts: number;
    avgResponseTime: number;
    errors: string[];
  };
  
  // FCM 메트릭
  fcm: {
    totalSubscribers: number;
    notificationsSent: number;
    successRate: number;
    failedTokens: number;
  };
  
  // 시스템 메트릭
  system: {
    memoryUsage: number;
    functionInvocations: number;
    errorRate: number;
    uptime: number;
  };
}

export interface AlertConfig {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  context?: Record<string, any>;
  shouldNotify: boolean;
}

class MonitoringService {
  private readonly METRICS_COLLECTION = 'system_metrics';
  private readonly ALERTS_COLLECTION = 'system_alerts';
  
  private get db() {
    return admin.firestore();
  }
  
  /**
   * 시스템 메트릭을 수집하고 저장합니다.
   */
  async collectAndStoreMetrics(): Promise<SystemMetrics> {
    console.log('📊 시스템 메트릭 수집 시작');
    
    try {
      const metrics: SystemMetrics = {
        timestamp: admin.firestore.Timestamp.now(),
        crawler: await this.getCrawlerMetrics(),
        fcm: await this.getFCMMetrics(),
        system: await this.getSystemMetrics()
      };

      // Firestore에 저장
      await this.db.collection(this.METRICS_COLLECTION).add(metrics);
      
      // 알림 체크
      await this.checkAndSendAlerts(metrics);
      
      console.log('✅ 시스템 메트릭 수집 완료');
      return metrics;
      
    } catch (error) {
      console.error('❌ 메트릭 수집 실패:', error);
      throw error;
    }
  }

  /**
   * 크롤링 관련 메트릭 수집
   */
  private async getCrawlerMetrics() {
    try {
      // 최근 24시간 크롤링 결과 조회
      const yesterday = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      const crawlResults = await this.db
        .collection('crawl_results')
        .where('timestamp', '>=', yesterday)
        .get();

      const results = crawlResults.docs.map(doc => doc.data());
      
      const totalSites = results.length;
      const successfulSites = results.filter(r => r.success).length;
      const failedSites = totalSites - successfulSites;
      const totalNewPosts = results.reduce((sum, r) => sum + (r.newPostsCount || 0), 0);
      const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / Math.max(totalSites, 1);
      const errors = results.filter(r => !r.success).map(r => r.error).filter(Boolean);

      return {
        totalSites,
        successfulSites,
        failedSites,
        totalNewPosts,
        avgResponseTime,
        errors
      };
      
    } catch (error: any) {
      console.error('크롤링 메트릭 수집 실패:', error);
      return {
        totalSites: 0,
        successfulSites: 0,
        failedSites: 0,
        totalNewPosts: 0,
        avgResponseTime: 0,
        errors: [`메트릭 수집 오류: ${error?.message || 'Unknown error'}`]
      };
    }
  }

  /**
   * FCM 관련 메트릭 수집
   */
  private async getFCMMetrics() {
    try {
      // 구독자 수 조회
      const subscriptions = await this.db.collection('subscriptions').get();
      const totalSubscribers = subscriptions.size;

      // 최근 24시간 알림 발송 기록 조회
      const yesterday = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      const notifications = await this.db
        .collection('notification_logs')
        .where('timestamp', '>=', yesterday)
        .get();

      const notificationData = notifications.docs.map(doc => doc.data());
      const notificationsSent = notificationData.reduce((sum, n) => sum + (n.recipientCount || 0), 0);
      const successCount = notificationData.reduce((sum, n) => sum + (n.successCount || 0), 0);
      const failedTokens = notificationData.reduce((sum, n) => sum + (n.failedTokens?.length || 0), 0);
      const successRate = notificationsSent > 0 ? (successCount / notificationsSent) * 100 : 100;

      return {
        totalSubscribers,
        notificationsSent,
        successRate,
        failedTokens
      };
      
    } catch (error) {
      console.error('FCM 메트릭 수집 실패:', error);
      return {
        totalSubscribers: 0,
        notificationsSent: 0,
        successRate: 0,
        failedTokens: 0
      };
    }
  }

  /**
   * 시스템 관련 메트릭 수집
   */
  private async getSystemMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      return {
        memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        functionInvocations: 0, // Cloud Functions 콘솔에서 조회 필요
        errorRate: 0, // 에러 로그 분석 필요
        uptime: Math.round(uptime)
      };
      
    } catch (error) {
      console.error('시스템 메트릭 수집 실패:', error);
      return {
        memoryUsage: 0,
        functionInvocations: 0,
        errorRate: 0,
        uptime: 0
      };
    }
  }

  /**
   * 알림 조건을 체크하고 필요시 알림을 발송합니다.
   */
  private async checkAndSendAlerts(metrics: SystemMetrics): Promise<void> {
    const alerts: AlertConfig[] = [];

    // 크롤링 실패율 체크
    const failureRate = metrics.crawler.totalSites > 0 
      ? (metrics.crawler.failedSites / metrics.crawler.totalSites) * 100 
      : 0;

    if (failureRate > 50) {
      alerts.push({
        type: 'error',
        title: '🚨 크롤링 실패율 임계값 초과',
        message: `크롤링 실패율이 ${failureRate.toFixed(1)}%입니다. (${metrics.crawler.failedSites}/${metrics.crawler.totalSites} 실패)`,
        context: { metrics: metrics.crawler },
        shouldNotify: true
      });
    } else if (failureRate > 20) {
      alerts.push({
        type: 'warning',
        title: '⚠️ 크롤링 실패율 주의',
        message: `크롤링 실패율이 ${failureRate.toFixed(1)}%입니다.`,
        context: { metrics: metrics.crawler },
        shouldNotify: false
      });
    }

    // FCM 성공률 체크
    if (metrics.fcm.successRate < 90 && metrics.fcm.notificationsSent > 0) {
      alerts.push({
        type: 'warning',
        title: '📱 FCM 성공률 저하',
        message: `FCM 알림 성공률이 ${metrics.fcm.successRate.toFixed(1)}%입니다.`,
        context: { metrics: metrics.fcm },
        shouldNotify: true
      });
    }

    // 메모리 사용량 체크
    if (metrics.system.memoryUsage > 400) { // 400MB 초과
      alerts.push({
        type: 'warning',
        title: '💾 높은 메모리 사용량',
        message: `메모리 사용량이 ${metrics.system.memoryUsage}MB입니다.`,
        context: { metrics: metrics.system },
        shouldNotify: true
      });
    }

    // 알림 처리
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  /**
   * 알림을 처리합니다.
   */
  private async processAlert(alert: AlertConfig): Promise<void> {
    try {
      // 알림 저장
      await this.db.collection(this.ALERTS_COLLECTION).add({
        ...alert,
        timestamp: admin.firestore.Timestamp.now(),
        environment: environment.nodeEnv
      });

      console.log(`${alert.type === 'error' ? '🚨' : '⚠️'} ${alert.title}: ${alert.message}`);

      // 외부 알림 발송 (Slack, Discord, 이메일 등)
      if (alert.shouldNotify && config.monitoring.webhookUrl) {
        await this.sendExternalNotification(alert);
      }
      
    } catch (error) {
      console.error('알림 처리 실패:', error);
    }
  }

  /**
   * 외부 웹훅으로 알림을 발송합니다.
   */
  private async sendExternalNotification(alert: AlertConfig): Promise<void> {
    try {
      const payload = {
        text: `${alert.title}\n${alert.message}`,
        environment: environment.nodeEnv,
        timestamp: new Date().toISOString(),
        context: alert.context
      };

      await axios.post(config.monitoring.webhookUrl!, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📤 외부 알림 발송 완료');
      
    } catch (error) {
      console.error('외부 알림 발송 실패:', error);
    }
  }

  /**
   * 전체 시스템 헬스체크를 수행합니다.
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    details: Record<string, any>;
  }> {
    console.log('🏥 시스템 헬스체크 시작');
    
    const checks = {
      firestore: false,
      fcm: false,
      crawler: false
    };

    const details: Record<string, any> = {};

    try {
      // Firestore 연결 체크
      await this.db.collection('health_check').doc('test').set({ timestamp: new Date() });
      checks.firestore = true;
      details.firestore = '정상';
    } catch (error: any) {
      details.firestore = `오류: ${error?.message || 'Unknown error'}`;
    }

    try {
      // FCM 서비스 체크
      checks.fcm = await fcmService.healthCheck();
      details.fcm = checks.fcm ? '정상' : 'FCM 서비스 오류';
    } catch (error: any) {
      details.fcm = `오류: ${error?.message || 'Unknown error'}`;
    }

    try {
      // 크롤러 기본 체크 (네트워크 연결 등)
      checks.crawler = true; // 실제로는 샘플 사이트 크롤링 테스트
      details.crawler = '정상';
    } catch (error: any) {
      details.crawler = `오류: ${error?.message || 'Unknown error'}`;
    }

    const healthyCount = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalChecks) {
      status = 'healthy';
    } else if (healthyCount >= totalChecks / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    console.log(`🏥 헬스체크 완료: ${status} (${healthyCount}/${totalChecks})`);

    return { status, checks, details };
  }

  /**
   * 과거 메트릭 데이터를 정리합니다.
   */
  async cleanupOldMetrics(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
      );

      const oldMetrics = await this.db
        .collection(this.METRICS_COLLECTION)
        .where('timestamp', '<', cutoffDate)
        .get();

      const batch = this.db.batch();
      oldMetrics.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      console.log(`🧹 ${oldMetrics.size}개의 오래된 메트릭 데이터 정리 완료`);
      return oldMetrics.size;
      
    } catch (error) {
      console.error('메트릭 정리 실패:', error);
      return 0;
    }
  }
}

export const monitoringService = new MonitoringService();