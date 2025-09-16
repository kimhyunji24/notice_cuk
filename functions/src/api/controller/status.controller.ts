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
   * 테스트용: 특정 사이트의 마지막 게시물을 processedNos에서 제거
   */
  async simulateNewPost(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      console.log(`🧪 새 글 시뮬레이션 요청: ${siteId}`);
      
      // 현재 processedNos 가져오기
      const crawledPost = await crawledPostService.getCrawledPost(siteId);
      if (!crawledPost || !crawledPost.processedNos || crawledPost.processedNos.length === 0) {
        res.status(404).json({
          success: false,
          error: '해당 사이트의 크롤링 데이터가 없습니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // 마지막 게시물 번호 제거
      const originalProcessedNos = [...crawledPost.processedNos];
      const removedPostNo = originalProcessedNos.pop(); // 마지막 게시물 제거
      
      // DB 업데이트
      await crawledPostService.updateCrawledPost(siteId, {
        processedNos: originalProcessedNos,
        lastTitle: crawledPost.lastTitle,
        lastPostNo: crawledPost.lastPostNo,
        postCount: crawledPost.postCount
      });

      console.log(`🧪 [${siteId}] 게시물 번호 ${removedPostNo} 제거완료. 다음 크롤링에서 새 글로 인식됩니다.`);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          siteId,
          removedPostNo,
          message: '다음 크롤링(최대 10분 후)에서 해당 게시물이 새 글로 인식되어 알림이 발송됩니다.',
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error: any) {
      console.error('새 글 시뮬레이션 오류:', error);
      next(error);
    }
  }

  /**
   * 크롤러를 수동으로 실행합니다.
   * 테스트 및 디버깅 목적으로 사용됩니다.
   */
  async runCrawler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('🚀 수동 크롤러 실행 요청');

      // 크롤러 실행
      const result = await crawlerService.crawlAllSites();

      console.log('✅ 수동 크롤러 실행 완료:', result);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          message: '크롤러가 성공적으로 실행되었습니다.',
          result,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);
    } catch (error: any) {
      console.error('❌ 수동 크롤러 실행 실패:', error);
      const response: ApiResponse<any> = {
        success: false,
        error: '크롤러 실행 중 오류가 발생했습니다.',
        details: error.message
      };
      res.status(500).json(response);
    }
  }

  /**
   * 특정 사이트의 processedNos를 직접 수정합니다.
   * 디버깅 및 테스트 목적으로 사용됩니다.
   */
  async updateProcessedNos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { siteId } = req.params;
      const { processedNos } = req.body;
      
      if (!siteId) {
        res.status(400).json({
          success: false,
          error: 'siteId 파라미터가 필요합니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!Array.isArray(processedNos)) {
        res.status(400).json({
          success: false,
          error: 'processedNos는 배열이어야 합니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🔧 [${siteId}] processedNos 수동 수정 요청:`, processedNos);

      // 현재 데이터 조회
      const currentData = await crawledPostService.getCrawledPost(siteId);
      if (!currentData) {
        res.status(404).json({
          success: false,
          error: '해당 사이트의 데이터가 없습니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // processedNos 업데이트
      await crawledPostService.updateCrawledPost(siteId, {
        processedNos: processedNos,
        lastTitle: currentData.lastTitle,
        lastPostNo: currentData.lastPostNo,
        postCount: currentData.postCount
      });

      console.log(`✅ [${siteId}] processedNos 수정 완료: ${processedNos.length}개`);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          siteId,
          processedNos,
          message: 'processedNos가 성공적으로 수정되었습니다.',
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error: any) {
      console.error('processedNos 수정 실패:', error);
      const response: ApiResponse<any> = {
        success: false,
        error: 'processedNos 수정 중 오류가 발생했습니다.',
        details: error.message
      };
      res.status(500).json(response);
    }
  }

  /**
   * 특정 사이트의 데이터를 조회합니다.
   */
  async getSiteData(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      console.log(`📊 [${siteId}] 사이트 데이터 조회 요청`);

      const siteData = await crawledPostService.getCrawledPost(siteId);
      if (!siteData) {
        res.status(404).json({
          success: false,
          error: '해당 사이트의 데이터가 없습니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const response: ApiResponse<any> = {
        success: true,
        data: {
          siteId,
          ...siteData,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error: any) {
      console.error('사이트 데이터 조회 실패:', error);
      const response: ApiResponse<any> = {
        success: false,
        error: '사이트 데이터 조회 중 오류가 발생했습니다.',
        details: error.message
      };
      res.status(500).json(response);
    }
  }

  /**
   * 사용자의 구독 상태를 조회합니다.
   */
  async getUserSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      
      if (!token) {
        res.status(400).json({
          success: false,
          error: 'FCM 토큰이 필요합니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`📊 사용자 구독 상태 조회 요청: ${token.substring(0, 20)}...`);

      const subscription = await subscriptionService.getSubscriptionByToken(token);
      if (!subscription) {
        res.status(404).json({
          success: false,
          error: '구독 정보를 찾을 수 없습니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // 구독한 사이트들의 상세 정보 가져오기
      const siteDetails = await Promise.all(
        subscription.sites.map(async (siteId) => {
          const siteData = await crawledPostService.getCrawledPost(siteId);
          return {
            siteId,
            lastPostNo: siteData?.lastPostNo || null,
            lastTitle: siteData?.lastTitle || null,
            postCount: siteData?.postCount || 0,
            updatedAt: siteData?.updatedAt || null
          };
        })
      );

      const response: ApiResponse<any> = {
        success: true,
        data: {
          token: token.substring(0, 20) + '...',
          sites: subscription.sites,
          siteDetails,
          subscribedAt: subscription.createdAt,
          lastUpdated: subscription.updatedAt,
          totalSites: subscription.sites.length,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error: any) {
      console.error('사용자 구독 상태 조회 실패:', error);
      const response: ApiResponse<any> = {
        success: false,
        error: '구독 상태 조회 중 오류가 발생했습니다.',
        details: error.message
      };
      res.status(500).json(response);
    }
  }

  /**
   * 사용자의 구독을 업데이트합니다.
   */
  async updateUserSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      const { siteIds } = req.body;
      
      if (!token) {
        res.status(400).json({
          success: false,
          error: 'FCM 토큰이 필요합니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!Array.isArray(siteIds)) {
        res.status(400).json({
          success: false,
          error: 'siteIds는 배열이어야 합니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🔧 사용자 구독 업데이트 요청: ${token.substring(0, 20)}..., 사이트: ${siteIds.length}개`);

      // 기존 구독 정보 조회
      const existingSubscription = await subscriptionService.getSubscriptionByToken(token);
      if (!existingSubscription) {
        res.status(404).json({
          success: false,
          error: '구독 정보를 찾을 수 없습니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // 구독 업데이트
      await subscriptionService.saveSubscription({
        token,
        sites: siteIds
      });

      console.log(`✅ 사용자 구독 업데이트 완료: ${siteIds.length}개 사이트`);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          token: token.substring(0, 20) + '...',
          sites: siteIds,
          totalSites: siteIds.length,
          message: '구독이 성공적으로 업데이트되었습니다.',
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error: any) {
      console.error('사용자 구독 업데이트 실패:', error);
      const response: ApiResponse<any> = {
        success: false,
        error: '구독 업데이트 중 오류가 발생했습니다.',
        details: error.message
      };
      res.status(500).json(response);
    }
  }

  /**
   * 사용자의 구독을 삭제합니다.
   */
  async deleteUserSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      
      if (!token) {
        res.status(400).json({
          success: false,
          error: 'FCM 토큰이 필요합니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`🗑️ 사용자 구독 삭제 요청: ${token.substring(0, 20)}...`);

      const deleted = await subscriptionService.deleteSubscription(token);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: '구독 정보를 찾을 수 없습니다.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log(`✅ 사용자 구독 삭제 완료`);

      const response: ApiResponse<any> = {
        success: true,
        data: {
          token: token.substring(0, 20) + '...',
          message: '구독이 성공적으로 삭제되었습니다.',
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error: any) {
      console.error('사용자 구독 삭제 실패:', error);
      const response: ApiResponse<any> = {
        success: false,
        error: '구독 삭제 중 오류가 발생했습니다.',
        details: error.message
      };
      res.status(500).json(response);
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