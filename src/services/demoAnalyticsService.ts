import pool from '../config/database';
import logger from '../utils/logger';

export interface DemoSessionReport {
  sessionId: string;
  userRole: string;
  duration: number;
  interactionCount: number;
  pagesVisited: string[];
  actionsPerformed: string[];
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;
}

export interface DemoFeatureUsage {
  feature: string;
  usageCount: number;
  uniqueSessions: number;
  averageTimeSpent?: number;
}

export interface DemoConversionMetrics {
  totalSessions: number;
  completedSessions: number;
  averageDuration: number;
  bounceRate: number;
  topFeatures: DemoFeatureUsage[];
  roleDistribution: Record<string, number>;
}

class DemoAnalyticsService {
  /**
   * Get session report
   */
  async getSessionReport(sessionId: string): Promise<DemoSessionReport | null> {
    const query = `
      SELECT
        session_id,
        user_role,
        EXTRACT(EPOCH FROM (COALESCE(last_activity_at, NOW()) - started_at)) AS duration,
        jsonb_array_length(interactions) AS interaction_count,
        interactions,
        started_at,
        CASE WHEN is_active = false THEN last_activity_at ELSE NULL END AS ended_at,
        is_active
      FROM demo_sessions
      WHERE session_id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const interactions = row.interactions || [];

    // Extract unique pages and actions
    const pagesVisited = [...new Set(interactions.map((i: any) => i.page))] as string[];
    const actionsPerformed = [...new Set(interactions.map((i: any) => i.action))] as string[];

    return {
      sessionId: row.session_id,
      userRole: row.user_role,
      duration: row.duration,
      interactionCount: row.interaction_count,
      pagesVisited,
      actionsPerformed,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      isActive: row.is_active,
    };
  }

  /**
   * Track feature usage across all demo sessions
   */
  async getFeatureUsage(startDate?: Date, endDate?: Date): Promise<DemoFeatureUsage[]> {
    const query = `
      SELECT
        interaction->>'action' AS feature,
        COUNT(*) AS usage_count,
        COUNT(DISTINCT session_id) AS unique_sessions
      FROM demo_sessions,
        jsonb_array_elements(interactions) AS interaction
      WHERE ($1::timestamp IS NULL OR started_at >= $1)
        AND ($2::timestamp IS NULL OR started_at <= $2)
      GROUP BY interaction->>'action'
      ORDER BY usage_count DESC
      LIMIT 20
    `;

    const result = await pool.query(query, [startDate || null, endDate || null]);

    return result.rows.map(row => ({
      feature: row.feature,
      usageCount: parseInt(row.usage_count),
      uniqueSessions: parseInt(row.unique_sessions),
    }));
  }

  /**
   * Get conversion metrics
   */
  async getConversionMetrics(startDate?: Date, endDate?: Date): Promise<DemoConversionMetrics> {
    // Total sessions
    const totalQuery = `
      SELECT COUNT(*) AS total
      FROM demo_sessions
      WHERE ($1::timestamp IS NULL OR started_at >= $1)
        AND ($2::timestamp IS NULL OR started_at <= $2)
    `;

    const totalResult = await pool.query(totalQuery, [startDate || null, endDate || null]);
    const totalSessions = parseInt(totalResult.rows[0].total);

    // Completed sessions (sessions that lasted more than 5 minutes)
    const completedQuery = `
      SELECT COUNT(*) AS completed
      FROM demo_sessions
      WHERE ($1::timestamp IS NULL OR started_at >= $1)
        AND ($2::timestamp IS NULL OR started_at <= $2)
        AND EXTRACT(EPOCH FROM (last_activity_at - started_at)) > 300
    `;

    const completedResult = await pool.query(completedQuery, [startDate || null, endDate || null]);
    const completedSessions = parseInt(completedResult.rows[0].completed);

    // Average duration
    const durationQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (last_activity_at - started_at))) AS avg_duration
      FROM demo_sessions
      WHERE ($1::timestamp IS NULL OR started_at >= $1)
        AND ($2::timestamp IS NULL OR started_at <= $2)
    `;

    const durationResult = await pool.query(durationQuery, [startDate || null, endDate || null]);
    const averageDuration = parseFloat(durationResult.rows[0].avg_duration || 0);

    // Bounce rate (sessions with less than 2 interactions)
    const bounceQuery = `
      SELECT COUNT(*) AS bounced
      FROM demo_sessions
      WHERE ($1::timestamp IS NULL OR started_at >= $1)
        AND ($2::timestamp IS NULL OR started_at <= $2)
        AND jsonb_array_length(interactions) < 2
    `;

    const bounceResult = await pool.query(bounceQuery, [startDate || null, endDate || null]);
    const bouncedSessions = parseInt(bounceResult.rows[0].bounced);
    const bounceRate = totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0;

    // Role distribution
    const roleQuery = `
      SELECT user_role, COUNT(*) AS count
      FROM demo_sessions
      WHERE ($1::timestamp IS NULL OR started_at >= $1)
        AND ($2::timestamp IS NULL OR started_at <= $2)
      GROUP BY user_role
    `;

    const roleResult = await pool.query(roleQuery, [startDate || null, endDate || null]);
    const roleDistribution: Record<string, number> = {};
    roleResult.rows.forEach(row => {
      roleDistribution[row.user_role] = parseInt(row.count);
    });

    // Top features
    const topFeatures = await this.getFeatureUsage(startDate, endDate);

    return {
      totalSessions,
      completedSessions,
      averageDuration,
      bounceRate,
      topFeatures: topFeatures.slice(0, 10),
      roleDistribution,
    };
  }

  /**
   * Get daily session statistics
   */
  async getDailyStats(days: number = 30): Promise<Array<{
    date: string;
    sessionCount: number;
    averageDuration: number;
    interactionCount: number;
  }>> {
    const query = `
      SELECT
        DATE(started_at) AS date,
        COUNT(*) AS session_count,
        AVG(EXTRACT(EPOCH FROM (last_activity_at - started_at))) AS avg_duration,
        SUM(jsonb_array_length(interactions)) AS interaction_count
      FROM demo_sessions
      WHERE started_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `;

    const result = await pool.query(query);

    return result.rows.map(row => ({
      date: row.date,
      sessionCount: parseInt(row.session_count),
      averageDuration: parseFloat(row.avg_duration || 0),
      interactionCount: parseInt(row.interaction_count || 0),
    }));
  }

  /**
   * Get popular user journeys (sequences of pages visited)
   */
  async getPopularJourneys(limit: number = 10): Promise<Array<{
    journey: string[];
    count: number;
  }>> {
    const query = `
      SELECT
        ARRAY_AGG(interaction->>'page' ORDER BY (interaction->>'timestamp')::timestamp) AS journey,
        COUNT(*) AS count
      FROM demo_sessions,
        jsonb_array_elements(interactions) AS interaction
      WHERE jsonb_array_length(interactions) >= 3
      GROUP BY session_id
      ORDER BY count DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    return result.rows.map(row => ({
      journey: row.journey,
      count: parseInt(row.count),
    }));
  }

  /**
   * Log conversion event (e.g., demo to signup)
   */
  async logConversion(sessionId: string, conversionType: string, metadata?: any): Promise<void> {
    const query = `
      INSERT INTO demo_conversions (session_id, conversion_type, metadata)
      VALUES ($1, $2, $3)
    `;

    await pool.query(query, [sessionId, conversionType, JSON.stringify(metadata || {})]);

    logger.info('Demo conversion logged', { sessionId, conversionType });
  }

  /**
   * Get conversion rate by type
   */
  async getConversionRate(conversionType: string, startDate?: Date, endDate?: Date): Promise<{
    totalSessions: number;
    conversions: number;
    conversionRate: number;
  }> {
    // Total sessions
    const totalQuery = `
      SELECT COUNT(*) AS total
      FROM demo_sessions
      WHERE ($1::timestamp IS NULL OR started_at >= $1)
        AND ($2::timestamp IS NULL OR started_at <= $2)
    `;

    const totalResult = await pool.query(totalQuery, [startDate || null, endDate || null]);
    const totalSessions = parseInt(totalResult.rows[0].total);

    // Conversions
    const conversionQuery = `
      SELECT COUNT(DISTINCT dc.session_id) AS conversions
      FROM demo_conversions dc
      JOIN demo_sessions ds ON dc.session_id = ds.session_id
      WHERE dc.conversion_type = $1
        AND ($2::timestamp IS NULL OR ds.started_at >= $2)
        AND ($3::timestamp IS NULL OR ds.started_at <= $3)
    `;

    const conversionResult = await pool.query(conversionQuery, [
      conversionType,
      startDate || null,
      endDate || null,
    ]);
    const conversions = parseInt(conversionResult.rows[0].conversions);

    const conversionRate = totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;

    return {
      totalSessions,
      conversions,
      conversionRate,
    };
  }

  /**
   * Generate comprehensive demo report
   */
  async generateReport(startDate?: Date, endDate?: Date): Promise<{
    summary: DemoConversionMetrics;
    dailyStats: Array<any>;
    topFeatures: DemoFeatureUsage[];
    popularJourneys: Array<any>;
  }> {
    const [summary, dailyStats, topFeatures, popularJourneys] = await Promise.all([
      this.getConversionMetrics(startDate, endDate),
      this.getDailyStats(30),
      this.getFeatureUsage(startDate, endDate),
      this.getPopularJourneys(10),
    ]);

    return {
      summary,
      dailyStats,
      topFeatures,
      popularJourneys,
    };
  }
}

export default new DemoAnalyticsService();
