/**
 * Teams Configuration Reload Service
 * Handles automatic reloading of Teams configuration changes
 * Ensures configuration changes are applied within 1 minute without restart
 */

import teamsRepository from '../repositories/teamsRepository';
import teamsIntegrationService from '../services/teamsIntegrationService';
import logger from '../utils/logger';
import { TeamsChannelConfig } from '../models/teams';

class TeamsConfigReloadService {
  private configCache: Map<string, TeamsChannelConfig> = new Map();
  private reloadInterval: NodeJS.Timeout | null = null;
  private readonly RELOAD_INTERVAL_MS = 60000; // 1 minute

  /**
   * Initialize the configuration reload service
   * Starts periodic reloading of configuration from database
   */
  initialize(): void {
    logger.info('Initializing Teams configuration reload service');

    // Load initial configuration
    this.reloadConfiguration();

    // Set up periodic reload every 1 minute
    this.reloadInterval = setInterval(() => {
      this.reloadConfiguration();
    }, this.RELOAD_INTERVAL_MS);

    logger.info('Teams configuration reload service initialized', {
      reloadIntervalMs: this.RELOAD_INTERVAL_MS,
    });
  }

  /**
   * Reload configuration from database
   * Updates in-memory cache with latest configuration
   */
  private async reloadConfiguration(): Promise<void> {
    try {
      logger.debug('Reloading Teams configuration from database');

      // Fetch all active configurations
      const configs = await teamsRepository.findAllActiveChannelConfigs();

      // Update cache
      const previousSize = this.configCache.size;
      this.configCache.clear();

      for (const config of configs) {
        this.configCache.set(config.programType, config);
      }

      logger.debug('Teams configuration reloaded', {
        previousCount: previousSize,
        currentCount: this.configCache.size,
        programTypes: Array.from(this.configCache.keys()),
      });

      // Invalidate Redis cache for all program types to ensure consistency
      const programTypes = Array.from(this.configCache.keys());
      for (const programType of programTypes) {
        await teamsIntegrationService.invalidateChannelCache(programType);
      }
    } catch (error) {
      logger.error('Failed to reload Teams configuration', { error });
    }
  }

  /**
   * Force immediate reload of configuration
   * Used when configuration is updated via API
   */
  async forceReload(): Promise<void> {
    logger.info('Forcing immediate Teams configuration reload');
    await this.reloadConfiguration();
  }

  /**
   * Get cached configuration for program type
   * @param programType - Program type
   * @returns Configuration or null if not found
   */
  getCachedConfig(programType: string): TeamsChannelConfig | null {
    return this.configCache.get(programType) || null;
  }

  /**
   * Get all cached configurations
   * @returns Array of all cached configurations
   */
  getAllCachedConfigs(): TeamsChannelConfig[] {
    return Array.from(this.configCache.values());
  }

  /**
   * Check if configuration exists for program type
   * @param programType - Program type
   * @returns True if configuration exists
   */
  hasConfig(programType: string): boolean {
    return this.configCache.has(programType);
  }

  /**
   * Shutdown the reload service
   * Clears interval and cache
   */
  shutdown(): void {
    logger.info('Shutting down Teams configuration reload service');

    if (this.reloadInterval) {
      clearInterval(this.reloadInterval);
      this.reloadInterval = null;
    }

    this.configCache.clear();
  }

  /**
   * Get service status
   * @returns Service status information
   */
  getStatus(): {
    isRunning: boolean;
    configCount: number;
    programTypes: string[];
    reloadIntervalMs: number;
  } {
    return {
      isRunning: this.reloadInterval !== null,
      configCount: this.configCache.size,
      programTypes: Array.from(this.configCache.keys()),
      reloadIntervalMs: this.RELOAD_INTERVAL_MS,
    };
  }
}

export default new TeamsConfigReloadService();
