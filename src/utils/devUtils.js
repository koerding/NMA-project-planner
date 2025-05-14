// FILE: src/utils/devUtils.js
/**
 * Developer utilities for testing and configuration
 * These functions are only meant to be used during development
 * 
 * IMPORTANT: This file is structured to be safe to include in production builds
 * but will not activate any functionality in production.
 */
import { getFeatureFlag } from '../config/featureFlags';

// Only import setFeatureFlag in development mode
let setFeatureFlag;
if (process.env.NODE_ENV === 'development') {
  // Dynamic import to avoid issues in production
  import('../config/featureFlags').then(module => {
    setFeatureFlag = module.setFeatureFlag;
  }).catch(() => {
    // Fallback if import fails
    setFeatureFlag = () => console.warn('setFeatureFlag not available');
  });
} else {
  // No-op in production
  setFeatureFlag = () => {};
}

/**
 * Toggle the feedback analysis mode between single and batch
 * @returns {string} The new mode after toggling
 */
export const toggleFeedbackMode = () => {
  // Early return in production
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev tools are not available in production');
    return 'single';
  }
  
  // Only continue in development mode
  const currentMode = getFeatureFlag('FEEDBACK_MODE', 'single');
  const newMode = currentMode === 'single' ? 'batch' : 'single';
  
  // Only set if we have the function
  if (typeof setFeatureFlag === 'function') {
    setFeatureFlag('FEEDBACK_MODE', newMode);
  }
  
  // Log to console for visibility
  const modeDescription = newMode === 'single' 
    ? 'SINGLE SECTION MODE (analyze only current section)' 
    : 'BATCH MODE (analyze all eligible sections)';
    
  console.log(`%c[DEV] Feedback Mode switched to: ${modeDescription}`, 
    'background: #4b0082; color: white; padding: 2px 6px; border-radius: 3px');
  
  // Notification (only in development)
  if (typeof window !== 'undefined') {
    try {
      const notificationDiv = document.createElement('div');
      notificationDiv.style.position = 'fixed';
      notificationDiv.style.bottom = '20px';
      notificationDiv.style.right = '20px';
      notificationDiv.style.backgroundColor = newMode === 'single' ? '#6200EA' : '#00C853';
      notificationDiv.style.color = 'white';
      notificationDiv.style.padding = '8px 16px';
      notificationDiv.style.borderRadius = '4px';
      notificationDiv.style.zIndex = '10000';
      notificationDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      notificationDiv.style.transition = 'opacity 0.5s ease-in-out';
      notificationDiv.style.fontSize = '14px';
      notificationDiv.style.fontWeight = 'bold';
      
      if (newMode === 'single') {
        notificationDiv.textContent = '🔬 SINGLE SECTION MODE';
        notificationDiv.title = 'Only analyzing the current active section';
      } else {
        notificationDiv.textContent = '🔭 BATCH MODE';
        notificationDiv.title = 'Analyzing all eligible sections';
      }
      
      document.body.appendChild(notificationDiv);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        notificationDiv.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(notificationDiv);
        }, 500);
      }, 3000);
    } catch (e) {
      // Ignore DOM errors
    }
  }
  
  return newMode;
};

/**
 * Show current feature flag values in console with descriptions
 */
export const showFeatureFlags = () => {
  // Early return in production
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev tools are not available in production');
    return {};
  }
  
  const flags = {};
  
  // Get values of all known flags with descriptions
  const currentFeedbackMode = getFeatureFlag('FEEDBACK_MODE', 'single');
  flags.FEEDBACK_MODE = {
    value: currentFeedbackMode,
    description: currentFeedbackMode === 'single' 
      ? 'Analyzing only the current section' 
      : 'Analyzing all eligible sections'
  };
  
  flags.ENABLE_DEBUG_LOGS = {
    value: getFeatureFlag('ENABLE_DEBUG_LOGS', false),
    description: 'Show detailed debug logs in console'
  };
  
  console.log('%c[DEV] Current Feature Flags:', 'background: #333; color: #33F096; font-weight: bold; padding: 4px 8px;');
  
  // Log in a more readable format
  Object.entries(flags).forEach(([key, info]) => {
    console.log(
      `%c${key}:%c ${info.value}%c - ${info.description}`, 
      'color: #4CAF50; font-weight: bold', 
      'color: #2196F3; font-weight: bold', 
      'color: #666'
    );
  });
  
  return flags;
};

// Only set up the console utilities in development mode
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Set up the global object for console access
  window.kording = {
    toggleMode: toggleFeedbackMode,
    showFlags: showFeatureFlags
  };
  
  console.log('%c[DEV] Developer utils loaded. Use window.kording to access.', 'color: #666; font-style: italic;');
}

// Export a dummy object for production to avoid build errors
export default {
  // These will be no-ops in production
  toggleFeedbackMode,
  showFeatureFlags
};
