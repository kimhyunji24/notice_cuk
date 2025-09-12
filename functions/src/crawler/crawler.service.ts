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
        
    console.log(`[${siteId}] DB에 저장된 번호:`, processedNos);
    console.log(`[${siteId}] 현재 파싱된 번호:`, currentPosts.map(p => p.no));
    console.log(`[${siteId}] 현재 파싱된 게시물:`, currentPosts.map(p => ({ no: p.no, title: p.title })));

    if (currentPosts.length === 0) {
      console.warn(`⚠️ [${siteId}] 게시글을 찾을 수 없습니다. HTML 구조를 확인하세요.`);
      console.log(`[${siteId}] 사용된 셀렉터: ${siteConfig.selector}`);
      
      // HTML 구조 디버깅을 위한 추가 정보
      const allElements = $(siteConfig.selector);
      console.log(`[${siteId}] 셀렉터로 찾은 요소 수: ${allElements.length}`);
      
      if (allElements.length > 0) {
        console.log(`[${siteId}] 첫 번째 요소 HTML:`, allElements.first().html());
      }
      
      return { siteId, success: true, newPostsCount: 0 };
    }

    // 새 게시물 식별
    const newPosts = currentPosts.filter(post => !processedNos.includes(post.no));

    if (newPosts.length > 0) {
      console.log(`🎉 [${siteId}] 새 글 ${newPosts.length}개 발견`);
      newPosts.forEach(post => {
        console.log(`  - 새 글: ${post.no} | ${post.title}`);
      });

      // 게시물 번호 순으로 정렬 (오래된 것부터)
      const sortedNewPosts = newPosts.sort((a, b) => parseInt(a.no) - parseInt(b.no));

      // 알림 발송
      for (const post of sortedNewPosts) {
        await this.sendNotificationForPost(post);
      }
    } else {
      console.log(`📭 [${siteId}] 새 글 없음`);
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
   * HTML에서 게시물들을 파싱합니다 - 개선된 버전
   */
  private parsePosts($: cheerio.CheerioAPI, config: any, siteId: string): Post[] {
    const posts: Post[] = [];
    const postElements = $(config.selector).slice(0, 20);

    console.log(`[${siteId}] 파싱 시작: ${postElements.length}개의 요소를 찾았습니다.`);
    console.log(`[${siteId}] 사용된 셀렉터: ${config.selector}`);

    postElements.each((index: number, element: any) => {
      const $el = $(element);
      
      // 다양한 방식으로 게시물 번호 추출 시도
      let articleNo = this.extractPostNumber($el, config, siteId);
      
      // 제목 추출 - 여러 방식 시도
      let title = this.extractTitle($el, config, siteId);
      
      // 링크 추출
      let link = this.extractLink($el, config, siteId);

      console.log(`[${siteId}] ${index + 1}번째 게시물 파싱 결과:`, {
        articleNo: articleNo || 'null',
        title: title || 'null',
        link: link || 'null',
        elementHtml: $el.html()?.substring(0, 200) + '...'
      });

      // 필수 정보가 없으면 건너뛰기
      if (!articleNo || !title) {
        console.warn(`[${siteId}] ${index + 1}번째 게시물 건너뜀: articleNo=${articleNo}, title=${title}`);
        return;
      }

      // 중요 공지 판단 (공지, 중요, 긴급 등의 키워드 또는 번호가 아닌 경우)
      const isImportant = this.determineImportance($el, articleNo, title);

      posts.push({
        no: articleNo,
        title: title.trim(),
        link: link,
        siteId,
        isImportant
      });
    });

    console.log(`[${siteId}] 파싱 완료: ${posts.length}개의 유효한 게시물을 수집했습니다.`);
    posts.forEach((post, index) => {
      console.log(`  ${index + 1}. ${post.no} | ${post.title} | ${post.isImportant ? '중요' : '일반'}`);
    });

    return posts;
  }

  /**
   * 게시물 번호 추출 - 다양한 방식 시도
   */
  private extractPostNumber($el: cheerio.Cheerio<Element>, config: any, siteId: string): string | null {
    // 방법 1: data-article-no 속성
    let articleNo = ($el as any).attr('data-article-no');
    if (articleNo) {
      console.log(`[${siteId}] 게시물 번호 추출 (data-article-no): ${articleNo}`);
      return articleNo;
    }

    // 방법 2: href에서 추출 (일반적인 패턴들)
    const href = ($el as any).attr('href') || ($el as any).find('a').attr('href');
    if (href) {
      // ?no=123, ?articleNo=123, ?seq=123 등의 패턴
      const urlPatterns = [
        /[?&](?:no|articleNo|seq|num|id)=(\d+)/i,
        /\/(\d+)(?:\?|$|\.html)/,
        /article\/(\d+)/
      ];
      
      for (const pattern of urlPatterns) {
        const match = href.match(pattern);
        if (match && match[1]) {
          console.log(`[${siteId}] 게시물 번호 추출 (URL 패턴): ${match[1]} from ${href}`);
          return match[1];
        }
      }
    }

    // 방법 3: 번호 컬럼에서 추출 (테이블 구조인 경우)
    const numberCell = ($el as any).find('.td-num, .num, td:first-child').first();
    if (numberCell.length > 0) {
      const numText = numberCell.text().trim();
      const numMatch = numText.match(/\d+/);
      if (numMatch) {
        console.log(`[${siteId}] 게시물 번호 추출 (번호 셀): ${numMatch[0]}`);
        return numMatch[0];
      }
    }

    // 방법 4: 전체 텍스트에서 번호 패턴 찾기
    const fullText = ($el as any).text();
    const numberPattern = /(\d{4,})/; // 4자리 이상 숫자
    const match = fullText.match(numberPattern);
    if (match) {
      console.log(`[${siteId}] 게시물 번호 추출 (텍스트 패턴): ${match[1]}`);
      return match[1];
    }

    // 방법 5: 인덱스 기반 (최후의 수단)
    const fallbackNo = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    console.warn(`[${siteId}] 게시물 번호를 찾을 수 없어 임시 번호 생성: ${fallbackNo}`);
    return fallbackNo;
  }

  /**
   * 제목 추출 - 다양한 방식 시도
   */
  private extractTitle($el: cheerio.Cheerio<Element>, config: any, siteId: string): string | null {
    // 방법 1: 링크 안의 텍스트
    const linkTitle = ($el as any).find('a').text().trim();
    if (linkTitle && linkTitle.length > 0) {
      console.log(`[${siteId}] 제목 추출 (링크 텍스트): ${linkTitle}`);
      return linkTitle;
    }

    // 방법 2: 제목 컬럼 클래스
    const titleClasses = ['.title', '.subject', '.td-subject', '.board-title'];
    for (const titleClass of titleClasses) {
      const titleEl = ($el as any).find(titleClass).first();
      if (titleEl.length > 0) {
        const title = titleEl.text().trim();
        if (title) {
          console.log(`[${siteId}] 제목 추출 (클래스 ${titleClass}): ${title}`);
          return title;
        }
      }
    }

    // 방법 3: 전체 텍스트에서 의미있는 부분 추출
    const fullText = ($el as any).text().trim();
    if (fullText && fullText.length > 0) {
      // 번호나 날짜를 제외한 의미있는 텍스트 추출
      const cleanTitle = fullText
        .replace(/^\d+\s*/, '') // 앞의 번호 제거
        .replace(/\d{4}-\d{2}-\d{2}.*$/, '') // 뒤의 날짜 제거
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanTitle && cleanTitle.length > 5) {
        console.log(`[${siteId}] 제목 추출 (정제된 텍스트): ${cleanTitle}`);
        return cleanTitle;
      }
    }

    console.warn(`[${siteId}] 제목을 찾을 수 없습니다`);
    return null;
  }

  /**
   * 링크 추출
   */
  private extractLink($el: cheerio.Cheerio<Element>, config: any, siteId: string): string {
    let link = ($el as any).attr('href') || ($el as any).find('a').attr('href') || '';
    
    if (link && !link.startsWith('http')) {
      // 상대 URL을 절대 URL로 변환
      try {
        link = new URL(link, config.url).href;
      } catch (error) {
        console.warn(`[${siteId}] URL 변환 실패: ${link}`);
        link = config.url + (link.startsWith('/') ? '' : '/') + link;
      }
    }

    return link || config.url;
  }

  /**
   * 중요 공지 판단
   */
  private determineImportance($el: cheerio.Cheerio<Element>, articleNo: string, title: string): boolean {
    // 번호가 숫자가 아닌 경우 (공지, 중요 등)
    if (isNaN(parseInt(articleNo))) {
      return true;
    }

    // 제목에 중요 키워드가 있는 경우
    const importantKeywords = ['중요', '긴급', '공지', '[공지]', '[중요]', '[필독]', '필독'];
    const hasImportantKeyword = importantKeywords.some(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    );

    // 특별한 스타일이 적용된 경우 (빨간색, 굵은 글씨 등)
    const hasSpecialStyle = ($el as any).find('.notice, .important, .urgent').length > 0 ||
                           ($el as any).hasClass('notice') || 
                           ($el as any).hasClass('important');

    return hasImportantKeyword || hasSpecialStyle;
  }

  /**
   * 게시물에 대한 알림을 발송합니다
   */
  private async sendNotificationForPost(post: Post): Promise<void> {
    try {
      // 해당 사이트를 구독한 사용자들의 토큰 가져오기
      const subscribers = await subscriptionService.getSubscribersForSite(post.siteId);

      console.log(`[${post.siteId}] 새 글 "${post.title}"의 구독자:`, subscribers);
      
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

      console.log(`[${post.siteId}] 🚨 FCM 발송 직전!`, {
        tokenCount: subscribers.length,
        notification: notificationData,
      });

      // FCM 알림 발송
      const result = await fcmService.sendToMultiple(subscribers, notificationData);
      
      console.log(`📢 [${post.siteId}] 알림 발송 완료:`, {
        성공: result.successCount,
        실패: result.failureCount,
        무효토큰: result.invalidTokens.length
      });

    } catch (error) {
      console.error(`❌ [${post.siteId}] 알림 발송 실패:`, error);
    }
  }
}

export const crawlerService = new CrawlerService();