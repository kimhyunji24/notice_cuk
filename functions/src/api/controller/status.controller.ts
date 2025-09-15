import { Request, Response, NextFunction } from 'express';
import { crawledPostService } from '../../services/crawled-post.service';
import { subscriptionService } from '../../services/subscription.service';
import { monitoringService } from '../../services/monitoring.service';
import { crawlerService } from '../../crawler/crawler.service';
import { ApiResponse } from '../api.types';
import { config, environment } from '../../config/environment';

export class StatusController {
  /**
   * 전체 시스템 상태를 조회합니다.
   */
  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 병렬로 데이터 수집
      const [
        crawlerStatus,
        subscriptionStats,
        systemHealth
      ] = await Promise.all([
        crawledPostService.getAllSiteStatus(),
        subscriptionService.getSubscriptionStats(),
        monitoringService.performHealthCheck()
      ]);

      const responseData = {
        // 시스템 정보
        system: {
          status: systemHealth.status,
          environment: environment.nodeEnv,
          region: config.firebase.region,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) // MB
          }
        },

        // 크롤링 상태
        crawler: {
          sites: crawlerStatus,
          totalSites: Object.keys(crawlerStatus).length,
          lastUpdate: this.getLastUpdateTime(crawlerStatus)
        },

        // 구독 통계
        subscriptions: subscriptionStats,

        // 헬스체크 결과
        health: {
          overall: systemHealth.status,
          services: systemHealth.checks,
          details: systemHealth.details
        },

        // 설정 정보 (민감하지 않은 정보만)
        config: {
          crawlerInterval: config.crawler.scheduleInterval,
          monitoringEnabled: config.monitoring.enableMetrics,
          batchSize: config.fcm.batchSize
        }
      };
      
      res.json({
        success: true,
        message: '상태 조회 성공',
        data: responseData
      } as ApiResponse);

    } catch (error) {
      console.error('상태 조회 오류:', error);
      next(error);
    }
  }

  /**
   * 간단한 헬스체크 엔드포인트
   */
  getHealthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const health = await monitoringService.performHealthCheck();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 206 : 503;

      res.status(statusCode).json({
        status: health.status,
        timestamp: new Date().toISOString(),
        checks: health.checks
      });

    } catch (error: any) {
      console.error('헬스체크 오류:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error?.message || 'Unknown error'
      });
    }
  }

  /**
   * 특정 사이트의 크롤링을 테스트합니다 (디버깅용)
   */
  async testCrawling(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { siteId } = req.params;
      
      if (!siteId) {
        res.status(400).json({
          success: false,
          error: 'siteId 파라미터가 필요합니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🧪 크롤링 테스트 요청: ${siteId}`);
      
      const testResult = await crawlerService.testCrawlSite(siteId);
      
      const response: ApiResponse<any> = {
        success: testResult.success,
        data: {
          siteId,
          foundElements: testResult.foundElements,
          sampleElements: testResult.sampleElements,
          posts: testResult.posts,
          error: testResult.error,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error: any) {
      console.error('크롤링 테스트 오류:', error);
      next(error);
    }
  }

  /**
   * 최근 업데이트 시간을 구합니다.
   */
  private getLastUpdateTime(crawlerStatus: Record<string, any>): string | null {
    const timestamps = Object.values(crawlerStatus)
      .map((site: any) => site.lastCrawledAt)
      .filter(Boolean)
      .map(time => new Date(time).getTime());

    if (timestamps.length === 0) return null;

    const latestTimestamp = Math.max(...timestamps);
    return new Date(latestTimestamp).toISOString();
  }
}

export const statusController = new StatusController();