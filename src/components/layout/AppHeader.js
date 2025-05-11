// FILE: src/components/layout/AppHeader.js
// MODIFIED: Removed the guide/write mode toggle pill
// MODIFIED: Removed the logo icon
// MODIFIED: Added Load button next to Save button
import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import useAppStore from '../../store/appStore'; // Import store
import HamburgerMenu from '../menu/HamburgerMenu'; // Import our hamburger menu component

const AppHeader = ({
  resetProject,
  exportProject,
  saveProject, // This will be the function to open the SaveDialog
  loadProject, // This is the function to handle the loaded project data from the store
  importDocumentContent,
  onOpenReviewModal,
  showHelpSplash,
}) => {
  // --- Get global loading state directly from store ---
  const isAiBusy = useAppStore((state) => state.isAnyLoading());

  // --- Add local state for import loading and responsive behavior ---
  const [localImportLoading, setLocalImportLoading] = useState(false); // For PDF->Example
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const loadFileInputRef = useRef(null); // Ref for the hidden file input for loading

  // --- Handle window resize ---
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // --- Determine if we're in mobile view ---
  const isMobileView = windowWidth < 768; // Adjusted breakpoint for better layout

  // --- Loading spinner SVG ---
  const loadingSpinner = (
    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  const handleHelpClick = () => {
    if (showHelpSplash) showHelpSplash();
  };

  // Function to trigger the hidden file input for loading projects
  const handleLoadButtonClick = () => {
    if (loadFileInputRef.current) {
      loadFileInputRef.current.click();
    }
  };

  // Handle file selection for project loading (.json)
  const handleFileSelectionForLoad = (event) => {
    const file = event.target.files?.[0];
    if (file && loadProject) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          loadProject(data); // This calls the store's loadProjectData action
        } catch (error) {
          console.error('Error parsing project file:', error);
          alert('Invalid project file format. Please select a valid JSON file.');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = ''; // Reset input
  };


  // Tight button styles with minimal padding
  const getTightButtonClasses = () => {
    return `inline-flex items-center justify-center px-3 py-2 border rounded-md shadow-sm
           text-sm font-medium transition-colors text-gray-700 bg-white hover:bg-gray-50
           ${isAiBusy || localImportLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`;
  };

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 py-2">
        {isMobileView ? (
          // Mobile Layout: Simple row with hamburger menu and buttons
          <div className="flex items-center justify-between">
            {/* Left: Hamburger Menu */}
            <div className="flex items-center">
              <HamburgerMenu
                resetProject={resetProject}
                exportProject={exportProject}
                // loadProject removed from HamburgerMenu props
                importDocumentContent={importDocumentContent} // Kept for PDF->Example
                onOpenReviewModal={onOpenReviewModal}
                showHelpSplash={showHelpSplash}
                isAiBusy={isAiBusy}
                localImportLoading={localImportLoading}
              />
            </div>

            {/* Right: Help, Load, Save buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleHelpClick}
                disabled={isAiBusy || localImportLoading}
                className={getTightButtonClasses()}
                aria-label="Help"
              >
                {isAiBusy || localImportLoading ? loadingSpinner : (
                  <>
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help
                  </>
                )}
              </button>
               {/* Load Button - TIGHT VERSION */}
              <button
                onClick={handleLoadButtonClick}
                disabled={isAiBusy || localImportLoading}
                className={getTightButtonClasses()}
                aria-label="Load Project"
              >
                {isAiBusy || localImportLoading ? loadingSpinner : (
                   <>
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                disabled={isAiBusy || localImportLoading}
              />
              {/* Save Button - TIGHT VERSION */}
              <button
                onClick={saveProject} // This now opens the SaveDialog
                disabled={isAiBusy || localImportLoading}
                className={getTightButtonClasses()}
                aria-label="Save"
              >
                {isAiBusy || localImportLoading ? loadingSpinner : (
                  <>
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          // Desktop Layout: Centered content with left and right sidebar sections
          <div className="flex items-center justify-between">
            {/* Left section: Hamburger menu */}
            <div className="flex items-center w-1/4 justify-start">
              <HamburgerMenu
                resetProject={resetProject}
                exportProject={exportProject}
                // loadProject removed
                importDocumentContent={importDocumentContent}
                onOpenReviewModal={onOpenReviewModal}
                showHelpSplash={showHelpSplash}
                isAiBusy={isAiBusy}
                localImportLoading={localImportLoading}
              />
            </div>

            {/* Middle section: App Title */}
            <div className="flex items-center w-2/4 justify-center">
              {/* Title can be added here if desired */}
            </div>

            {/* Right section: Help, Load, Save buttons - TIGHT VERSION */}
            <div className="flex items-center w-1/4 justify-end space-x-2">
              <button
                onClick={handleHelpClick}
                disabled={isAiBusy || localImportLoading}
                className={getTightButtonClasses()}
                aria-label="Help"
              >
                {isAiBusy || localImportLoading ? loadingSpinner : (
                  <>
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Help
                  </>
                )}
              </button>
              {/* Load Button */}
              <button
                onClick={handleLoadButtonClick}
                disabled={isAiBusy || localImportLoading}
                className={getTightButtonClasses()}
                aria-label="Load Project"
              >
                 {isAiBusy || localImportLoading ? loadingSpinner : (
                   <>
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                disabled={isAiBusy || localImportLoading}
              />
              {/* Save Button */}
              <button
                onClick={saveProject} // This opens the SaveDialog
                disabled={isAiBusy || localImportLoading}
                className={getTightButtonClasses()}
                aria-label="Save"
              >
                {isAiBusy || localImportLoading ? loadingSpinner : (
                  <>
                    <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
