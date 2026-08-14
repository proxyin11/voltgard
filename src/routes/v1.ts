import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/authController';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, ssoAuthSchema } from '../schemas/authSchemas';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// Auth & SSO Endpoints
router.post('/auth/register', authLimiter, validate(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/auth/login', authLimiter, validate(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/auth/sso', authLimiter, validate(ssoAuthSchema), (req, res, next) => authController.sso(req, res, next));
router.post('/auth/logout', (req, res, next) => authController.logout(req, res, next));
router.get('/auth/status', (req, res) => authController.status(req, res));

export default router;
