import Joi from 'joi';
import { SITE_CONFIGS } from '../../config/sites.config';

const validSiteIds = Object.keys(SITE_CONFIGS);

export const subscriptionSchema = Joi.object({
  token: Joi.string()
    .min(50)
    .max(500)
    .required()
    .description('FCM 토큰'),
  
  sites: Joi.array()
    .items(Joi.string().valid(...validSiteIds))
    .min(1)
    .max(50)
    .unique()
    .required()
    .description('구독할 사이트 ID 배열')
});