// FILE: src/config/featureFlags.js
/**
 * Feature flags for development and testing
 * These flags allow toggling experimental features and behaviors
 * without exposing them to general users
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

/**
 * Set a feature flag value (for development/testing purposes only)
 * This function should never be exposed to general users
 * @param {string} flagName - The name of the flag to set
 * @param {any} value - The value to set
 */
export const setFeatureFlag = (flagName, value) => {
  // Only allow changes in development mode
  if (process.env.NODE_ENV !== 'development' && !isSecretDevMode()) {
    console.warn('Feature flags can only be modified in development mode');
    return;
  }
  
  if (flagName in featureFlags) {
    featureFlags[flagName] = value;
    console.log(`[DEV] Feature flag "${flagName}" set to:`, value);
    // Optionally persist to localStorage for development
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('dev_feature_flags', JSON.stringify(featureFlags));
      }
    } catch (e) {
      // Ignore storage errors
    }
  }
};

/**
 * Check if secret developer mode is active
 * (checked via localStorage or special URL param)
 * @returns {boolean} True if secret dev mode is active
 */
function isSecretDevMode() {
  try {
    // Check for a special localStorage flag that only you know
    if (typeof localStorage !== 'undefined' && typeof window !== 'undefined') {
      return localStorage.getItem('kording_dev_mode') === 'true' || 
             (window.location && 
              window.location.search && 
              window.location.search.includes('devMode=kording'));
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Initialize feature flags if we're in a browser environment
// This is at the top level but safely checks for browser environment
// to avoid errors in SSR or during static build
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && process.env.NODE_ENV === 'development') {
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
}

export default featureFlags;
