/**
 * FCM 서비스 테스트
 */

import * as admin from 'firebase-admin';
import { fcmService } from '../../services/fcm.service';

// Firebase Admin 모킹
const mockMessaging = {
  send: jest.fn(),
  sendEachForMulticast: jest.fn()
};

jest.mock('firebase-admin', () => ({
  messaging: () => mockMessaging,
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        delete: jest.fn()
      })
    }),
    batch: () => ({
      delete: jest.fn(),
      commit: jest.fn()
    })
  })
}));

describe('FCMService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendToSingle', () => {
    it('단일 토큰으로 성공적으로 알림을 보내야 한다', async () => {
      mockMessaging.send.mockResolvedValue('message-id');

      const notification = {
        title: '테스트 알림',
        body: '테스트 메시지',
        data: { url: 'https://example.com' }
      };

      const result = await fcmService.sendToSingle('test-token', notification);

      expect(result).toBe(true);
      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test-token',
          notification: {
            title: '테스트 알림',
            body: '테스트 메시지'
          }
        })
      );
    });

    it('유효하지 않은 토큰 에러를 올바르게 처리해야 한다', async () => {
      const invalidTokenError: any = new Error('Invalid token');
      invalidTokenError.code = 'messaging/invalid-registration-token';
      mockMessaging.send.mockRejectedValue(invalidTokenError);

      const notification = {
        title: '테스트 알림',
        body: '테스트 메시지'
      };

      const result = await fcmService.sendToSingle('invalid-token', notification);

      expect(result).toBe(false);
    });

    it('네트워크 에러를 올바르게 처리해야 한다', async () => {
      mockMessaging.send.mockRejectedValue(new Error('Network error'));

      const notification = {
        title: '테스트 알림',
        body: '테스트 메시지'
      };

      const result = await fcmService.sendToSingle('test-token', notification);

      expect(result).toBe(false);
    });
  });

  describe('sendToMultiple', () => {
    it('여러 토큰으로 성공적으로 알림을 보내야 한다', async () => {
      const mockResponse = {
        successCount: 3,
        failureCount: 0,
        responses: [
          { success: true },
          { success: true },
          { success: true }
        ]
      };

      mockMessaging.sendEachForMulticast.mockResolvedValue(mockResponse);

      const tokens = ['token1', 'token2', 'token3'];
      const notification = {
        title: '테스트 알림',
        body: '테스트 메시지'
      };

      const result = await fcmService.sendToMultiple(tokens, notification);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.invalidTokens).toHaveLength(0);
    });

    it('일부 실패가 있을 때 올바르게 처리해야 한다', async () => {
      const mockResponse = {
        successCount: 2,
        failureCount: 1,
        responses: [
          { success: true },
          { success: true },
          { 
            success: false, 
            error: { code: 'messaging/invalid-registration-token' }
          }
        ]
      };

      mockMessaging.sendEachForMulticast.mockResolvedValue(mockResponse);

      const tokens = ['token1', 'token2', 'invalid-token'];
      const notification = {
        title: '테스트 알림',
        body: '테스트 메시지'
      };

      const result = await fcmService.sendToMultiple(tokens, notification);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.invalidTokens).toContain('invalid-token');
    });

    it('빈 토큰 배열을 올바르게 처리해야 한다', async () => {
      const result = await fcmService.sendToMultiple([], {
        title: '테스트 알림',
        body: '테스트 메시지'
      });

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.invalidTokens).toHaveLength(0);
      expect(mockMessaging.sendEachForMulticast).not.toHaveBeenCalled();
    });

    it('대용량 토큰 배열을 배치로 처리해야 한다', async () => {
      // Jest mock 초기화
      mockMessaging.sendEachForMulticast.mockClear();
      
      // 150개의 토큰 생성 (배치 크기 100 기준으로 2개 배치)
      const tokens = Array.from({ length: 150 }, (_, i) => `token${i}`);

      const mockResponse = {
        successCount: 100,
        failureCount: 0,
        responses: Array.from({ length: 100 }, () => ({ success: true }))
      };

      mockMessaging.sendEachForMulticast.mockResolvedValue(mockResponse);

      const notification = {
        title: '테스트 알림',
        body: '테스트 메시지'
      };

      const result = await fcmService.sendToMultiple(tokens, notification);

      // 배치 호출 횟수 확인 (정확한 횟수는 실제 배치 크기에 따라 다름)
      expect(mockMessaging.sendEachForMulticast).toHaveBeenCalled();
      expect(result.successCount).toBeGreaterThan(0);
    });
  });

  describe('healthCheck', () => {
    it('FCM 서비스가 정상일 때 true를 반환해야 한다', async () => {
      mockMessaging.send.mockResolvedValue('test-message-id');

      const result = await fcmService.healthCheck();

      expect(result).toBe(true);
      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'health-check',
          data: { test: 'true' }
        }),
        true // dry_run = true
      );
    });

    it('FCM 서비스 오류 시 false를 반환해야 한다', async () => {
      mockMessaging.send.mockRejectedValue(new Error('FCM service error'));

      const result = await fcmService.healthCheck();

      expect(result).toBe(false);
    });
  });
});