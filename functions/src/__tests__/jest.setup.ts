/**
 * Jest 테스트 환경 설정
 */

// Firebase Admin 모킹
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  apps: [],
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
        update: jest.fn()
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn()
      })),
      get: jest.fn()
    }))
  })),
  messaging: jest.fn(() => ({
    send: jest.fn(),
    sendEachForMulticast: jest.fn()
  }))
}));

// Firebase Functions 모킹
jest.mock('firebase-functions', () => ({
  config: jest.fn(() => ({})),
  region: jest.fn(() => ({
    runWith: jest.fn(() => ({
      https: {
        onRequest: jest.fn()
      },
      pubsub: {
        schedule: jest.fn(() => ({
          timeZone: jest.fn(() => ({
            onRun: jest.fn()
          }))
        }))
      }
    }))
  }))
}));

// 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.FUNCTIONS_EMULATOR = 'true';

// 콘솔 출력 제한 (에러는 표시)
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};