/**
 * Key Management Routes
 * API endpoints for encryption key management operations
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import {
  getKeyMetadata,
  rotateEncryptionKey,
  isKeyRotationNeeded,
} from '../utils/keyManagement';
import logger from '../utils/logger';

const router = Router();

/**
 * @route GET /api/v1/key-management/metadata
 * @desc Get encryption key metadata
 * @access Administrator only
 */
router.get(
  '/metadata',
  authenticate,
  authorize('Administrator'),
  async (req: Request, res: Response) => {
    try {
      const metadata = await getKeyMetadata();

      logger.info('Key metadata retrieved', {
        userId: req.user?.userId,
        keyId: metadata.keyId,
      });

      res.json({
        success: true,
        data: metadata,
      });
    } catch (error) {
      logger.error('Failed to get key metadata', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: {
          code: 'KEY_METADATA_ERROR',
          message: 'Failed to retrieve key metadata',
        },
      });
    }
  }
);

/**
 * @route GET /api/v1/key-management/rotation-status
 * @desc Check if key rotation is needed
 * @access Administrator only
 */
router.get(
  '/rotation-status',
  authenticate,
  authorize('Administrator'),
  async (req: Request, res: Response) => {
    try {
      const rotationNeeded = await isKeyRotationNeeded();
      const metadata = await getKeyMetadata();

      logger.info('Key rotation status checked', {
        userId: req.user?.userId,
        rotationNeeded,
      });

      res.json({
        success: true,
        data: {
          rotationNeeded,
          lastRotated: metadata.lastRotated,
          nextRotation: metadata.nextRotation,
        },
      });
    } catch (error) {
      logger.error('Failed to check rotation status', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: {
          code: 'ROTATION_STATUS_ERROR',
          message: 'Failed to check rotation status',
        },
      });
    }
  }
);

/**
 * @route POST /api/v1/key-management/rotate
 * @desc Rotate the encryption key
 * @access Administrator only
 */
router.post(
  '/rotate',
  authenticate,
  authorize('Administrator'),
  async (req: Request, res: Response) => {
    try {
      logger.info('Key rotation initiated', { userId: req.user?.userId });

      await rotateEncryptionKey();

      const metadata = await getKeyMetadata();

      logger.info('Key rotation completed successfully', {
        userId: req.user?.userId,
        keyId: metadata.keyId,
        version: metadata.version,
      });

      res.json({
        success: true,
        message: 'Encryption key rotated successfully',
        data: {
          keyId: metadata.keyId,
          version: metadata.version,
          rotatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Failed to rotate encryption key', { error, userId: req.user?.userId });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      res.status(500).json({
        success: false,
        error: {
          code: 'KEY_ROTATION_ERROR',
          message: errorMessage,
        },
      });
    }
  }
);

export default router;
