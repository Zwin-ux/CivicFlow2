import { Router, Request, Response } from 'express';
import authService from '../services/authService';
import { authenticate } from '../middleware/authenticate';
import { LoginCredentials, CreateUserData } from '../models/user';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserData = req.body;

    // Validate required fields
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName || !userData.role) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: email, password, firstName, lastName, role',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Validate role
    const validRoles = ['Applicant', 'Reviewer', 'Approver', 'Administrator', 'Auditor'];
    if (!validRoles.includes(userData.role)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
          timestamp: new Date(),
        },
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          timestamp: new Date(),
        },
      });
      return;
    }

    // Validate password strength (minimum 8 characters)
    if (userData.password.length < 8) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters long',
          timestamp: new Date(),
        },
      });
      return;
    }

    const user = await authService.register(userData);

    res.status(201).json({
      data: user,
      message: 'User registered successfully',
    });
  } catch (error) {
    logger.error('Registration error', { error });
    
    if (error instanceof Error && error.message === 'User with this email already exists') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: error.message,
          timestamp: new Date(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register user',
        timestamp: new Date(),
      },
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Login user and return tokens
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials: LoginCredentials = req.body;

    // Validate required fields
    if (!credentials.email || !credentials.password) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: email, password',
          timestamp: new Date(),
        },
      });
      return;
    }

    const result = await authService.login(credentials);

    res.status(200).json({
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
      message: 'Login successful',
    });
  } catch (error) {
    logger.error('Login error', { error });
    
    if (error instanceof Error && (
      error.message === 'Invalid credentials' || 
      error.message === 'User account is inactive'
    )) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
          timestamp: new Date(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to login',
        timestamp: new Date(),
      },
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user by invalidating refresh token
 */
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
          timestamp: new Date(),
        },
      });
      return;
    }

    await authService.logout(refreshToken);

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout error', { error });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to logout',
        timestamp: new Date(),
      },
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
          timestamp: new Date(),
        },
      });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    logger.error('Token refresh error', { error });
    
    if (error instanceof Error && error.message.includes('Invalid or expired')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
          timestamp: new Date(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to refresh token',
        timestamp: new Date(),
      },
    });
  }
});

/**
 * POST /api/v1/auth/change-password
 * Change user password (requires authentication)
 */
router.post('/change-password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: currentPassword, newPassword',
          timestamp: new Date(),
        },
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'New password must be at least 8 characters long',
          timestamp: new Date(),
        },
      });
      return;
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    logger.error('Change password error', { error });
    
    if (error instanceof Error && error.message === 'Current password is incorrect') {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
          timestamp: new Date(),
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to change password',
        timestamp: new Date(),
      },
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user information
 */
router.get('/me', authenticate, (req: Request, res: Response): void => {
  res.status(200).json({
    data: req.user,
  });
});

export default router;
