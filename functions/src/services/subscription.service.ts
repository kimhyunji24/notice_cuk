import * as admin from 'firebase-admin';

export interface SubscriptionData {
  token: string;
  sites: string[];
}

export interface StoredSubscription {
  sites: string[];
  updatedAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
}

class SubscriptionService {
  private readonly COLLECTION_NAME = 'subscriptions';
  
  private get db() {
    return admin.firestore();
  }

  /**
   * 구독 정보를 저장합니다
   */
  async saveSubscription({ token, sites }: SubscriptionData): Promise<void> {
    console.log('💾 구독 정보 저장:', { 
      token: `${token.substring(0, 20)}...`, 
      sitesCount: sites.length 
    });

    const subscriptionRef = this.db.collection(this.COLLECTION_NAME).doc(token);
    
    await subscriptionRef.set({
      sites,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('✅ 구독 정보 저장 완료');
  }

  /**
   * 특정 사이트를 구독한 사용자들의 FCM 토큰을 가져옵니다
   */
  async getSubscribersForSite(siteId: string): Promise<string[]> {
    try {
      const snapshot = await this.db
        .collection(this.COLLECTION_NAME)
        .where('sites', 'array-contains', siteId)
        .get();

      const tokens = snapshot.docs.map(doc => doc.id);
      
      console.log(`👥 [${siteId}] 구독자 ${tokens.length}명`);
      return tokens;

    } catch (error) {
      console.error(`❌ [${siteId}] 구독자 조회 실패:`, error);
      return [];
    }
  }

  /**
   * 특정 토큰의 구독 정보를 조회합니다
   */
  async getSubscriptionByToken(token: string): Promise<StoredSubscription | null> {
    try {
      const doc = await this.db.collection(this.COLLECTION_NAME).doc(token).get();
      
      if (!doc.exists) {
        return null;
      }

      return doc.data() as StoredSubscription;

    } catch (error) {
      console.error(`❌ 구독 정보 조회 실패:`, error);
      return null;
    }
  }

  /**
   * 구독을 삭제합니다
   */
  async deleteSubscription(token: string): Promise<boolean> {
    try {
      const docRef = this.db.collection(this.COLLECTION_NAME).doc(token);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return false;
      }

      await docRef.delete();
      console.log(`🗑️ 구독 삭제 완료: ${token.substring(0, 20)}...`);
      return true;

    } catch (error) {
      console.error(`❌ 구독 삭제 실패:`, error);
      return false;
    }
  }

  /**
   * 구독자 수 통계를 가져옵니다
   */
  async getSubscriptionStats(): Promise<{
    totalSubscribers: number;
    siteSubscriptions: Record<string, number>;
  }> {
    try {
      const snapshot = await this.db.collection(this.COLLECTION_NAME).get();
      
      const siteSubscriptions: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as StoredSubscription;
        data.sites.forEach(siteId => {
          siteSubscriptions[siteId] = (siteSubscriptions[siteId] || 0) + 1;
        });
      });

      return {
        totalSubscribers: snapshot.size,
        siteSubscriptions
      };

    } catch (error) {
      console.error('구독 통계 조회 실패:', error);
      return {
        totalSubscribers: 0,
        siteSubscriptions: {}
      };
    }
  }

  /**
   * 만료된 구독을 정리합니다 (30일 이상 업데이트되지 않은 구독)
   */
  async cleanupExpiredSubscriptions(): Promise<number> {
    try {
      const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const snapshot = await this.db
        .collection(this.COLLECTION_NAME)
        .where('updatedAt', '<', thirtyDaysAgo)
        .get();

      const batch = this.db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      console.log(`🧹 만료된 구독 ${snapshot.size}개 정리 완료`);
      return snapshot.size;

    } catch (error) {
      console.error('만료된 구독 정리 실패:', error);
      return 0;
    }
  }
}

export const subscriptionService = new SubscriptionService();