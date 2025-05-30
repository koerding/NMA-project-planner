// FILE: src/components/PaperPlanner/ConfirmDialog.js

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import useAppStore from '../../store/appStore';

/**
 * Completely fixed ConfirmDialog with ultimate z-index and DOM positioning
 */
const ConfirmDialog = ({ showConfirmDialog, setShowConfirmDialog, resetProject }) => {
  // Get the import confirmation operation from the store
  const importConfirmOperation = useAppStore((state) => state._importConfirmOperation);
  
  // Determine if this is an import confirmation
  const isImportConfirm = importConfirmOperation?.active === true;
  
  // Get the message to display
  const message = isImportConfirm 
    ? (importConfirmOperation.message || "Are you sure you want to continue?")
    : "Are you sure you want to start a new project? All current progress will be lost.";
  
  // The title text
  const title = isImportConfirm ? "Confirm Import" : "Confirm New Project";
  
  // The confirm button text
  const confirmText = isImportConfirm ? "Yes, continue" : "Yes, start new";
  
  // Effect to create a modal container if it doesn't exist
  useEffect(() => {
    // Create a global modal container if one doesn't exist
    let modalRoot = document.getElementById('modal-root');
    
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      // Absolutely force this to the top of z-index hierarchy
      modalRoot.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 0;
        z-index: 99999;
        pointer-events: none;
      `;
      document.body.appendChild(modalRoot);
    }
  }, []);

  // Handle confirm button click
  const handleConfirm = () => {
    if (isImportConfirm) {
      // This is an import confirmation, resolve the promise
      if (typeof window._importConfirmResolve === 'function') {
        window._importConfirmResolve(true); // Resolve with true
        
        // Clear the import confirmation operation
        useAppStore.setState({
          _importConfirmOperation: {
            active: false,
            message: null
          }
        });
      }
    } else {
      // This is a regular reset confirmation
      if (typeof resetProject === 'function') {
        resetProject();
      } else {
        console.error("ConfirmDialog: resetProject prop function is missing!");
      }
    }
    
    // Close the dialog
    if (typeof setShowConfirmDialog === 'function') {
      setShowConfirmDialog(false);
    }
  };
  
  // Handle cancel button click
  const handleCancel = () => {
    if (isImportConfirm) {
      // This is an import confirmation, resolve the promise with false
      if (typeof window._importConfirmResolve === 'function') {
        window._importConfirmResolve(false); // Resolve with false
        
        // Clear the import confirmation operation
        useAppStore.setState({
          _importConfirmOperation: {
            active: false,
            message: null
          }
        });
      }
    }
    
    // Close the dialog
    if (typeof setShowConfirmDialog === 'function') {
      setShowConfirmDialog(false);
    }
  };

  // Prevent body scrolling when dialog is open
  useEffect(() => {
    if (showConfirmDialog) {
      // Save the current styles
      const prevBodyStyles = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight,
      };
      
      // Force body to not scroll
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px'; // Add padding to prevent layout shift
      
      // Ensure rail menu can't be clicked
      const rail = document.querySelector('.rail');
      const prevRailStyles = rail ? { 
        pointerEvents: rail.style.pointerEvents,
        zIndex: rail.style.zIndex 
      } : null;
      
      if (rail) {
        rail.style.pointerEvents = 'none';
        rail.style.zIndex = '39'; // Ensure it's below our modal
      }
      
      return () => {
        // Restore original styles
        document.body.style.overflow = prevBodyStyles.overflow;
        document.body.style.paddingRight = prevBodyStyles.paddingRight;
        
        if (rail && prevRailStyles) {
          rail.style.pointerEvents = prevRailStyles.pointerEvents;
          rail.style.zIndex = prevRailStyles.zIndex;
        }
      };
    }
  }, [showConfirmDialog]);
  
  // Early return if dialog is not showing
  if (!showConfirmDialog) {
    return null;
  }

  // The modal content
  const modalContent = (
    // Overlay with insanely high z-index
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      pointerEvents: 'auto'
    }}>
      {/* Modal window with even higher z-index */}
      <div style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        width: '90%',
        maxWidth: '28rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        zIndex: 1000000,
        pointerEvents: 'auto'
      }}>
        <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
        <p className="mb-6 text-gray-600">
          {message}
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  // Get the modal container
  const modalRoot = document.getElementById('modal-root') || document.body;
  
  // Use createPortal to render outside normal hierarchy
  return ReactDOM.createPortal(modalContent, modalRoot);
};

export default ConfirmDialog;
