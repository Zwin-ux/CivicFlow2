/**
 * Teams Configuration Admin Routes
 * REST API endpoints for managing Teams integration configuration
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import teamsRepository from '../../repositories/teamsRepository';
import teamsIntegrationService from '../../services/teamsIntegrationService';
import teamsConfigReloadService from '../../services/teamsConfigReloadService';
import graphClient from '../../clients/graphClient';
import auditLogRepository from '../../repositories/auditLogRepository';
import { EntityType } from '../../models/auditLog';
import logger from '../../utils/logger';
import { TeamsChannelConfig } from '../../models/teams';

const router = Router();

// All routes require authentication and Administrator role
router.use(authenticate);
router.use(authorize('Administrator'));

/**
 * @swagger
 * /admin/teams/config:
 *   get:
 *     summary: Get all Teams configurations
 *     description: Retrieve all Teams channel configurations
 *     tags: [Admin - Teams Configuration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configurations retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Administrator role required
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const configs = await teamsRepository.findAllActiveChannelConfigs();

    res.json({
      success: true,
      data: configs,
      count: configs.length,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve Teams configurations', {
      error: error.message,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Teams configurations',
    });
  }
});

/**
 * @swagger
 * /admin/teams/config/{id}:
 *   get:
 *     summary: Get Teams configuration by ID
 *     description: Retrieve a specific Teams channel configuration
 *     tags: [Admin - Teams Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Configuration ID
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const config = await teamsRepository.findChannelConfigById(id);

    if (!config) {
      res.status(404).json({
        success: false,
        error: 'Teams configuration not found',
      });
      return;
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve Teams configuration', {
      error: error.message,
      configId: req.params.id,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Teams configuration',
    });
  }
});

/**
 * @swagger
 * /admin/teams/config:
 *   post:
 *     summary: Create Teams configuration
 *     description: Create a new Teams channel configuration for a program type
 *     tags: [Admin - Teams Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - programType
 *               - teamId
 *               - channelId
 *             properties:
 *               programType:
 *                 type: string
 *               teamId:
 *                 type: string
 *               channelId:
 *                 type: string
 *               channelName:
 *                 type: string
 *               notificationRules:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Configuration created successfully
 *       400:
 *         description: Invalid request
 *       409:
 *         description: Configuration already exists for program type
 *       500:
 *         description: Internal server error
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { programType, teamId, channelId, channelName, notificationRules, isActive } = req.body;

    // Validate required fields
    if (!programType || !teamId || !channelId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: programType, teamId, channelId',
      });
      return;
    }

    // Check if configuration already exists for this program type
    const existing = await teamsRepository.findChannelConfigByProgramType(programType);
    if (existing) {
      res.status(409).json({
        success: false,
        error: `Teams configuration already exists for program type: ${programType}`,
      });
      return;
    }

    // Validate Teams channel exists
    if (graphClient.isInitialized()) {
      try {
        await graphClient.getChannel(teamId, channelId);
      } catch (error: any) {
        logger.warn('Teams channel validation failed', {
          error: error.message,
          teamId,
          channelId,
        });
        res.status(400).json({
          success: false,
          error: 'Invalid Teams channel ID or team ID. Please verify the channel exists.',
        });
        return;
      }
    }

    // Validate notification rules schema
    if (notificationRules) {
      const validKeys = [
        'NEW_SUBMISSION',
        'SLA_WARNING',
        'DECISION_READY',
        'DOCUMENTS_RECEIVED',
        'FRAUD_DETECTED',
        'STATUS_CHANGED',
        'DECISION_MADE',
      ];

      for (const key of Object.keys(notificationRules)) {
        if (!validKeys.includes(key)) {
          res.status(400).json({
            success: false,
            error: `Invalid notification rule key: ${key}. Valid keys: ${validKeys.join(', ')}`,
          });
          return;
        }

        if (typeof notificationRules[key] !== 'boolean') {
          res.status(400).json({
            success: false,
            error: `Notification rule values must be boolean. Invalid value for: ${key}`,
          });
          return;
        }
      }
    }

    // Create configuration
    const config = await teamsRepository.createChannelConfig({
      programType,
      teamId,
      channelId,
      channelName: channelName || `${programType} - Applications`,
      notificationRules: notificationRules || {
        NEW_SUBMISSION: true,
        SLA_WARNING: true,
        DECISION_READY: true,
        DOCUMENTS_RECEIVED: true,
        FRAUD_DETECTED: true,
      },
      isActive: isActive !== undefined ? isActive : true,
    });

    // Log configuration creation
    await auditLogRepository.create({
      actionType: 'TEAMS_CONFIG_CREATED',
      entityType: EntityType.SYSTEM,
      entityId: config.id,
      performedBy: req.user!.userId,
      details: {
        programType: config.programType,
        teamId: config.teamId,
        channelId: config.channelId,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Force reload configuration to apply changes immediately
    await teamsConfigReloadService.forceReload();

    logger.info('Teams configuration created', {
      configId: config.id,
      programType: config.programType,
      userId: req.user?.userId,
    });

    res.status(201).json({
      success: true,
      data: config,
      message: 'Teams configuration created successfully',
    });
  } catch (error: any) {
    logger.error('Failed to create Teams configuration', {
      error: error.message,
      body: req.body,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create Teams configuration',
    });
  }
});

/**
 * @swagger
 * /admin/teams/config/{id}:
 *   put:
 *     summary: Update Teams configuration
 *     description: Update an existing Teams channel configuration
 *     tags: [Admin - Teams Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Configuration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teamId:
 *                 type: string
 *               channelId:
 *                 type: string
 *               channelName:
 *                 type: string
 *               notificationRules:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { teamId, channelId, channelName, notificationRules, isActive } = req.body;

    // Check if configuration exists
    const existing = await teamsRepository.findChannelConfigById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Teams configuration not found',
      });
      return;
    }

    // Validate Teams channel if IDs are being updated
    if ((teamId || channelId) && graphClient.isInitialized()) {
      const validateTeamId = teamId || existing.teamId;
      const validateChannelId = channelId || existing.channelId;

      try {
        await graphClient.getChannel(validateTeamId, validateChannelId);
      } catch (error: any) {
        logger.warn('Teams channel validation failed', {
          error: error.message,
          teamId: validateTeamId,
          channelId: validateChannelId,
        });
        res.status(400).json({
          success: false,
          error: 'Invalid Teams channel ID or team ID. Please verify the channel exists.',
        });
        return;
      }
    }

    // Validate notification rules schema
    if (notificationRules) {
      const validKeys = [
        'NEW_SUBMISSION',
        'SLA_WARNING',
        'DECISION_READY',
        'DOCUMENTS_RECEIVED',
        'FRAUD_DETECTED',
        'STATUS_CHANGED',
        'DECISION_MADE',
      ];

      for (const key of Object.keys(notificationRules)) {
        if (!validKeys.includes(key)) {
          res.status(400).json({
            success: false,
            error: `Invalid notification rule key: ${key}. Valid keys: ${validKeys.join(', ')}`,
          });
          return;
        }

        if (typeof notificationRules[key] !== 'boolean') {
          res.status(400).json({
            success: false,
            error: `Notification rule values must be boolean. Invalid value for: ${key}`,
          });
          return;
        }
      }
    }

    // Build updates object
    const updates: Partial<Omit<TeamsChannelConfig, 'id' | 'createdAt' | 'updatedAt'>> = {};
    if (teamId !== undefined) updates.teamId = teamId;
    if (channelId !== undefined) updates.channelId = channelId;
    if (channelName !== undefined) updates.channelName = channelName;
    if (notificationRules !== undefined) updates.notificationRules = notificationRules;
    if (isActive !== undefined) updates.isActive = isActive;

    // Update configuration
    const config = await teamsIntegrationService.updateChannelConfig(id, updates);

    // Log configuration update
    await auditLogRepository.create({
      actionType: 'TEAMS_CONFIG_UPDATED',
      entityType: EntityType.SYSTEM,
      entityId: config.id,
      performedBy: req.user!.userId,
      details: {
        programType: config.programType,
        updates,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Force reload configuration to apply changes immediately
    await teamsConfigReloadService.forceReload();

    logger.info('Teams configuration updated', {
      configId: config.id,
      programType: config.programType,
      userId: req.user?.userId,
    });

    res.json({
      success: true,
      data: config,
      message: 'Teams configuration updated successfully',
    });
  } catch (error: any) {
    logger.error('Failed to update Teams configuration', {
      error: error.message,
      configId: req.params.id,
      body: req.body,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update Teams configuration',
    });
  }
});

/**
 * @swagger
 * /admin/teams/config/{id}:
 *   delete:
 *     summary: Deactivate Teams configuration
 *     description: Deactivate a Teams channel configuration (soft delete)
 *     tags: [Admin - Teams Configuration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Configuration ID
 *     responses:
 *       200:
 *         description: Configuration deactivated successfully
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if configuration exists
    const existing = await teamsRepository.findChannelConfigById(id);
    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Teams configuration not found',
      });
      return;
    }

    // Deactivate configuration (soft delete)
    await teamsIntegrationService.updateChannelConfig(id, { isActive: false });

    // Log configuration deactivation
    await auditLogRepository.create({
      actionType: 'TEAMS_CONFIG_DEACTIVATED',
      entityType: EntityType.SYSTEM,
      entityId: id,
      performedBy: req.user!.userId,
      details: {
        programType: existing.programType,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Force reload configuration to apply changes immediately
    await teamsConfigReloadService.forceReload();

    logger.info('Teams configuration deactivated', {
      configId: id,
      programType: existing.programType,
      userId: req.user?.userId,
    });

    res.json({
      success: true,
      message: 'Teams configuration deactivated successfully',
    });
  } catch (error: any) {
    logger.error('Failed to deactivate Teams configuration', {
      error: error.message,
      configId: req.params.id,
      userId: req.user?.userId,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to deactivate Teams configuration',
    });
  }
});

/**
 * @swagger
 * /admin/teams/config/test-connectivity:
 *   post:
 *     summary: Test Teams connectivity
 *     description: Test connectivity to Microsoft Teams using provided credentials
 *     tags: [Admin - Teams Configuration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamId
 *               - channelId
 *             properties:
 *               teamId:
 *                 type: string
 *               channelId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connectivity test successful
 *       400:
 *         description: Invalid request or connectivity failed
 *       500:
 *         description: Internal server error
 */
router.post('/test-connectivity', async (req: Request, res: Response): Promise<void> => {
  try {
    const { teamId, channelId } = req.body;

    if (!teamId || !channelId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: teamId, channelId',
      });
      return;
    }

    if (!graphClient.isInitialized()) {
      res.status(400).json({
        success: false,
        error: 'Microsoft Graph client not initialized. Teams integration is disabled.',
      });
      return;
    }

    // Test connectivity by fetching channel info
    const channel = await graphClient.getChannel(teamId, channelId);

    logger.info('Teams connectivity test successful', {
      teamId,
      channelId,
      userId: req.user?.userId,
    });

    res.json({
      success: true,
      message: 'Teams connectivity test successful',
      channel: {
        channelId: channel.channelId,
        channelName: channel.channelName,
        webUrl: channel.webUrl,
      },
    });
  } catch (error: any) {
    logger.error('Teams connectivity test failed', {
      error: error.message,
      body: req.body,
      userId: req.user?.userId,
    });

    res.status(400).json({
      success: false,
      error: 'Teams connectivity test failed. Please verify the team ID and channel ID.',
      details: error.message,
    });
  }
});

export default router;
