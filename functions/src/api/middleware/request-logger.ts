import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // 응답 완료 시점에 로그 출력
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;
    
    // IP는 개발/디버깅용으로만 로깅 (개인정보 고려)
    const clientIp = process.env.NODE_ENV === 'development' 
      ? ip 
      : 'xxx.xxx.xxx.xxx';
    
    console.log(`${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${clientIp}`);
  });
  
  next();
}