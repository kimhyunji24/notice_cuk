/**
 * 테스트 환경 검증
 */

describe('Test Environment Setup', () => {
  it('should have correct NODE_ENV', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have FUNCTIONS_EMULATOR set', () => {
    expect(process.env.FUNCTIONS_EMULATOR).toBe('true');
  });

  it('should have mocked console functions', () => {
    expect(typeof console.log).toBe('function');
    expect(typeof console.warn).toBe('function');
    expect(typeof console.info).toBe('function');
  });
});