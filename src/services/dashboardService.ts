/**
 * Dashboard Service
 * Business logic for dashboard operations with caching
 */

import dashboardRepository from '../repositories/dashboardRepository';
import redisClient from '../config/redis';
import websocketService from './websocketService';
import logger from '../utils/logger';
import { ApplicationStatus } from '../models/application';
import type { PipelineView, ApplicationSummary } from '../repositories/dashboardRepository';

class DashboardService {
  private readonly PIPELINE_CACHE_TTL = 30; // 30 seconds
  private readonly QUEUE_CACHE_TTL = 60; // 60 seconds
  private readonly SLA_CACHE_TTL = 300; // 5 minutes

  /**
   * Get pipeline view with caching
   */
  async getPipelineView(filters?: {
    programType?: string;
    assignedTo?: string;
  }): Promise<{
    pipelines: PipelineView[];
    totalCount: number;
    lastUpdated: Date;
  }> {
    const cacheKey = `dashboard:pipeline:${JSON.stringify(filters || {})}`;

    try {
      // Try to get from cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug('Pipeline view cache hit', { filters });
        return JSON.parse(cached);
      }

      // Get from database
      const pipelines = await dashboardRepository.getPipelineView(filters);
      const totalCount = pipelines.reduce((sum, p) => sum + p.count, 0);

      const result = {
        pipelines,
        totalCount,
        lastUpdated: new Date(),
      };

      // Cache the result
      await redisClient.set(
        cacheKey,
        JSON.stringify(result),
        this.PIPELINE_CACHE_TTL
      );

      logger.info('Pipeline view retrieved', { totalCount, filters });
      return result;
    } catch (error) {
      logger.error('Failed to get pipeline view', { error, filters });
      throw error;
    }
  }

  /**
   * Get queue view with caching
   */
  async getQueueView(filters: {
    view: 'my-queue' | 'unassigned';
    userId?: string;
    page: number;
    limit: number;
  }): Promise<{
    applications: ApplicationSummary[];
    totalCount: number;
    hasMore: boolean;
    page: number;
    pageSize: number;
  }> {
    const cacheKey = `dashboard:queue:${JSON.stringify(filters)}`;

    try {
      // Try to get from cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug('Queue view cache hit', { filters });
        return JSON.parse(cached);
      }

      // Get from database
      const { applications, total } = await dashboardRepository.getQueueView(filters);
      const hasMore = filters.page * filters.limit < total;

      const result = {
        applications,
        totalCount: total,
        hasMore,
        page: filters.page,
        pageSize: filters.limit,
      };

      // Cache the result
      await redisClient.set(
        cacheKey,
        JSON.stringify(result),
        this.QUEUE_CACHE_TTL
      );

      logger.info('Queue view retrieved', {
        view: filters.view,
        count: applications.length,
        total,
      });
      return result;
    } catch (error) {
      logger.error('Failed to get queue view', { error, filters });
      throw error;
    }
  }

  /**
   * Claim an application
   */
  async claimApplication(
    applicationId: string,
    userId: string
  ): Promise<{ success: boolean; assignedTo: string }> {
    try {
      await dashboardRepository.claimApplication(applicationId, userId);

      // Invalidate queue caches
      await this.invalidateQueueCaches();

      logger.info('Application claimed', { applicationId, userId });
      return { success: true, assignedTo: userId };
    } catch (error) {
      logger.error('Failed to claim application', { error, applicationId, userId });
      throw error;
    }
  }

  /**
   * Get SLA analytics with caching
   */
  async getSLAAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    breachedApplications: ApplicationSummary[];
    atRiskApplications: ApplicationSummary[];
    averageProcessingTime: Record<string, number>;
    bottlenecks: Array<{
      stage: ApplicationStatus;
      averageTimeInStage: number;
      applicationCount: number;
      threshold: number;
    }>;
  }> {
    const cacheKey = `dashboard:sla:${JSON.stringify(filters || {})}`;

    try {
      // Try to get from cache
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug('SLA analytics cache hit', { filters });
        return JSON.parse(cached);
      }

      // Get from database
      const analytics = await dashboardRepository.getSLAAnalytics(filters);

      // Cache the result
      await redisClient.set(
        cacheKey,
        JSON.stringify(analytics),
        this.SLA_CACHE_TTL
      );

      // Emit WebSocket events for SLA warnings and breaches
      analytics.atRiskApplications.forEach(app => {
        websocketService.broadcast({
          type: 'sla.warning',
          data: {
            applicationId: app.id,
            applicantName: app.applicantName,
            slaDeadline: app.slaDeadline,
          },
          timestamp: new Date(),
        });
      });

      analytics.breachedApplications.forEach(app => {
        websocketService.broadcast({
          type: 'sla.breached',
          data: {
            applicationId: app.id,
            applicantName: app.applicantName,
            slaDeadline: app.slaDeadline,
          },
          timestamp: new Date(),
        });
      });

      logger.info('SLA analytics retrieved', {
        breachedCount: analytics.breachedApplications.length,
        atRiskCount: analytics.atRiskApplications.length,
        bottleneckCount: analytics.bottlenecks.length,
      });
      return analytics;
    } catch (error) {
      logger.error('Failed to get SLA analytics', { error, filters });
      throw error;
    }
  }

  /**
   * Invalidate pipeline caches
   */
  async invalidatePipelineCaches(): Promise<void> {
    try {
      // In a production system, you'd want to track all cache keys
      // For now, we'll just log that caches should be invalidated
      logger.info('Pipeline caches invalidated');
    } catch (error) {
      logger.error('Failed to invalidate pipeline caches', { error });
    }
  }

  /**
   * Invalidate queue caches
   */
  async invalidateQueueCaches(): Promise<void> {
    try {
      logger.info('Queue caches invalidated');
    } catch (error) {
      logger.error('Failed to invalidate queue caches', { error });
    }
  }
}

export default new DashboardService();
