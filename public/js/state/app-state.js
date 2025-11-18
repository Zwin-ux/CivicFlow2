class AppState {
  constructor() {
    this.storageKey = 'civicflow-state';
    this.subscribers = new Map();

    this.state = {
      user: null,
      navigation: {
        currentPage: '/',
        history: []
      },
      ui: {
        sidebarOpen: true,
        theme: 'light',
        notifications: []
      },
      data: {
        applications: [],
        documents: [],
        cache: {}
      },
      realTime: {
        connected: false,
        lastUpdate: null
      }
    };

    const persisted = this.loadPersistentState();
    if (persisted.ui) {
      this.state.ui = { ...this.state.ui, ...persisted.ui };
    }
    if (persisted.navigation) {
      this.state.navigation = { ...this.state.navigation, ...persisted.navigation };
    }
  }

  resolvePath(path) {
    const segments = path.split('.');
    const lastKey = segments.pop();
    let target = this.state;
    for (const segment of segments) {
      if (!Object.prototype.hasOwnProperty.call(target, segment)) {
        target[segment] = {};
      }
      target = target[segment];
    }
    return { target, key: lastKey, segments };
  }

  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    this.subscribers.get(path).add(callback);
    return () => {
      this.subscribers.get(path)?.delete(callback);
    };
  }

  notify(path, value, previousValue) {
    const segments = path.split('.');
    const candidates = new Set([path]);
    for (let i = segments.length - 1; i > 0; i -= 1) {
      candidates.add(segments.slice(0, i).join('.'));
    }
    candidates.add('state');

    candidates.forEach((key) => {
      this.subscribers.get(key)?.forEach((fn) => {
        try {
          fn(value, previousValue, path);
        } catch (error) {
          console.warn(`AppState subscriber error for ${key}:`, error);
        }
      });
    });
  }

  setState(path, value) {
    const { target, key, segments } = this.resolvePath(path);
    const previousValue = target[key];
    target[key] = value;
    this.notify(path, value, previousValue);

    if (segments.length > 0) {
      const rootPath = segments[0];
      this.notify(rootPath, this.state[rootPath], this.state[rootPath]);
    }

    this.persistState();
  }

  mergeState(path, patch) {
    const { target, key } = this.resolvePath(path);
    const base = target[key] || {};
    this.setState(path, { ...base, ...patch });
  }

  getState(path) {
    const { target, key } = this.resolvePath(path);
    return target[key];
  }

  async optimisticUpdate(path, value, apiCall) {
    const { target, key } = this.resolvePath(path);
    const previousValue = target[key];
    this.setState(path, value);

    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      this.setState(path, previousValue);
      throw error;
    }
  }

  persistState() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const payload = {
      ui: this.state.ui,
      navigation: this.state.navigation
    };
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist AppState:', error);
    }
  }

  loadPersistentState() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Unable to load persisted AppState:', error);
      return {};
    }
  }
}

const appState = new AppState();
window.AppState = appState;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = appState;
}
