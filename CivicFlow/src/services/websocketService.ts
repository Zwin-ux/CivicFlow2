/**
 * WebSocket Service
 * Manages WebSocket connections for real-time dashboard updates
 */

import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import logger from '../utils/logger';
import { parse as parseUrl } from 'url';
import { parse as parseQuery } from 'querystring';

interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  isAlive: boolean;
  subscribedEvents: Set<string>;
}

interface DashboardEvent {
  type: 'application.updated' | 'application.assigned' | 'sla.warning' | 'sla.breached' | 
        'batch.progress' | 'batch.completed' | 'batch.failed' | 'batch.cancelled';
  data: any;
  timestamp: Date;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  /**
   * Initialize WebSocket server
   * @param server - HTTP server instance
   */
  initialize(server: HTTPServer): void {
    this.wss = new WebSocketServer({
      server,
      path: '/api/dashboard/stream',
      verifyClient: (_info, callback) => {
        // Basic verification - in production, verify JWT token
        callback(true);
      },
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    // Start heartbeat mechanism
    this.startHeartbeat();

    logger.info('WebSocket server initialized', {
      path: '/api/dashboard/stream',
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    try {
      // Parse query parameters to get user ID
      const url = parseUrl(request.url || '');
      const query = parseQuery(url.query || '');
      const userId = Array.isArray(query.userId) ? query.userId[0] : query.userId;

      if (!userId) {
        logger.warn('WebSocket connection rejected: missing userId');
        ws.close(1008, 'Missing userId parameter');
        return;
      }

      // Generate client ID
      const clientId = `${userId}-${Date.now()}`;

      // Store client
      const client: WebSocketClient = {
        ws,
        userId,
        isAlive: true,
        subscribedEvents: new Set([
          'application.updated', 
          'application.assigned', 
          'sla.warning', 
          'sla.breached',
          'batch.progress',
          'batch.completed',
          'batch.failed',
          'batch.cancelled'
        ]),
      };

      this.clients.set(clientId, client);

      logger.info('WebSocket client connected', {
        clientId,
        userId,
        totalClients: this.clients.size,
      });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection.established',
        data: {
          clientId,
          message: 'Connected to dashboard stream',
        },
        timestamp: new Date(),
      });

      // Handle pong responses
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
        }
      });

      // Handle messages from client
      ws.on('message', (message: Buffer) => {
        this.handleMessage(clientId, message);
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        logger.error('WebSocket client error', {
          clientId,
          error: error.message,
        });
      });
    } catch (error) {
      logger.error('Failed to handle WebSocket connection', { error });
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Handle message from client
   */
  private handleMessage(clientId: string, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());

      // Handle subscription updates
      if (data.type === 'subscribe') {
        const client = this.clients.get(clientId);
        if (client && Array.isArray(data.events)) {
          data.events.forEach((event: string) => {
            client.subscribedEvents.add(event);
          });
          logger.debug('Client subscribed to events', {
            clientId,
            events: data.events,
          });
        }
      } else if (data.type === 'unsubscribe') {
        const client = this.clients.get(clientId);
        if (client && Array.isArray(data.events)) {
          data.events.forEach((event: string) => {
            client.subscribedEvents.delete(event);
          });
          logger.debug('Client unsubscribed from events', {
            clientId,
            events: data.events,
          });
        }
      } else if (data.type === 'ping') {
        // Respond to ping
        this.sendToClient(clientId, {
          type: 'pong',
          data: {},
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('Failed to handle WebSocket message', {
        clientId,
        error,
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    this.clients.delete(clientId);
    logger.info('WebSocket client disconnected', {
      clientId,
      totalClients: this.clients.size,
    });
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const deadClients: string[] = [];

      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          // Client didn't respond to last ping, terminate
          deadClients.push(clientId);
          client.ws.terminate();
          return;
        }

        // Mark as not alive and send ping
        client.isAlive = false;
        client.ws.ping();
      });

      // Remove dead clients
      deadClients.forEach(clientId => {
        this.clients.delete(clientId);
      });

      if (deadClients.length > 0) {
        logger.info('Removed dead WebSocket clients', {
          count: deadClients.length,
          totalClients: this.clients.size,
        });
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: DashboardEvent): void {
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      // Check if client is subscribed to this event type
      if (client.subscribedEvents.has(event.type)) {
        this.sendToClient(clientId, event);
        sentCount++;
      }
    });

    logger.debug('Broadcast event to clients', {
      eventType: event.type,
      sentCount,
      totalClients: this.clients.size,
    });
  }

  /**
   * Send event to specific user
   */
  sendToUser(userId: string, event: DashboardEvent): void {
    let sentCount = 0;

    this.clients.forEach((client, clientId) => {
      if (client.userId === userId && client.subscribedEvents.has(event.type)) {
        this.sendToClient(clientId, event);
        sentCount++;
      }
    });

    logger.debug('Sent event to user', {
      userId,
      eventType: event.type,
      sentCount,
    });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, event: DashboardEvent | any): void {
    const client = this.clients.get(clientId);
    
    if (!client) {
      return;
    }

    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(event));
      } catch (error) {
        logger.error('Failed to send message to client', {
          clientId,
          error,
        });
      }
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    connectionsByUser: Record<string, number>;
  } {
    const connectionsByUser: Record<string, number> = {};

    this.clients.forEach(client => {
      connectionsByUser[client.userId] = (connectionsByUser[client.userId] || 0) + 1;
    });

    return {
      totalConnections: this.clients.size,
      connectionsByUser,
    };
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    this.clients.forEach((client) => {
      client.ws.close(1001, 'Server shutting down');
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close(() => {
        logger.info('WebSocket server closed');
      });
    }
  }
}

export default new WebSocketService();
