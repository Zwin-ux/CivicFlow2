/**
 * Teams Integration Routes
 * REST API endpoints for Microsoft Teams webhook callbacks
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger';
import webhookService from '../services/webhookService';
import { WebhookRequest } from '../models/teams';

const router = Router();

/**
 * Validate webhook signature
 * Verifies that the request came from Microsoft Teams
 * @param payload - Request body as string
 * @param signature - Signature from request header
 * @returns True if signature is valid
 */
function validateWebhookSignature(payload: string, signature: string | undefined): boolean {
  if (!signature) {
    return false;
  }

  try {
    // Calculate expected signature using HMAC-SHA256
    const hmac = crypto.createHmac('sha256', config.teams.webhookSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures using timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Error validating webhook signature', { error });
    return false;
  }
}

/**
 * @swagger
 * /teams/webhook:
 *   post:
 *     summary: Receive Teams action callbacks
 *     description: Webhook endpoint for Microsoft Teams Adaptive Card action callbacks
 *     tags: [Teams Integration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: message
 *               value:
 *                 type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     example: APPROVE
 *                   applicationId:
 *                     type: string
 *                     format: uuid
 *               from:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   aadObjectId:
 *                     type: string
 *               conversation:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *               replyToId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Invalid signature
 *       403:
 *         description: Unauthorized action
 *       500:
 *         description: Internal server error
 */
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    // Get raw body for signature validation
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-teams-signature'] as string | undefined;

    // Validate webhook signature
    if (!validateWebhookSignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature', {
        hasSignature: !!signature,
        bodyLength: rawBody.length,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
      return;
    }

    // Parse webhook request
    const webhookRequest: WebhookRequest = req.body;

    // Validate required fields
    if (!webhookRequest.type || !webhookRequest.value || !webhookRequest.from) {
      logger.warn('Invalid webhook request structure', { body: req.body });

      res.status(400).json({
        success: false,
        error: 'Invalid webhook request structure',
      });
      return;
    }

    // Extract action and application ID
    const { action, applicationId } = webhookRequest.value;

    if (!action || !applicationId) {
      logger.warn('Missing action or applicationId in webhook', {
        value: webhookRequest.value,
      });

      res.status(400).json({
        success: false,
        error: 'Missing action or applicationId',
      });
      return;
    }

    // Extract Teams user information
    const teamsUserId = webhookRequest.from.id;
    const teamsUserName = webhookRequest.from.name;
    const aadObjectId = webhookRequest.from.aadObjectId;

    logger.info('Webhook request received', {
      action,
      applicationId,
      teamsUserId,
      teamsUserName,
      aadObjectId,
      conversationId: webhookRequest.conversation?.id,
    });

    // Map Teams user to system user
    const user = await webhookService.mapTeamsUserToSystemUser(aadObjectId, teamsUserName);

    if (!user) {
      const processingTime = Date.now() - startTime;
      logger.warn('Teams user not mapped to system user', {
        aadObjectId,
        teamsUserName,
        action,
        applicationId,
        processingTime,
      });

      res.status(403).json({
        success: false,
        error: 'Your Teams account is not linked to a system user. Please contact your administrator.',
      });
      return;
    }

    // Verify user authorization for the action
    const authResult = await webhookService.verifyUserAuthorization(user, action, applicationId);

    if (!authResult.authorized) {
      const processingTime = Date.now() - startTime;
      
      // Log webhook request (failed)
      await webhookService.logWebhookRequest(
        action,
        applicationId,
        user.id,
        teamsUserId,
        false,
        processingTime,
        authResult.reason
      );

      logger.warn('User not authorized for Teams action', {
        userId: user.id,
        userRole: user.role,
        action,
        applicationId,
        reason: authResult.reason,
        processingTime,
      });

      res.status(403).json({
        success: false,
        error: authResult.reason || 'You are not authorized to perform this action.',
      });
      return;
    }

    // Process the webhook action
    const actionResult = await webhookService.processWebhookAction(
      action,
      applicationId,
      user,
      webhookRequest.value,
      webhookRequest.replyToId
    );

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Log webhook request
    await webhookService.logWebhookRequest(
      action,
      applicationId,
      user.id,
      teamsUserId,
      actionResult.success,
      processingTime,
      actionResult.error
    );

    if (!actionResult.success) {
      logger.error('Webhook action failed', {
        action,
        applicationId,
        userId: user.id,
        error: actionResult.error,
        processingTime,
      });

      res.status(400).json({
        success: false,
        error: actionResult.error || 'Failed to process action',
      });
      return;
    }

    logger.info('Webhook action completed successfully', {
      action,
      applicationId,
      userId: user.id,
      processingTime,
    });

    res.json({
      success: true,
      message: actionResult.message,
      application: actionResult.application,
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    logger.error('Failed to process webhook', {
      error: error.message,
      stack: error.stack,
      processingTime,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process webhook',
    });
  }
});

/**
 * @swagger
 * /teams/metrics:
 *   get:
 *     summary: Get webhook metrics
 *     description: Retrieve webhook processing metrics for monitoring and analysis
 *     tags: [Teams Integration]
 *     parameters:
 *       - in: query
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *         description: Action type to get metrics for
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Webhook metrics retrieved successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { action, startDate, endDate } = req.query;

    // Validate required parameters
    if (!action || !startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: action, startDate, endDate',
      });
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate as string) || !dateRegex.test(endDate as string)) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    const metrics = await webhookService.getWebhookMetrics(
      action as string,
      startDate as string,
      endDate as string
    );

    res.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    logger.error('Failed to get webhook metrics', {
      error: error.message,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhook metrics',
    });
  }
});

export default router;
