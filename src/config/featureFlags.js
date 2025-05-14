// FILE: src/config/featureFlags.js
/**
 * Feature flags for development and testing
 * These flags allow toggling experimental features and behaviors
 * without exposing them to general users
 * 
 * IMPORTANT: This is set up to work safely in both development and production
 */

// The main feature flags object with default production-safe values
const featureFlags = {
  // Analysis mode: 'single' processes only the current section, 'batch' processes all eligible sections
  FEEDBACK_MODE: 'single', // Always defaults to 'single' in production
  
  // Other experimental features can be added here
  ENABLE_DEBUG_LOGS: false,
};

/**
 * Check if a feature flag is enabled
 * @param {string} flagName - The name of the flag to check
 * @param {any} defaultValue - Default value if flag doesn't exist
 * @returns {any} The flag value or default value
 */
export const isFeatureEnabled = (flagName, defaultValue = false) => {
  if (flagName in featureFlags) {
    return featureFlags[flagName];
  }
  return defaultValue;
};

/**
 * Get a feature flag value
 * @param {string} flagName - The name of the flag to get
 * @param {any} defaultValue - Default value if flag doesn't exist
 * @returns {any} The flag value or default value
 */
export const getFeatureFlag = (flagName, defaultValue = null) => {
  if (flagName in featureFlags) {
    return featureFlags[flagName];
  }
  return defaultValue;
};

// Only include dev-mode functionality in development builds
if (process.env.NODE_ENV === 'development') {
  /**
   * Set a feature flag value (development only)
   * @param {string} flagName - The name of the flag to set
   * @param {any} value - The value to set
   */
  export const setFeatureFlag = (flagName, value) => {
    if (flagName in featureFlags) {
      featureFlags[flagName] = value;
      console.log(`[DEV] Feature flag "${flagName}" set to:`, value);
      // Optionally persist to localStorage for development
      try {
        localStorage.setItem('dev_feature_flags', JSON.stringify(featureFlags));
      } catch (e) {
        // Ignore storage errors
      }
    }
  };

  /**
   * Initialize feature flags from localStorage (development only)
   */
  const initFeatureFlags = () => {
    try {
      const savedFlags = localStorage.getItem('dev_feature_flags');
      if (savedFlags) {
        const parsedFlags = JSON.parse(savedFlags);
        Object.assign(featureFlags, parsedFlags);
        console.log('[DEV] Loaded feature flags from localStorage:', featureFlags);
      }
    } catch (e) {
      // Ignore storage errors
    }
  };

  // Initialize flags when imported (development only)
  if (typeof window !== 'undefined') {
    initFeatureFlags();
  }
} else {
  // In production, provide a no-op setFeatureFlag that does nothing
  export const setFeatureFlag = () => {
    // No-op in production
  };
}

export default featureFlags;
