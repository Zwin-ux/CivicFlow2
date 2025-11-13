import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import redisClient from '../config/redis';
import logger from '../utils/logger';

export interface DemoSession {
  id: string;
  sessionId: string;
  userRole: 'APPLICANT' | 'REVIEWER' | 'APPROVER' | 'ADMIN';
  startedAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  interactions: DemoInteraction[];
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface DemoInteraction {
  timestamp: Date;
  action: string;
  page: string;
  details?: any;
}

export interface CreateDemoSessionOptions {
  userRole: 'APPLICANT' | 'REVIEWER' | 'APPROVER' | 'ADMIN';
  ipAddress?: string;
  userAgent?: string;
  durationMinutes?: number;
}

class DemoModeService {
  private readonly DEFAULT_DURATION_MINUTES = 30;
  private readonly CACHE_PREFIX = 'demo:session:';
  private readonly CACHE_TTL = 1800; // 30 minutes in seconds
  // In-memory fallback store for demo sessions when DB/Redis are unavailable
  private inMemorySessions: Map<string, DemoSession> = new Map();

  /**
   * Create a new demo session
   */
  async createSession(options: CreateDemoSessionOptions): Promise<DemoSession> {
    const sessionId = uuidv4();
    const durationMinutes = options.durationMinutes || this.DEFAULT_DURATION_MINUTES;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const query = `
      INSERT INTO demo_sessions (
        session_id,
        user_role,
        expires_at,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      sessionId,
      options.userRole,
      expiresAt,
      options.ipAddress || null,
      options.userAgent || null,
    ];

    try {
      const result = await pool.query(query, values);
      const session = this.mapRowToSession(result.rows[0]);

      // Cache the session
      await this.cacheSession(session);

      logger.info('Demo session created (db)', {
        sessionId,
        userRole: options.userRole,
        expiresAt,
      });

      return session;
    } catch (error) {
      // If DB is unavailable, fall back to an in-memory session so demo can start
      const session: DemoSession = {
        id: `inmem-${sessionId}`,
        sessionId,
        userRole: options.userRole,
        startedAt: new Date(),
        expiresAt,
        lastActivityAt: new Date(),
        interactions: [],
        isActive: true,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      };

      this.inMemorySessions.set(sessionId, session);

      // Best-effort cache to Redis (may warn internally)
      await this.cacheSession(session);

      logger.warn('Demo session created (in-memory fallback)', {
        sessionId,
        userRole: options.userRole,
        reason: error instanceof Error ? error.message : String(error),
      });

      return session;
    }
  }

  /**
   * Get demo session by session ID
   */
  async getSession(sessionId: string): Promise<DemoSession | null> {
    // Check in-memory fallback first
    if (this.inMemorySessions.has(sessionId)) {
      return this.inMemorySessions.get(sessionId) || null;
    }
    // Try cache first
    const cached = await this.getCachedSession(sessionId);
    if (cached) {
      return cached;
    }

    // Query database
    const query = `
      SELECT * FROM demo_sessions
      WHERE session_id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const session = this.mapRowToSession(result.rows[0]);

    // Cache for future requests
    await this.cacheSession(session);

    return session;
  }

  /**
   * Check if a session is valid and active
   */
  async isValidSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return false;
    }

    // Check if session is active and not expired
    const now = new Date();
    const isValid = session.isActive && session.expiresAt > now;

    // Check for inactivity timeout (30 minutes)
    const inactivityTimeout = new Date(session.lastActivityAt.getTime() + 30 * 60 * 1000);
    const isNotTimedOut = now < inactivityTimeout;

    return isValid && isNotTimedOut;
  }

  /**
   * Update session activity timestamp
   */
  async updateActivity(sessionId: string): Promise<void> {
    const query = `
      UPDATE demo_sessions
      SET last_activity_at = NOW()
      WHERE session_id = $1 AND is_active = true
    `;

    try {
      await pool.query(query, [sessionId]);

      // Update cache
      const session = await this.getSession(sessionId);
      if (session) {
        session.lastActivityAt = new Date();
        await this.cacheSession(session);
      }
    } catch (error) {
      // Fallback to in-memory session if DB unavailable
      const session = this.inMemorySessions.get(sessionId);
      if (session) {
        session.lastActivityAt = new Date();
        this.inMemorySessions.set(sessionId, session);
        // Best-effort cache
        await this.cacheSession(session);
      } else {
        logger.warn('Failed to updateActivity on DB and no in-memory session found', { sessionId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /**
   * Track user interaction in demo session
   */
  async trackInteraction(
    sessionId: string,
    action: string,
    page: string,
    details?: any
  ): Promise<void> {
    const interaction: DemoInteraction = {
      timestamp: new Date(),
      action,
      page,
      details,
    };

    const query = `
      UPDATE demo_sessions
      SET 
        interactions = interactions || $1::jsonb,
        last_activity_at = NOW()
      WHERE session_id = $2 AND is_active = true
    `;

    try {
      await pool.query(query, [JSON.stringify(interaction), sessionId]);

      // Invalidate cache to force refresh
      await this.invalidateCache(sessionId);

      logger.debug('Demo interaction tracked (db)', {
        sessionId,
        action,
        page,
      });
    } catch (error) {
      // Fallback to in-memory interactions
      const session = this.inMemorySessions.get(sessionId);
      if (session) {
        session.interactions.push(interaction);
        session.lastActivityAt = new Date();
        this.inMemorySessions.set(sessionId, session);
        // Best-effort: update cache
        await this.cacheSession(session);
        logger.debug('Demo interaction tracked (in-memory fallback)', { sessionId, action, page });
      } else {
        logger.warn('Failed to track interaction on DB and no in-memory session found', { sessionId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /**
   * Reset demo session to initial state
   */
  async resetSession(sessionId: string): Promise<void> {
    const query = `
      UPDATE demo_sessions
      SET 
        interactions = '[]'::jsonb,
        last_activity_at = NOW(),
        started_at = NOW(),
        expires_at = NOW() + INTERVAL '30 minutes'
      WHERE session_id = $1 AND is_active = true
    `;

    try {
      await pool.query(query, [sessionId]);
      await this.invalidateCache(sessionId);
      logger.info('Demo session reset (db)', { sessionId });
    } catch (error) {
      const session = this.inMemorySessions.get(sessionId);
      if (session) {
        session.interactions = [];
        session.lastActivityAt = new Date();
        session.startedAt = new Date();
        session.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        this.inMemorySessions.set(sessionId, session);
        await this.cacheSession(session);
        logger.info('Demo session reset (in-memory fallback)', { sessionId });
      } else {
        logger.warn('Failed to reset session on DB and no in-memory session found', { sessionId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /**
   * End demo session
   */
  async endSession(sessionId: string): Promise<void> {
    const query = `
      UPDATE demo_sessions
      SET is_active = false
      WHERE session_id = $1
    `;

    try {
      await pool.query(query, [sessionId]);
      await this.invalidateCache(sessionId);
      logger.info('Demo session ended (db)', { sessionId });
    } catch (error) {
      const session = this.inMemorySessions.get(sessionId);
      if (session) {
        session.isActive = false;
        this.inMemorySessions.set(sessionId, session);
        await this.invalidateCache(sessionId);
        logger.info('Demo session ended (in-memory fallback)', { sessionId });
      } else {
        logger.warn('Failed to end session on DB and no in-memory session found', { sessionId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  /**
   * Expire old demo sessions (cleanup job)
   */
  async expireOldSessions(): Promise<number> {
    const query = `
      UPDATE demo_sessions
      SET is_active = false
      WHERE is_active = true
        AND (
          expires_at < NOW() 
          OR last_activity_at < NOW() - INTERVAL '30 minutes'
        )
      RETURNING session_id
    `;

    const result = await pool.query(query);
    const expiredCount = result.rows.length;

    // Clear cache for expired sessions
    for (const row of result.rows) {
      await this.invalidateCache(row.session_id);
    }

    if (expiredCount > 0) {
      logger.info('Expired demo sessions', { count: expiredCount });
    }

    return expiredCount;
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(sessionId: string): Promise<{
    duration: number;
    interactionCount: number;
    pagesVisited: string[];
    actionsPerformed: string[];
  }> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const duration = Date.now() - session.startedAt.getTime();
    const interactionCount = session.interactions.length;
    const pagesVisited = [...new Set(session.interactions.map(i => i.page))];
    const actionsPerformed = [...new Set(session.interactions.map(i => i.action))];

    return {
      duration,
      interactionCount,
      pagesVisited,
      actionsPerformed,
    };
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<DemoSession[]> {
    const query = `
      SELECT * FROM active_demo_sessions
      ORDER BY started_at DESC
    `;

    const result = await pool.query(query);
    return result.rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Cache session in Redis
   */
  private async cacheSession(session: DemoSession): Promise<void> {
    try {
      const key = this.CACHE_PREFIX + session.sessionId;
      await redisClient.set(key, JSON.stringify(session), this.CACHE_TTL);
    } catch (error) {
      logger.warn('Failed to cache demo session', {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get cached session from Redis
   */
  private async getCachedSession(sessionId: string): Promise<DemoSession | null> {
    try {
      const key = this.CACHE_PREFIX + sessionId;
      const cached = await redisClient.get(key);

      if (!cached) {
        return null;
      }

      const session = JSON.parse(cached);
      // Convert date strings back to Date objects
      session.startedAt = new Date(session.startedAt);
      session.expiresAt = new Date(session.expiresAt);
      session.lastActivityAt = new Date(session.lastActivityAt);
      session.interactions = session.interactions.map((i: any) => ({
        ...i,
        timestamp: new Date(i.timestamp),
      }));

      return session;
    } catch (error) {
      logger.warn('Failed to get cached demo session', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Invalidate cached session
   */
  private async invalidateCache(sessionId: string): Promise<void> {
    try {
      const key = this.CACHE_PREFIX + sessionId;
      await redisClient.del(key);
    } catch (error) {
      logger.warn('Failed to invalidate demo session cache', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Map database row to DemoSession object
   */
  private mapRowToSession(row: any): DemoSession {
    return {
      id: row.id,
      sessionId: row.session_id,
      userRole: row.user_role,
      startedAt: row.started_at,
      expiresAt: row.expires_at,
      lastActivityAt: row.last_activity_at,
      interactions: row.interactions || [],
      isActive: row.is_active,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    };
  }
}

export default new DemoModeService();
