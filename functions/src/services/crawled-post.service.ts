import * as admin from 'firebase-admin';
import { SiteStatus } from '../api/api.types';
import { SITE_CONFIGS } from '../config/sites.config';

export interface CrawledPostData {
  processedNos: string[];
  lastTitle: string | null;
  lastPostNo: string | null;
  postCount: number;
  updatedAt?: admin.firestore.FieldValue;
}

export interface StoredCrawledPost {
  processedNos: string[];
  lastTitle: string | null;
  lastPostNo: string | null;
  postCount: number;
  updatedAt: admin.firestore.Timestamp;
}

class CrawledPostService {
  private readonly COLLECTION_NAME = 'crawled_posts';
  
  private get db() {
    return admin.firestore();
  }
  private readonly MAX_PROCESSED_NOS = 50; // 메모리 효율성을 위해 제한

  /**
   * 특정 사이트의 이미 처리된 게시물 번호들을 가져옵니다
   */
  async getProcessedNos(siteId: string): Promise<string[]> {
    try {
      const doc = await this.db.collection(this.COLLECTION_NAME).doc(siteId).get();
      
      if (!doc.exists) {
        return [];
      }

      const data = doc.data() as StoredCrawledPost;
      return data.processedNos || [];

    } catch (error) {
      console.error(`❌ [${siteId}] 처리된 게시물 번호 조회 실패:`, error);
      return [];
    }
  }

  /**
   * 크롤링된 게시물 정보를 업데이트합니다
   */
  async updateCrawledPost(siteId: string, data: CrawledPostData): Promise<void> {
    try {
      // 처리된 게시물 번호를 최신 순으로 제한
      const limitedProcessedNos = data.processedNos
        .slice(0, this.MAX_PROCESSED_NOS);

      const updateData: Partial<StoredCrawledPost> & {
        updatedAt: admin.firestore.FieldValue;
      } = {
        processedNos: limitedProcessedNos,
        lastTitle: data.lastTitle,
        lastPostNo: data.lastPostNo,
        postCount: data.postCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      };

      await this.db.collection(this.COLLECTION_NAME).doc(siteId).set(updateData, { merge: true });

      console.log(`💾 [${siteId}] 크롤링 상태 업데이트 완료`);

    } catch (error) {
      console.error(`❌ [${siteId}] 크롤링 상태 업데이트 실패:`, error);
      throw error;
    }
  }

  /**
   * 모든 사이트의 상태를 가져옵니다
   */
  async getAllSiteStatus(): Promise<Record<string, SiteStatus & { name: string; category: string }>> {
    try {
      const snapshot = await this.db.collection(this.COLLECTION_NAME).get();
      const status: Record<string, SiteStatus & { name: string; category: string }> = {};

      // 모든 설정된 사이트에 대해 기본값 설정
      Object.keys(SITE_CONFIGS).forEach(siteId => {
        const config = SITE_CONFIGS[siteId];
        status[siteId] = {
          name: config.name,
          category: config.category,
          isActive: false,
          lastTitle: undefined,
          lastPostNo: undefined,
          updatedAt: undefined,
          postCount: 0
        };
      });

      // 실제 데이터로 업데이트
      snapshot.docs.forEach(doc => {
        const siteId = doc.id;
        const data = doc.data() as StoredCrawledPost;
        const config = SITE_CONFIGS[siteId];

        if (config) {
          status[siteId] = {
            name: config.name,
            category: config.category,
            isActive: true,
            lastTitle: data.lastTitle || undefined,
            lastPostNo: data.lastPostNo || undefined,
            updatedAt: data.updatedAt?.toDate().toISOString() || undefined,
            postCount: data.postCount || 0
          };
        }
      });

      return status;

    } catch (error) {
      console.error('❌ 사이트 상태 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 사이트의 크롤링 데이터를 가져옵니다 (전체 데이터)
   */
  async getCrawledPost(siteId: string): Promise<StoredCrawledPost | null> {
    try {
      const doc = await this.db.collection(this.COLLECTION_NAME).doc(siteId).get();
      
      if (!doc.exists) {
        return null;
      }

      return doc.data() as StoredCrawledPost;

    } catch (error) {
      console.error(`❌ [${siteId}] 크롤링 데이터 조회 실패:`, error);
      return null;
    }
  }

  /**
   * 특정 사이트의 상태를 가져옵니다
   */
  async getSiteStatus(siteId: string): Promise<SiteStatus | null> {
    try {
      const doc = await this.db.collection(this.COLLECTION_NAME).doc(siteId).get();
      
      if (!doc.exists) {
        return {
          isActive: false,
          lastTitle: undefined,
          lastPostNo: undefined,
          updatedAt: undefined,
          postCount: 0
        };
      }

      const data = doc.data() as StoredCrawledPost;
      
      return {
        isActive: true,
        lastTitle: data.lastTitle || undefined,
        lastPostNo: data.lastPostNo || undefined,
        updatedAt: data.updatedAt?.toDate().toISOString() || undefined,
        postCount: data.postCount || 0
      };

    } catch (error) {
      console.error(`❌ [${siteId}] 사이트 상태 조회 실패:`, error);
      return null;
    }
  }

  /**
   * 오래된 데이터를 정리합니다
   */
  async cleanupOldData(): Promise<void> {
    try {
      const snapshot = await this.db.collection(this.COLLECTION_NAME).get();
      const batch = this.db.batch();

      snapshot.docs.forEach(doc => {
        const data = doc.data() as StoredCrawledPost;
        
        // processedNos가 너무 많은 경우 제한
        if (data.processedNos && data.processedNos.length > this.MAX_PROCESSED_NOS) {
          const limitedNos = data.processedNos.slice(0, this.MAX_PROCESSED_NOS);
          batch.update(doc.ref, { processedNos: limitedNos });
        }
      });

      await batch.commit();
      console.log('🧹 오래된 크롤링 데이터 정리 완료');

    } catch (error) {
      console.error('❌ 오래된 데이터 정리 실패:', error);
    }
  }
}

export const crawledPostService = new CrawledPostService();