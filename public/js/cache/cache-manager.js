class CacheManager {
  constructor() {
    this.memCache = new Map();
    this.strategies = {
      staleWhileRevalidate: {
        maxAge: 5 * 60 * 1000,
        use: ['dashboard-metrics', 'application-list']
      },
      cacheFirst: {
        maxAge: 60 * 60 * 1000,
        use: ['user-profile', 'settings']
      },
      networkFirst: {
        maxAge: 60 * 60 * 1000,
        timeout: 3000,
        use: ['application-detail', 'documents']
      }
    };
  }

  buildKey(namespace, identifier) {
    return `${namespace}::${identifier}`;
  }

  getCache(key) {
    const entry = this.memCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.memCache.delete(key);
      return null;
    }
    return entry.value;
  }

  setCache(key, value, maxAge) {
    const expiresAt = maxAge ? Date.now() + maxAge : null;
    this.memCache.set(key, { value, expiresAt });
  }

  async staleWhileRevalidate(namespace, identifier, fetcher) {
    const key = this.buildKey(namespace, identifier);
    const strategy = this.strategies.staleWhileRevalidate;
    const cached = this.getCache(key);

    if (cached) {
      fetcher().then((fresh) => {
        this.setCache(key, fresh, strategy.maxAge);
      }).catch(() => {});
      return cached;
    }

    const fresh = await fetcher();
    this.setCache(key, fresh, strategy.maxAge);
    return fresh;
  }

  async cacheFirst(namespace, identifier, fetcher) {
    const key = this.buildKey(namespace, identifier);
    const strategy = this.strategies.cacheFirst;
    const cached = this.getCache(key);
    if (cached) return cached;

    const fresh = await fetcher();
    this.setCache(key, fresh, strategy.maxAge);
    return fresh;
  }

  async networkFirst(namespace, identifier, fetcher) {
    const key = this.buildKey(namespace, identifier);
    const strategy = this.strategies.networkFirst;

    const attempt = fetcher();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), strategy.timeout);
    });

    try {
      const fresh = await Promise.race([attempt, timeoutPromise]);
      this.setCache(key, fresh, strategy.maxAge);
      return fresh;
    } catch {
      const cached = this.getCache(key);
      if (cached) return cached;
      return fetcher();
    }
  }
}

const cacheManager = new CacheManager();
window.CacheManager = cacheManager;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheManager;
}
