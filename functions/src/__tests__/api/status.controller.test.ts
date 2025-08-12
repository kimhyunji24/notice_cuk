/**
 * 상태 컨트롤러 테스트
 */

import request from 'supertest';
import express from 'express';
import { statusController } from '../../api/controller/status.controller';

// 서비스 모킹
jest.mock('../../services/crawled-post.service', () => ({
  crawledPostService: {
    getAllSiteStatus: jest.fn(),
    getProcessedNos: jest.fn().mockResolvedValue([]),
    updateCrawledData: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../services/subscription.service', () => ({
  subscriptionService: {
    getSubscriptionStats: jest.fn(),
    addSubscription: jest.fn().mockResolvedValue(true),
    removeSubscription: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../../services/monitoring.service', () => ({
  monitoringService: {
    performHealthCheck: jest.fn(),
    collectAndStoreMetrics: jest.fn().mockResolvedValue({}),
    sendAlert: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('StatusController', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.get('/status', statusController.getStatus);
    app.get('/health', statusController.getHealthCheck);
    
    // Error handling middleware for testing
    app.use((error: any, req: any, res: any, next: any) => {
      console.error('Test error middleware:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    });
    
    jest.clearAllMocks();
  });

  describe('GET /status', () => {
    it('정상적인 상태 정보를 반환해야 한다', async () => {
      const { crawledPostService } = require('../../services/crawled-post.service');
      const { subscriptionService } = require('../../services/subscription.service');
      const { monitoringService } = require('../../services/monitoring.service');

      // 모킹된 응답 설정
      crawledPostService.getAllSiteStatus.mockResolvedValue({
        'dept_computer_info': {
          lastCrawledAt: '2024-01-01T00:00:00.000Z',
          lastTitle: '테스트 공지사항',
          postCount: 5
        }
      });

      subscriptionService.getSubscriptionStats.mockResolvedValue({
        totalSubscribers: 100,
        siteSubscriptions: {
          'dept_computer_info': 50
        }
      });

      monitoringService.performHealthCheck.mockResolvedValue({
        status: 'healthy',
        checks: {
          firestore: true,
          fcm: true,
          crawler: true
        },
        details: {
          firestore: '정상',
          fcm: '정상',
          crawler: '정상'
        }
      });

      const response = await request(app)
        .get('/status');

      if (response.status !== 200) {
        console.error('Status controller error:', response.body);
        console.error('Response status:', response.status);
      }

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: '상태 조회 성공',
        data: {
          system: expect.objectContaining({
            status: 'healthy',
            environment: 'test'
          }),
          crawler: expect.objectContaining({
            totalSites: 1
          }),
          subscriptions: expect.objectContaining({
            totalSubscribers: 100
          }),
          health: expect.objectContaining({
            overall: 'healthy'
          })
        }
      });
    });

    it('서비스 오류 시 적절한 에러를 반환해야 한다', async () => {
      const { crawledPostService } = require('../../services/crawled-post.service');
      crawledPostService.getAllSiteStatus.mockRejectedValue(new Error('Database error'));

      // 에러 핸들러가 없으므로 Express가 기본 에러 처리를 함
      const response = await request(app)
        .get('/status')
        .expect(500);

      // Express 기본 에러 응답은 HTML이므로 JSON 체크를 하지 않음
    });
  });

  describe('GET /health', () => {
    it('모든 서비스가 정상일 때 200을 반환해야 한다', async () => {
      const { monitoringService } = require('../../services/monitoring.service');
      
      monitoringService.performHealthCheck.mockResolvedValue({
        status: 'healthy',
        checks: {
          firestore: true,
          fcm: true,
          crawler: true
        },
        details: {}
      });

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        checks: {
          firestore: true,
          fcm: true,
          crawler: true
        }
      });
    });

    it('서비스가 degraded 상태일 때 206을 반환해야 한다', async () => {
      const { monitoringService } = require('../../services/monitoring.service');
      
      monitoringService.performHealthCheck.mockResolvedValue({
        status: 'degraded',
        checks: {
          firestore: true,
          fcm: false,
          crawler: true
        },
        details: {}
      });

      const response = await request(app)
        .get('/health')
        .expect(206);

      expect(response.body.status).toBe('degraded');
    });

    it('서비스가 unhealthy 상태일 때 503을 반환해야 한다', async () => {
      const { monitoringService } = require('../../services/monitoring.service');
      
      monitoringService.performHealthCheck.mockResolvedValue({
        status: 'unhealthy',
        checks: {
          firestore: false,
          fcm: false,
          crawler: false
        },
        details: {}
      });

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });

    it('헬스체크 실행 중 오류 발생 시 503을 반환해야 한다', async () => {
      const { monitoringService } = require('../../services/monitoring.service');
      
      monitoringService.performHealthCheck.mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/health')
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        error: 'Health check failed'
      });
    });
  });
});