import axios from 'axios';
import * as cheerio from 'cheerio';
import { SITE_CONFIGS } from '../config/sites.config';
import { crawledPostService } from '../services/crawled-post.service';
import { subscriptionService } from '../services/subscription.service';
import { fcmService } from '../services/fcm.service';
import { config } from '../config/environment';

export interface CrawlResult {
  siteId: string;
  success: boolean;
  newPostsCount: number;
  error?: string;
}

export interface Post {
  no: string;
  title: string;
  link: string;
  siteId: string;
  isImportant: boolean;
}

class CrawlerService {
  private readonly CONCURRENT_LIMIT = config.crawler.concurrentLimit;
  private readonly REQUEST_TIMEOUT = config.crawler.requestTimeout;
  private readonly MAX_RETRIES = config.crawler.maxRetries;
  private readonly RETRY_DELAY = config.crawler.retryDelay;

  /**
   * 모든 사이트를 크롤링합니다
   */
  async crawlAllSites(): Promise<{
    totalSites: number;
    successCount: number;
    results: CrawlResult[];
  }> {
    console.log('🚀 전체 사이트 크롤링 시작');
    
    const siteEntries = Object.entries(SITE_CONFIGS);
    const results: CrawlResult[] = [];

    // 병렬 처리를 위해 청크로 나누기
    for (let i = 0; i < siteEntries.length; i += this.CONCURRENT_LIMIT) {
      const chunk = siteEntries.slice(i, i + this.CONCURRENT_LIMIT);
      
      const chunkResults = await Promise.allSettled(
        chunk.map(([siteId, config]) => this.crawlSite(siteId, config))
      );

      chunkResults.forEach((result, index) => {
        const siteId = chunk[index][0];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ [${siteId}] 크롤링 실패:`, result.reason.message);
          results.push({
            siteId,
            success: false,
            newPostsCount: 0,
            error: result.reason.message
          });
        }
      });
    }

    const successCount = results.filter(r => r.success).length;
    const totalNewPosts = results.reduce((sum, r) => sum + r.newPostsCount, 0);

    console.log(`✅ 크롤링 완료: ${successCount}/${siteEntries.length} 성공, 새 글 ${totalNewPosts}개`);

    return {
      totalSites: siteEntries.length,
      successCount,
      results
    };
  }

  /**
   * 단일 사이트를 크롤링합니다 (재시도 로직 포함)
   */
  private async crawlSite(siteId: string, siteConfig: any): Promise<CrawlResult> {
    console.log(`🔍 [${siteId}] 크롤링 시작: ${siteConfig.url}`);

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // 웹페이지 가져오기
        const { data } = await axios.get(siteConfig.url, {
          timeout: this.REQUEST_TIMEOUT,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        return await this.processSiteData(siteId, siteConfig, data);

      } catch (error: any) {
        console.error(`❌ [${siteId}] 크롤링 시도 ${attempt}/${this.MAX_RETRIES} 실패:`, error.message);
        
        if (attempt === this.MAX_RETRIES) {
          return {
            siteId,
            success: false,
            newPostsCount: 0,
            error: error.message
          };
        }
        
        // 재시도 전 대기
        await this.delay(this.RETRY_DELAY);
      }
    }

    // 이 코드는 실행되지 않지만 TypeScript를 위해 추가
    return { siteId, success: false, newPostsCount: 0, error: 'Unknown error' };
  }

  /**
   * 사이트 데이터 처리
   */
  private async processSiteData(siteId: string, siteConfig: any, data: string): Promise<CrawlResult> {
    const $ = cheerio.load(data);
    
    // 이전에 처리된 게시물 번호들 가져오기
    const processedNos = await crawledPostService.getProcessedNos(siteId);

    // 현재 게시물들 파싱
    const currentPosts = this.parsePosts($, siteConfig, siteId);
    
    if (currentPosts.length === 0) {
      console.warn(`⚠️ [${siteId}] 게시글을 찾을 수 없습니다`);
      return { siteId, success: true, newPostsCount: 0 };
    }

    // 새 게시물 식별
    const newPosts = currentPosts.filter(post => !processedNos.includes(post.no));

    if (newPosts.length > 0) {
      console.log(`🎉 [${siteId}] 새 글 ${newPosts.length}개 발견`);

      // 게시물 번호 순으로 정렬 (오래된 것부터)
      const sortedNewPosts = newPosts.sort((a, b) => parseInt(a.no) - parseInt(b.no));

      // 알림 발송
      for (const post of sortedNewPosts) {
        await this.sendNotificationForPost(post);
      }
    }

    // 크롤링 상태 업데이트
    await crawledPostService.updateCrawledPost(siteId, {
      processedNos: currentPosts.map(p => p.no),
      lastTitle: currentPosts[0]?.title || null,
      lastPostNo: currentPosts[0]?.no || null,
      postCount: currentPosts.length
    });

    console.log(`✅ [${siteId}] 크롤링 완료 - 새 글 ${newPosts.length}개`);

    return {
      siteId,
      success: true,
      newPostsCount: newPosts.length
    };
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * HTML에서 게시물들을 파싱합니다
   */
  private parsePosts($: cheerio.CheerioAPI, config: any, siteId: string): Post[] {
    const posts: Post[] = [];
    const postElements = $(config.selector).slice(0, 20); // 최신 20개만

    postElements.each((_index: number, element: any) => {
      const $el = $(element);
      const articleNo = $el.attr('data-article-no');
      
      if (!articleNo) return;

      const title = $el.text().trim();
      if (!title) return;

      // 링크 생성
      let link = $el.attr('href') || '';
      if (link && !link.startsWith('http')) {
        link = new URL(link, config.url).href;
      }

      // 게시물 번호로 중요공지 판단
      const postNumberElement = $el.closest('tr').find('.td-num');
      const postNumber = postNumberElement.text().trim();
      const isImportant = isNaN(parseInt(postNumber));

      posts.push({
        no: articleNo,
        title,
        link,
        siteId,
        isImportant
      });
    });

    return posts;
  }

  /**
   * 게시물에 대한 알림을 발송합니다
   */
  private async sendNotificationForPost(post: Post): Promise<void> {
    try {
      // 해당 사이트를 구독한 사용자들의 토큰 가져오기
      const subscribers = await subscriptionService.getSubscribersForSite(post.siteId);

      if (subscribers.length === 0) {
        console.log(`📭 [${post.siteId}] 구독자가 없습니다`);
        return;
      }

      const siteConfig = SITE_CONFIGS[post.siteId];
      const notificationData = {
        title: `${siteConfig.name} 새 공지사항`,
        body: post.title,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        data: {
          url: post.link,
          siteId: post.siteId,
          postNo: post.no,
          isImportant: post.isImportant
        }
      };

      // FCM 알림 발송
      await fcmService.sendToMultiple(subscribers, notificationData);

      console.log(`📢 [${post.siteId}] 알림 발송 완료: ${subscribers.length}명`);

    } catch (error) {
      console.error(`❌ [${post.siteId}] 알림 발송 실패:`, error);
    }
  }
}

export const crawlerService = new CrawlerService();