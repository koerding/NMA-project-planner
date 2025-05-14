// FILE: src/utils/devUtils.js
/**
 * Developer utilities for testing and configuration
 * These functions are only meant to be used during development
 * or by authorized users with special access
 */
import { setFeatureFlag, getFeatureFlag } from '../config/featureFlags';

/**
 * Toggle the feedback analysis mode between single and batch
 * @returns {string} The new mode after toggling
 */
export const toggleFeedbackMode = () => {
  const currentMode = getFeatureFlag('FEEDBACK_MODE', 'single');
  const newMode = currentMode === 'single' ? 'batch' : 'single';
  setFeatureFlag('FEEDBACK_MODE', newMode);
  
  // Log to console for visibility
  console.log(`%c[DEV] Feedback Mode: ${newMode}`, 'background: #4b0082; color: white; padding: 2px 6px; border-radius: 3px');
  
  // Also create a visual notification on screen if possible
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
    notificationDiv.textContent = `Feedback Mode: ${newMode.toUpperCase()}`;
    
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
  
  return newMode;
};

/**
 * Enable developer mode with a secret key
 * @param {string} secretKey - The secret key to enable dev mode
 * @returns {boolean} Whether the key was accepted
 */
export const enableDevMode = (secretKey) => {
  const validKey = 'kording'; // Replace with your actual secret key
  
  if (secretKey === validKey) {
    try {
      localStorage.setItem('kording_dev_mode', 'true');
      console.log('%c[DEV] Developer Mode Activated', 'background: #F44336; color: white; padding: 4px 8px; border-radius: 3px');
      return true;
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  return false;
};

/**
 * Show current feature flag values in console
 */
export const showFeatureFlags = () => {
  const flags = {};
  
  // Get values of all known flags
  flags.FEEDBACK_MODE = getFeatureFlag('FEEDBACK_MODE', 'single');
  flags.ENABLE_DEBUG_LOGS = getFeatureFlag('ENABLE_DEBUG_LOGS', false);
  
  console.log('%c[DEV] Current Feature Flags:', 'background: #333; color: #33F096; font-weight: bold; padding: 4px 8px;');
  console.table(flags);
  
  return flags;
};

/**
 * Hide the developer tools behind a console function for easy access
 */
const setupDevConsole = () => {
  if (typeof window !== 'undefined') {
    window.kording = {
      toggleMode: toggleFeedbackMode,
      enableDevMode: enableDevMode,
      showFlags: showFeatureFlags
    };
    
    console.log('%c[DEV] Developer utils loaded. Use window.kording to access.', 'color: #666; font-style: italic;');
  }
};

// Run setup when imported in development
if (process.env.NODE_ENV === 'development') {
  setupDevConsole();
}
