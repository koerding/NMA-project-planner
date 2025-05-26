/NM// FILE: src/components/layout/AppHeader.js
// MODIFIED: Added nmg icon in the center of the header
import React, { useState, useEffect, useRef } from 'react';
import useAppStore from '../../store/appStore';
import HamburgerMenu from '../menu/HamburgerMenu';

const AppHeader = ({
  resetProject,
  exportProject,
  saveProject,
  loadProject,
  onOpenReviewModal,
  showHelpSplash,
}) => {
  const isAiBusy = useAppStore((state) => state.isAnyLoading());
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const loadFileInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileView = windowWidth < 768;

  const loadingSpinner = (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const handleLoadButtonClick = () => {
    if (loadFileInputRef.current) loadFileInputRef.current.click();
  };

  const handleFileSelectionForLoad = (event) => {
    const file = event.target.files?.[0];
    if (file && loadProject) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          loadProject(data);
        } catch (error) {
          console.error('Error parsing project file:', error);
          alert('Invalid project file format. Please select a valid JSON file.');
        }
      };
      reader.readAsText(file);
    }
    if (event.target) event.target.value = '';
  };

  // Adjusted button classes for consistent width and padding
  const getTightButtonClasses = () => {
    return `inline-flex items-center justify-center w-24 h-9 px-2 py-1 border border-gray-300 rounded-md shadow-sm
           text-sm font-medium transition-colors text-gray-700 bg-white hover:bg-gray-100
           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
           ${isAiBusy ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`;
  };
  // w-24 corresponds to 6rem or 96px. h-9 is 36px.
  // px-2 for horizontal padding, py-1 for vertical padding.
  // Added focus styles for better accessibility.
  // Changed hover:bg-gray-50 to hover:bg-gray-100 for a bit more visible hover.

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between h-16"> {/* Added h-16 for consistent header height */}
        {/* Left section: Hamburger menu */}
        <div className="flex items-center">
          <HamburgerMenu
            resetProject={resetProject}
            exportProject={exportProject}
            onOpenReviewModal={onOpenReviewModal}
            showHelpSplash={showHelpSplash}
            isAiBusy={isAiBusy}
          />
        </div>

        {/* Middle section: NMA Icon */}
        <div className="flex-grow flex justify-center items-center">
          <img 
            src="/nma icon.png" 
            alt="Neuromatch Accademy Logo" 
            className="h-10 max-w-none object-contain"
          />
        </div>

        {/* Right section: Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={showHelpSplash}
            disabled={isAiBusy}
            className={getTightButtonClasses()}
            aria-label="Help"
            title="Help"
          >
            {isAiBusy ? loadingSpinner : (
              <>
                <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
              </>
            )}
          </button>
          <button
            onClick={handleLoadButtonClick}
            disabled={isAiBusy}
            className={getTightButtonClasses()}
            aria-label="Load Project"
            title="Load Project"
          >
             {isAiBusy ? loadingSpinner : (
               <>
                <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                 </svg>
                Load
               </>
             )}
          </button>
          <input
            type="file"
            ref={loadFileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleFileSelectionForLoad}
            disabled={isAiBusy}
          />
          <button
            onClick={saveProject}
            disabled={isAiBusy}
            className={getTightButtonClasses()}
            aria-label="Save"
            title="Save Project"
          >
            {isAiBusy ? loadingSpinner : (
              <>
                <svg className="h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
