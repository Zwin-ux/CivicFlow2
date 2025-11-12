/**
 * Demo Mode Manager
 * Manages the global demo mode state and provides fallback mechanisms
 */

import config from '../config';
import logger from '../utils/logger';

class DemoModeManager {
  private static instance: DemoModeManager;
  private isDemoModeActive: boolean = false;
  private demoModeReason: string = '';
  private failureCount: number = 0;

  private constructor() {
    // Check if demo mode is explicitly enabled
    if (config.demoMode.enabled) {
      this.enableDemoMode('Explicitly enabled via DEMO_MODE environment variable');
    }
  }

  public static getInstance(): DemoModeManager {
    if (!DemoModeManager.instance) {
      DemoModeManager.instance = new DemoModeManager();
    }
    return DemoModeManager.instance;
  }

  /**
   * Enable demo mode with a reason
   */
  public enableDemoMode(reason: string): void {
    if (!this.isDemoModeActive) {
      this.isDemoModeActive = true;
      this.demoModeReason = reason;
      
      logger.warn('╔════════════════════════════════════════════════════════════╗');
      logger.warn('║                                                            ║');
      logger.warn('║              🎭 DEMO MODE ACTIVATED 🎭                     ║');
      logger.warn('║                                                            ║');
      logger.warn('║  Running in offline showcase mode with static demo data   ║');
      logger.warn('║  Database and Redis connections are unavailable           ║');
      logger.warn('║  All data operations are simulated                        ║');
      logger.warn('║                                                            ║');
      logger.warn('╚════════════════════════════════════════════════════════════╝');
      logger.warn(`Demo Mode Reason: ${reason}`);
    }
  }

  /**
   * Check if demo mode is active
   */
  public isActive(): boolean {
    return this.isDemoModeActive;
  }

  /**
   * Get the reason demo mode was activated
   */
  public getReason(): string {
    return this.demoModeReason;
  }

  /**
   * Record a connection failure
   */
  public recordFailure(service: string, error: any): void {
    this.failureCount++;
    logger.error(`Service connection failure (${this.failureCount}/${config.demoMode.maxRetries})`, {
      service,
      error: error.message || error,
    });

    // Auto-enable demo mode after max retries
    if (
      config.demoMode.autoEnableOnFailure &&
      this.failureCount >= config.demoMode.maxRetries &&
      !this.isDemoModeActive
    ) {
      this.enableDemoMode(
        `Auto-enabled after ${this.failureCount} failed connection attempts to ${service}`
      );
    }
  }

  /**
   * Reset failure count (called on successful connection)
   */
  public resetFailures(): void {
    if (this.failureCount > 0) {
      logger.info('Connection failures reset after successful connection');
      this.failureCount = 0;
    }
  }

  /**
   * Get current failure count
   */
  public getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get demo mode status for health checks
   */
  public getStatus() {
    return {
      active: this.isDemoModeActive,
      reason: this.demoModeReason,
      failureCount: this.failureCount,
      maxRetries: config.demoMode.maxRetries,
      autoEnableOnFailure: config.demoMode.autoEnableOnFailure,
    };
  }

  /**
   * Log demo mode indicator to console
   */
  public logDemoModeIndicator(): void {
    if (this.isDemoModeActive) {
      console.log('\n');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                                                            ║');
      console.log('║              🎭 RUNNING IN DEMO MODE 🎭                    ║');
      console.log('║                                                            ║');
      console.log('║  This is an offline showcase with simulated data          ║');
      console.log('║  No real database operations are being performed          ║');
      console.log('║                                                            ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('\n');
    }
  }
}

export default DemoModeManager.getInstance();
