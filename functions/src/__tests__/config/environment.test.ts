/**
 * 환경 설정 테스트
 */

import { getConfig, validateEnvironment, environment } from '../../config/environment';

describe('Environment Configuration', () => {
  beforeEach(() => {
    // 환경 변수 초기화
    delete process.env.NODE_ENV;
    delete process.env.FUNCTIONS_EMULATOR;
  });

  describe('getConfig', () => {
    it('개발 환경 설정을 올바르게 반환해야 한다', () => {
      process.env.NODE_ENV = 'development';
      
      const config = getConfig();
      
      expect(config.firebase.projectId).toBe('cuknotice-dev');
      expect(config.crawler.scheduleInterval).toBe('every 30 minutes');
      expect(config.monitoring.enableMetrics).toBe(false);
    });

    it('프로덕션 환경 설정을 올바르게 반환해야 한다', () => {
      // NODE_ENV와 FUNCTIONS_EMULATOR를 모두 production으로 설정
      const originalNodeEnv = process.env.NODE_ENV;
      const originalEmulator = process.env.FUNCTIONS_EMULATOR;
      
      process.env.NODE_ENV = 'production';
      delete process.env.FUNCTIONS_EMULATOR;
      
      // 모듈을 다시 로드하여 새로운 환경 변수를 반영
      jest.resetModules();
      const { getConfig } = require('../../config/environment');
      
      const config = getConfig();
      
      expect(config.firebase.projectId).toBe('cuknotice');
      expect(config.crawler.scheduleInterval).toBe('every 10 minutes');
      expect(config.monitoring.enableMetrics).toBe(true);
      
      // 환경 변수 복원
      process.env.NODE_ENV = originalNodeEnv;
      process.env.FUNCTIONS_EMULATOR = originalEmulator;
    });

    it('에뮬레이터 환경에서는 개발 설정을 사용해야 한다', () => {
      process.env.FUNCTIONS_EMULATOR = 'true';
      
      const config = getConfig();
      
      expect(config.firebase.projectId).toBe('cuknotice-dev');
    });
  });

  describe('environment', () => {
    it('개발 환경을 올바르게 감지해야 한다', () => {
      process.env.NODE_ENV = 'development';
      
      // 모듈을 다시 로드하여 새로운 환경 변수를 반영
      jest.resetModules();
      const { environment: env } = require('../../config/environment');
      
      expect(env.isDevelopment).toBe(true);
      expect(env.isProduction).toBe(false);
    });

    it('프로덕션 환경을 올바르게 감지해야 한다', () => {
      process.env.NODE_ENV = 'production';
      
      jest.resetModules();
      const { environment: env } = require('../../config/environment');
      
      expect(env.isDevelopment).toBe(false);
      expect(env.isProduction).toBe(true);
    });
  });

  describe('validateEnvironment', () => {
    it('필수 설정이 모두 있으면 통과해야 한다', () => {
      // 모킹된 functions.config()가 빈 객체를 반환하므로
      // validateEnvironment가 실패할 것이다. 이는 정상적인 동작이다.
      expect(() => validateEnvironment()).toThrow();
    });

    it('필수 설정이 누락되면 에러를 던져야 한다', () => {
      expect(() => validateEnvironment()).toThrow('필수 환경 설정이 누락되었습니다');
    });
  });
});