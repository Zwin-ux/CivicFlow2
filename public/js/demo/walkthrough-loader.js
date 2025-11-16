/**
 * Walkthrough Loader
 * Utility for loading and managing walkthrough definitions
 */

class WalkthroughLoader {
  constructor() {
    this.walkthroughs = new Map();
    this.loadedIds = new Set();
    this.basePath = '/data/walkthroughs';
    
    // Available walkthrough IDs
    this.availableWalkthroughs = [
      'dashboard-overview',
      'application-review',
      'ai-features',
      'admin-tools'
    ];
    
    console.log('[Walkthrough Loader] Initialized');
  }

  /**
   * Load a walkthrough by ID
   * @param {string} id - Walkthrough ID
   * @returns {Promise<Object>} Walkthrough data
   */
  async load(id) {
    // Check if already loaded
    if (this.walkthroughs.has(id)) {
      console.log('[Walkthrough Loader] Using cached walkthrough:', id);
      return this.walkthroughs.get(id);
    }
    
    try {
      const url = `${this.basePath}/${id}.json`;
      console.log('[Walkthrough Loader] Loading walkthrough from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load walkthrough: ${response.status} ${response.statusText}`);
      }
      
      const walkthrough = await response.json();
      
      // Validate walkthrough
      if (!this.validate(walkthrough)) {
        throw new Error(`Invalid walkthrough data for: ${id}`);
      }
      
      // Cache the walkthrough
      this.walkthroughs.set(id, walkthrough);
      this.loadedIds.add(id);
      
      console.log('[Walkthrough Loader] Successfully loaded walkthrough:', id);
      return walkthrough;
      
    } catch (error) {
      console.error('[Walkthrough Loader] Failed to load walkthrough:', id, error);
      throw error;
    }
  }

  /**
   * Load multiple walkthroughs
   * @param {string[]} ids - Array of walkthrough IDs
   * @returns {Promise<Object[]>} Array of walkthrough data
   */
  async loadMultiple(ids) {
    try {
      const promises = ids.map(id => this.load(id));
      const walkthroughs = await Promise.all(promises);
      console.log('[Walkthrough Loader] Loaded multiple walkthroughs:', ids);
      return walkthroughs;
    } catch (error) {
      console.error('[Walkthrough Loader] Failed to load multiple walkthroughs:', error);
      throw error;
    }
  }

  /**
   * Load all available walkthroughs
   * @returns {Promise<Object[]>} Array of all walkthrough data
   */
  async loadAll() {
    return this.loadMultiple(this.availableWalkthroughs);
  }

  /**
   * Preload walkthroughs for faster access
   * @param {string[]} ids - Optional array of IDs to preload (defaults to all)
   * @returns {Promise<void>}
   */
  async preload(ids = null) {
    const idsToLoad = ids || this.availableWalkthroughs;
    
    try {
      console.log('[Walkthrough Loader] Preloading walkthroughs:', idsToLoad);
      await this.loadMultiple(idsToLoad);
      console.log('[Walkthrough Loader] Preload complete');
    } catch (error) {
      console.error('[Walkthrough Loader] Preload failed:', error);
      // Don't throw - preload is optional
    }
  }

  /**
   * Get a cached walkthrough
   * @param {string} id - Walkthrough ID
   * @returns {Object|null} Walkthrough data or null if not loaded
   */
  get(id) {
    return this.walkthroughs.get(id) || null;
  }

  /**
   * Check if a walkthrough is loaded
   * @param {string} id - Walkthrough ID
   * @returns {boolean} True if loaded
   */
  isLoaded(id) {
    return this.loadedIds.has(id);
  }

  /**
   * Get list of available walkthrough IDs
   * @returns {string[]} Array of walkthrough IDs
   */
  getAvailableIds() {
    return [...this.availableWalkthroughs];
  }

  /**
   * Get list of loaded walkthrough IDs
   * @returns {string[]} Array of loaded walkthrough IDs
   */
  getLoadedIds() {
    return [...this.loadedIds];
  }

  /**
   * Get metadata for all available walkthroughs
   * @returns {Promise<Object[]>} Array of walkthrough metadata
   */
  async getMetadata() {
    const metadata = [];
    
    for (const id of this.availableWalkthroughs) {
      try {
        const walkthrough = await this.load(id);
        metadata.push({
          id: walkthrough.id,
          title: walkthrough.title,
          description: walkthrough.description,
          estimatedDuration: walkthrough.estimatedDuration,
          stepCount: walkthrough.steps.length
        });
      } catch (error) {
        console.error('[Walkthrough Loader] Failed to get metadata for:', id, error);
      }
    }
    
    return metadata;
  }

  /**
   * Validate walkthrough data structure
   * @param {Object} walkthrough - Walkthrough data
   * @returns {boolean} True if valid
   */
  validate(walkthrough) {
    // Check required top-level fields
    if (!walkthrough || typeof walkthrough !== 'object') {
      console.error('[Walkthrough Loader] Invalid walkthrough: not an object');
      return false;
    }
    
    if (!walkthrough.id || typeof walkthrough.id !== 'string') {
      console.error('[Walkthrough Loader] Invalid walkthrough: missing or invalid id');
      return false;
    }
    
    if (!walkthrough.title || typeof walkthrough.title !== 'string') {
      console.error('[Walkthrough Loader] Invalid walkthrough: missing or invalid title');
      return false;
    }
    
    if (!Array.isArray(walkthrough.steps) || walkthrough.steps.length === 0) {
      console.error('[Walkthrough Loader] Invalid walkthrough: missing or empty steps array');
      return false;
    }
    
    // Validate each step
    for (let i = 0; i < walkthrough.steps.length; i++) {
      const step = walkthrough.steps[i];
      
      if (!step.id || typeof step.id !== 'string') {
        console.error(`[Walkthrough Loader] Invalid step ${i}: missing or invalid id`);
        return false;
      }
      
      if (!step.title || typeof step.title !== 'string') {
        console.error(`[Walkthrough Loader] Invalid step ${i}: missing or invalid title`);
        return false;
      }
      
      if (!step.description || typeof step.description !== 'string') {
        console.error(`[Walkthrough Loader] Invalid step ${i}: missing or invalid description`);
        return false;
      }
      
      if (!step.targetElement || typeof step.targetElement !== 'string') {
        console.error(`[Walkthrough Loader] Invalid step ${i}: missing or invalid targetElement`);
        return false;
      }
      
      // Validate optional fields if present
      if (step.position && !['top', 'bottom', 'left', 'right', 'auto', 'center'].includes(step.position)) {
        console.error(`[Walkthrough Loader] Invalid step ${i}: invalid position value`);
        return false;
      }
      
      if (step.highlightStyle && typeof step.highlightStyle !== 'object') {
        console.error(`[Walkthrough Loader] Invalid step ${i}: highlightStyle must be an object`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Clear cached walkthroughs
   * @param {string} id - Optional specific walkthrough ID to clear
   */
  clear(id = null) {
    if (id) {
      this.walkthroughs.delete(id);
      this.loadedIds.delete(id);
      console.log('[Walkthrough Loader] Cleared walkthrough:', id);
    } else {
      this.walkthroughs.clear();
      this.loadedIds.clear();
      console.log('[Walkthrough Loader] Cleared all walkthroughs');
    }
  }

  /**
   * Reload a walkthrough (clear cache and load fresh)
   * @param {string} id - Walkthrough ID
   * @returns {Promise<Object>} Fresh walkthrough data
   */
  async reload(id) {
    this.clear(id);
    return this.load(id);
  }

  /**
   * Search walkthroughs by keyword
   * @param {string} keyword - Search keyword
   * @returns {Promise<Object[]>} Matching walkthroughs
   */
  async search(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    const results = [];
    
    // Load all walkthroughs if not already loaded
    await this.loadAll();
    
    // Search through walkthroughs
    for (const [id, walkthrough] of this.walkthroughs) {
      const titleMatch = walkthrough.title.toLowerCase().includes(lowerKeyword);
      const descMatch = walkthrough.description.toLowerCase().includes(lowerKeyword);
      
      // Search in steps
      const stepMatch = walkthrough.steps.some(step => 
        step.title.toLowerCase().includes(lowerKeyword) ||
        step.description.toLowerCase().includes(lowerKeyword)
      );
      
      if (titleMatch || descMatch || stepMatch) {
        results.push(walkthrough);
      }
    }
    
    console.log('[Walkthrough Loader] Search results for:', keyword, results.length);
    return results;
  }

  /**
   * Get walkthrough by category or tag
   * @param {string} category - Category name
   * @returns {Promise<Object[]>} Walkthroughs in category
   */
  async getByCategory(category) {
    const categoryMap = {
      'getting-started': ['dashboard-overview'],
      'review': ['application-review'],
      'ai': ['ai-features'],
      'admin': ['admin-tools'],
      'all': this.availableWalkthroughs
    };
    
    const ids = categoryMap[category.toLowerCase()] || [];
    
    if (ids.length === 0) {
      console.warn('[Walkthrough Loader] Unknown category:', category);
      return [];
    }
    
    return this.loadMultiple(ids);
  }

  /**
   * Get recommended next walkthrough based on completed ones
   * @param {string[]} completedIds - Array of completed walkthrough IDs
   * @returns {string|null} Recommended walkthrough ID or null
   */
  getRecommendedNext(completedIds = []) {
    // Recommended order
    const recommendedOrder = [
      'dashboard-overview',
      'application-review',
      'ai-features',
      'admin-tools'
    ];
    
    // Find first walkthrough not completed
    for (const id of recommendedOrder) {
      if (!completedIds.includes(id)) {
        return id;
      }
    }
    
    // All completed
    return null;
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.WalkthroughLoader = WalkthroughLoader;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WalkthroughLoader;
}
