import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../api.types';

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('API Error:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: error.stack
  });

  // 이미 응답이 시작된 경우
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = '서버 내부 오류가 발생했습니다.';

  // 특정 오류 타입에 따른 처리
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = '입력 데이터가 올바르지 않습니다.';
  } else if (error.code === 'PERMISSION_DENIED') {
    statusCode = 403;
    message = '접근 권한이 없습니다.';
  } else if (error.code === 'NOT_FOUND') {
    statusCode = 404;
    message = '요청한 리소스를 찾을 수 없습니다.';
  }

  const response: ApiResponse = {
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      details: [error.message]
    })
  };

  res.status(statusCode).json(response);
}