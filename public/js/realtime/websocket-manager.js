class WebSocketManager {
  constructor(endpoint = '/ws', options = {}) {
    this.endpoint = endpoint;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1500;
    this.backoffFactor = options.backoffFactor || 1.5;
    this.ws = null;

    this.connect();
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = `${protocol}//${window.location.host}${this.endpoint}`;
    this.ws = new WebSocket(baseUrl);

    this.ws.addEventListener('open', () => {
      this.reconnectAttempts = 0;
      this.updateState(true);
      this.emit('connection:open');
    });

    this.ws.addEventListener('message', (event) => {
      this.handleMessage(event);
    });

    this.ws.addEventListener('close', () => {
      this.updateState(false);
      this.emit('connection:close');
      this.reconnect();
    });

    this.ws.addEventListener('error', () => {
      this.updateState(false);
      this.emit('connection:error');
    });
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    this.reconnectAttempts += 1;
    const delay = Math.min(
      this.reconnectDelay * this.reconnectAttempts * this.backoffFactor,
      10000
    );
    setTimeout(() => this.connect(), delay);
  }

  handleMessage(event) {
    let parsed;
    try {
      parsed = JSON.parse(event.data);
    } catch (error) {
      console.warn('Malformed websocket payload', error);
      return;
    }

    const { type, payload } = parsed;
    if (!type) return;

    this.emit(type, payload);
  }

  emit(type, payload) {
    const listeners = this.handlers.get(type) || [];
    listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (error) {
        console.warn(`WebSocket handler error for ${type}:`, error);
      }
    });
  }

  on(type, callback) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type).add(callback);
    return () => {
      this.handlers.get(type)?.delete(callback);
    };
  }

  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  updateState(connected) {
    const next = {
      connected,
      lastUpdate: Date.now()
    };
    if (window.AppState) {
      window.AppState.setState('realTime', next);
    }
  }
}

const websocketManager = new WebSocketManager();
window.WebSocketManager = websocketManager;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSocketManager;
}
