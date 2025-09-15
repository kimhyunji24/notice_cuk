import * as admin from 'firebase-admin';
import { config } from '../config/environment';

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

class FCMService {
  private readonly BATCH_SIZE = config.fcm.batchSize; // FCM 배치 전송 제한

  /**
   * 단일 토큰에 알림을 발송합니다
   */
  async sendToSingle(token: string, notification: NotificationData): Promise<boolean> {
    try {
      const message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icon-192.png',
            badge: notification.badge || '/badge-72.png',
            requireInteraction: true,
            actions: [
              {
                action: 'open',
                title: '확인하기'
              }
            ]
          },
          fcmOptions: {
            link: notification.data?.url || '/'
          },
          data: notification.data || {}
        }
      };

      await admin.messaging().send(message);
      console.log(`📤 FCM 단일 전송 성공: ${token.substring(0, 10)}...`);
      return true;

    } catch (error: any) {
      console.error(`❌ FCM 단일 전송 실패: ${token.substring(0, 10)}...`, error.message);
      
      // 유효하지 않은 토큰인 경우 정리 필요
      if (this.isInvalidTokenError(error)) {
        await this.removeInvalidToken(token);
      }
      
      return false;
    }
  }

  /**
   * 여러 토큰에 알림을 발송합니다
   */
  async sendToMultiple(tokens: string[], notification: NotificationData): Promise<{
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
  }> {
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    console.log(`📤 FCM 다중 전송 시작: ${tokens.length}개 토큰`);

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    // 배치로 나누어 처리
    for (let i = 0; i < tokens.length; i += this.BATCH_SIZE) {
      const batch = tokens.slice(i, i + this.BATCH_SIZE);
      
      const multicastMessage = {
        tokens: batch,
        notification: {
          title: notification.title,
          body: notification.body
        },
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icon-192.png',
            badge: notification.badge || '/badge-72.png',
            requireInteraction: true,
            actions: [
              {
                action: 'open',
                title: '확인하기'
              }
            ]
          },
          fcmOptions: {
            link: notification.data?.url || '/'
          },
          data: notification.data || {}
        }
      };

      try {
        const response = await admin.messaging().sendEachForMulticast(multicastMessage);
        
        successCount += response.successCount;
        failureCount += response.failureCount;

        // 실패한 토큰들 중 유효하지 않은 토큰 식별
        response.responses.forEach((result, index) => {
          if (!result.success && result.error) {
            const token = batch[index];
            if (this.isInvalidTokenError(result.error)) {
              invalidTokens.push(token);
            }
          }
        });

      } catch (error) {
        console.error(`❌ FCM 배치 전송 실패:`, error);
        failureCount += batch.length;
      }
    }

    // 유효하지 않은 토큰들 정리
    if (invalidTokens.length > 0) {
      await this.removeInvalidTokens(invalidTokens);
    }

    console.log(`📊 FCM 전송 완료: 성공 ${successCount}, 실패 ${failureCount}, 무효토큰 ${invalidTokens.length}`);

    return {
      successCount,
      failureCount,
      invalidTokens
    };
  }

  /**
   * 주제(topic)에 알림을 발송합니다
   */
  async sendToTopic(topic: string, notification: NotificationData): Promise<boolean> {
    try {
      const message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body
        },
        webpush: {
          notification: {
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icon-192.png',
            badge: notification.badge || '/badge-72.png'
          },
          data: notification.data || {}
        }
      };

      await admin.messaging().send(message);
      console.log(`📤 FCM 주제 전송 성공: ${topic}`);
      return true;

    } catch (error) {
      console.error(`❌ FCM 주제 전송 실패: ${topic}`, error);
      return false;
    }
  }

  /**
   * 유효하지 않은 토큰 에러인지 확인합니다
   */
  private isInvalidTokenError(error: any): boolean {
    const invalidErrorCodes = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument'
    ];
    
    return invalidErrorCodes.includes(error.code);
  }

  /**
   * 단일 유효하지 않은 토큰을 제거합니다
   */
  private async removeInvalidToken(token: string): Promise<void> {
    try {
      await admin.firestore().collection('subscriptions').doc(token).delete();
      console.log(`🗑️ 유효하지 않은 토큰 제거: ${token.substring(0, 10)}...`);
    } catch (error) {
      console.error(`❌ 토큰 제거 실패: ${token.substring(0, 10)}...`, error);
    }
  }

  /**
   * 여러 유효하지 않은 토큰들을 제거합니다
   */
  private async removeInvalidTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;

    try {
      const db = admin.firestore();
      const batchSize = 500; // Firestore 배치 제한

      // 큰 배치를 작은 단위로 나누어 처리
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = db.batch();
        const currentBatch = tokens.slice(i, i + batchSize);
        
        currentBatch.forEach(token => {
          const docRef = db.collection('subscriptions').doc(token);
          batch.delete(docRef);
        });

        await batch.commit();
        console.log(`🗑️ 유효하지 않은 토큰 ${currentBatch.length}개 제거 완료 (${i + currentBatch.length}/${tokens.length})`);
      }
      
    } catch (error) {
      console.error(`❌ 토큰 일괄 제거 실패:`, error);
      // 개별 삭제로 재시도
      await this.removeTokensIndividually(tokens);
    }
  }

  /**
   * 토큰을 개별적으로 제거합니다 (배치 실패 시 사용)
   */
  private async removeTokensIndividually(tokens: string[]): Promise<void> {
    console.log(`🔄 개별 토큰 삭제 시작: ${tokens.length}개`);
    
    let successCount = 0;
    for (const token of tokens) {
      try {
        await admin.firestore().collection('subscriptions').doc(token).delete();
        successCount++;
      } catch (error) {
        console.error(`❌ 개별 토큰 삭제 실패: ${token.substring(0, 10)}...`, error);
      }
    }
    
    console.log(`✅ 개별 토큰 삭제 완료: ${successCount}/${tokens.length}`);
  }

  /**
   * FCM 서비스 상태를 확인합니다
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 테스트용 더미 메시지로 서비스 상태 확인
      const testMessage = {
        topic: 'health-check',
        data: { test: 'true' }
      };

      // dry_run 옵션을 사용하여 실제 전송 없이 검증만 수행
      await admin.messaging().send(testMessage, true);
      return true;
      
    } catch (error) {
      console.error('❌ FCM 서비스 상태 확인 실패:', error);
      return false;
    }
  }
}

export const fcmService = new FCMService();