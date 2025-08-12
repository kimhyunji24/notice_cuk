/**
 * 사이트 관련 컨트롤러
 * 크롤링 대상 사이트 목록을 관리합니다.
 */

import { Request, Response } from 'express';
import { SITE_CONFIGS } from '../../config/sites.config';

class SitesController {
  /**
   * 모든 사이트 목록을 반환합니다.
   */
  async getSites(req: Request, res: Response): Promise<void> {
    try {
      // 카테고리별로 그룹화
      const categorizedSites = Object.entries(SITE_CONFIGS).reduce((acc, [siteId, siteConfig]) => {
        const category = siteConfig.category;
        
        if (!acc[category]) {
          acc[category] = [];
        }
        
        acc[category].push({
          id: siteId,
          name: siteConfig.name,
          category: siteConfig.category
        });
        
        return acc;
      }, {} as Record<string, any[]>);

      // 각 카테고리별로 이름순 정렬
      Object.keys(categorizedSites).forEach(category => {
        categorizedSites[category].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      });

      res.json({
        success: true,
        data: {
          totalCount: Object.keys(SITE_CONFIGS).length,
          categories: categorizedSites,
          sites: Object.entries(SITE_CONFIGS).map(([siteId, siteConfig]) => ({
            id: siteId,
            name: siteConfig.name,
            category: siteConfig.category
          }))
        }
      });

    } catch (error) {
      console.error('사이트 목록 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: '사이트 목록을 가져오는데 실패했습니다.'
      });
    }
  }

  /**
   * 특정 카테고리의 사이트들을 반환합니다.
   */
  async getSitesByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.params;

      const filteredSites = Object.entries(SITE_CONFIGS)
        .filter(([, siteConfig]) => siteConfig.category === category)
        .map(([siteId, siteConfig]) => ({
          id: siteId,
          name: siteConfig.name,
          category: siteConfig.category
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

      res.json({
        success: true,
        data: {
          category,
          count: filteredSites.length,
          sites: filteredSites
        }
      });

    } catch (error) {
      console.error('카테고리별 사이트 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: '카테고리별 사이트 목록을 가져오는데 실패했습니다.'
      });
    }
  }

  /**
   * 사용 가능한 모든 카테고리 목록을 반환합니다.
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = [...new Set(Object.values(SITE_CONFIGS).map(site => site.category))];
      categories.sort((a, b) => a.localeCompare(b, 'ko'));

      res.json({
        success: true,
        data: {
          categories,
          count: categories.length
        }
      });

    } catch (error) {
      console.error('카테고리 목록 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: '카테고리 목록을 가져오는데 실패했습니다.'
      });
    }
  }
}

export const sitesController = new SitesController();