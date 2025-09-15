import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { subscriptionController } from './controller/subscription.controller';
import { statusController } from './controller/status.controller';
import { sitesController } from './controller/sites.controller';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

const app = express();

// 보안 미들웨어
app.use(helmet({
  contentSecurityPolicy: false // Firebase Hosting과의 호환성을 위해
}));

// CORS 설정
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}));

// 기본 미들웨어
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// 라우트
app.post('/subscribe', subscriptionController.subscribe);
app.get('/status', statusController.getStatus);

// 사이트 관련 라우트
app.get('/sites', sitesController.getSites);
app.get('/sites/categories', sitesController.getCategories);
app.get('/sites/category/:category', sitesController.getSitesByCategory);

// Health check
app.get('/health', statusController.getHealthCheck);

// 디버깅 엔드포인트 (개발/테스트용)
app.get('/test/crawl/:siteId', statusController.testCrawling);

// 간단한 ping 엔드포인트
app.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.originalUrl
  });
});

// 에러 핸들러
app.use(errorHandler);

export const apiRouter = app;