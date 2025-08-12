import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../../services/subscription.service';
import { subscriptionSchema } from '../validators/subscription.validator';
import { ApiResponse } from '../api.types';

export class SubscriptionController {
  subscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 입력값 검증
      const { error, value } = subscriptionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.details.map(d => d.message)
        } as ApiResponse);
        return;
      }

      const { token, sites } = value;

      // 구독 저장
      await subscriptionService.saveSubscription({ token, sites });

      res.json({
        success: true,
        message: '구독이 성공적으로 저장되었습니다.',
        data: {
          subscribedSites: sites.length,
          token: `${token.substring(0, 10)}...`
        }
      } as ApiResponse);

    } catch (error) {
      console.error('구독 저장 오류:', error);
      next(error);
    }
  }
}

export const subscriptionController = new SubscriptionController();