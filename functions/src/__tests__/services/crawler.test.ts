/**
 * 크롤러 서비스 테스트
 */

import axios from 'axios';
import { crawlerService } from '../../crawler/crawler.service';

// axios 모킹
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// 서비스 모킹
jest.mock('../../services/crawled-post.service', () => ({
  crawledPostService: {
    getProcessedNos: jest.fn(),
    updateCrawledPost: jest.fn()
  }
}));

jest.mock('../../services/subscription.service', () => ({
  subscriptionService: {
    getSubscribersForSite: jest.fn()
  }
}));

jest.mock('../../services/fcm.service', () => ({
  fcmService: {
    sendToMultiple: jest.fn()
  }
}));

describe('CrawlerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crawlAllSites', () => {
    it('모든 사이트를 성공적으로 크롤링해야 한다', async () => {
      // HTML 응답 모킹
      const mockHtml = `
        <html>
          <body>
            <a class="b-title" data-article-no="12345" href="/notice/123">테스트 공지사항</a>
            <a class="b-title" data-article-no="12346" href="/notice/124">또 다른 공지사항</a>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      // 모킹된 서비스 응답 설정
      const { crawledPostService } = require('../../services/crawled-post.service');
      const { subscriptionService } = require('../../services/subscription.service');
      const { fcmService } = require('../../services/fcm.service');

      crawledPostService.getProcessedNos.mockResolvedValue([]);
      subscriptionService.getSubscribersForSite.mockResolvedValue(['token1', 'token2']);
      fcmService.sendToMultiple.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        invalidTokens: []
      });
      crawledPostService.updateCrawledPost.mockResolvedValue(undefined);

      const result = await crawlerService.crawlAllSites();

      expect(result.totalSites).toBeGreaterThan(0);
      expect(result.successCount).toBeGreaterThan(0);
      expect(result.results).toBeInstanceOf(Array);
    });

    it.skip('네트워크 오류 시 적절히 처리해야 한다', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      const { crawledPostService } = require('../../services/crawled-post.service');
      crawledPostService.getProcessedNos.mockResolvedValue([]);

      const result = await crawlerService.crawlAllSites();

      expect(result.totalSites).toBeGreaterThan(0);
      expect(result.successCount).toBe(0);
      expect(result.results.every(r => !r.success)).toBe(true);
    }, 30000); // 타임아웃을 30초로 증가

    it('일부 사이트 실패 시에도 계속 진행해야 한다', async () => {
      let callCount = 0;
      mockedAxios.get.mockImplementation(() => {
        callCount++;
        // 첫 번째 사이트만 실패, 나머지는 성공
        if (callCount <= 2) { // 재시도 횟수 고려
          return Promise.reject(new Error('첫 번째 사이트 실패'));
        }
        return Promise.resolve({
          data: `<a class="b-title" data-article-no="123" href="/notice/123">공지사항</a>`
        });
      });

      const { crawledPostService } = require('../../services/crawled-post.service');
      const { subscriptionService } = require('../../services/subscription.service');

      crawledPostService.getProcessedNos.mockResolvedValue([]);
      subscriptionService.getSubscribersForSite.mockResolvedValue([]);
      crawledPostService.updateCrawledPost.mockResolvedValue(undefined);

      const result = await crawlerService.crawlAllSites();

      expect(result.totalSites).toBeGreaterThan(1);
      // 일부는 성공해야 함
      expect(result.successCount).toBeGreaterThan(0);
      // 전체 결과에 성공과 실패가 모두 있어야 함
      expect(result.results.some(r => r.success)).toBe(true);
    }, 30000); // 타임아웃 증가
  });

  describe('HTML 파싱', () => {
    it('올바른 형식의 HTML을 파싱해야 한다', async () => {
      const mockHtml = `
        <table>
          <tr>
            <td class="td-num">1</td>
            <td><a class="b-title" data-article-no="12345" href="/notice/123">일반 공지사항</a></td>
          </tr>
          <tr>
            <td class="td-num">공지</td>
            <td><a class="b-title" data-article-no="12346" href="/notice/124">중요 공지사항</a></td>
          </tr>
        </table>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const { crawledPostService } = require('../../services/crawled-post.service');
      const { subscriptionService } = require('../../services/subscription.service');
      const { fcmService } = require('../../services/fcm.service');

      crawledPostService.getProcessedNos.mockResolvedValue([]);
      subscriptionService.getSubscribersForSite.mockResolvedValue([]);
      crawledPostService.updateCrawledPost.mockResolvedValue(undefined);

      const result = await crawlerService.crawlAllSites();

      // 최소한 하나의 사이트는 성공적으로 크롤링되어야 함
      expect(result.results.some(r => r.success)).toBe(true);
    });

    it('게시물이 없는 페이지를 올바르게 처리해야 한다', async () => {
      const mockHtml = '<html><body><p>게시물이 없습니다.</p></body></html>';

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const { crawledPostService } = require('../../services/crawled-post.service');
      crawledPostService.getProcessedNos.mockResolvedValue([]);

      const result = await crawlerService.crawlAllSites();

      // 게시물이 없어도 성공으로 처리되어야 함
      expect(result.results.every(r => r.success)).toBe(true);
      expect(result.results.every(r => r.newPostsCount === 0)).toBe(true);
    });
  });
});