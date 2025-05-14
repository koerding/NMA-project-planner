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
  const modeDescription = newMode === 'single' 
    ? 'SINGLE SECTION MODE (analyze only current section)' 
    : 'BATCH MODE (analyze all eligible sections)';
    
  console.log(`%c[DEV] Feedback Mode switched to: ${modeDescription}`, 
    'background: #4b0082; color: white; padding: 2px 6px; border-radius: 3px');
  
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
      
      // Show help message
      console.log('%c[DEV] Available commands:', 'color: #333; font-weight: bold;');
      console.log('   window.kording.toggleMode() - Switch between single and batch feedback modes');
      console.log('   window.kording.showFlags() - Show current feature flag values');
      
      return true;
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  return false;
};

/**
 * Show current feature flag values in console with descriptions
 */
export const showFeatureFlags = () => {
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
  
  // Log in a more readable format than console.table
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

// Automatically check for secret dev mode in URL
if (typeof window !== 'undefined' && window.location.search.includes('devMode=kording')) {
  enableDevMode('kording');
}
