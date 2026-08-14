import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please log in.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.login(req.body);
      (req.session as any).userId = user.id;
      (req.session as any).email = user.email;
      (req.session as any).lastActivity = Date.now();

      res.json({
        success: true,
        message: 'Login successful.',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async sso(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.authenticateSSO(req.body);
      (req.session as any).userId = user.id;
      (req.session as any).email = user.email;
      (req.session as any).lastActivity = Date.now();

      res.json({
        success: true,
        message: `${req.body.ssoProvider.toUpperCase()} SSO authentication successful.`,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully.' });
    });
  }

  async status(req: Request, res: Response) {
    if (req.session && (req.session as any).userId) {
      res.json({
        success: true,
        authenticated: true,
        data: {
          userId: (req.session as any).userId,
          email: (req.session as any).email,
        },
      });
    } else {
      res.json({ success: true, authenticated: false });
    }
  }
}

export const authController = new AuthController();
