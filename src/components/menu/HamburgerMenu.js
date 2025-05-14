// FILE: src/components/menu/HamburgerMenu.js
// MODIFIED: Removed "Import Doc for Example" functionality.
// MODIFIED: Adjusted styles to prevent footer overlap.
import React, { useState, useRef, useEffect } from 'react';
import c4rLogo from '../../assets/icons/01_C4R-short.png';

const HamburgerMenu = ({
  resetProject,
  exportProject,
  // importDocumentContent, // Removed
  onOpenReviewModal,
  showHelpSplash,
  isAiBusy,
  // localImportLoading, // Removed, as the feature it was for is removed
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef(null);

  const isLoading = isAiBusy; // Simplified loading state

  const loadingSpinner = (
    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target) && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMenuAction = (action) => {
    if (action) action();
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-400"
        aria-label="Open menu"
        disabled={isLoading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div
        className={`fixed inset-0 bg-black bg-opacity-25 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      ></div>

      <div
        ref={drawerRef}
        className={`fixed top-0 left-0 bottom-0 bg-white shadow-lg w-64 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-600 text-white rounded-md flex items-center justify-center mr-2">
              <span className="font-bold text-lg">SP</span>
            </div>
            <span className="font-semibold text-gray-700">Menu</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Items - Added flex-grow and overflow-y-auto for scrolling, and pb for footer space */}
        <nav className="p-4 flex-grow overflow-y-auto pb-20"> {/* pb-20 to ensure space for footer */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Project</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleMenuAction(resetProject)}
                  disabled={isLoading}
                  className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                >
                  {isLoading ? loadingSpinner : (
                    <svg className="h-4 w-4 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  New Project
                </button>
              </li>
            </ul>
          </div>

          <div className="mb-4 pt-3 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tools</h3>
            <ul className="space-y-2">
              {/* "Import Doc for Example" button removed here */}
              <li>
                <button
                  onClick={() => handleMenuAction(exportProject)}
                  disabled={isLoading}
                  className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                >
                  {isLoading ? loadingSpinner : (
                    <svg className="h-4 w-4 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  )}
                  Export
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleMenuAction(showHelpSplash)}
                  disabled={isLoading}
                  className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                >
                  {isLoading ? loadingSpinner : (
                    <svg className="h-4 w-4 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Help
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Footer Text - ensure it's at the bottom and doesn't overlap scrollable content */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500 text-center flex-shrink-0">
          <p>Scientific Project Planner</p>
          <p className="mt-1">
            Built with ❤️ by Konrad @Kordinglab
            in collaboration with <a href="https://c4r.io" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:underline">
              <img src={c4rLogo} alt="Center for Reproducible Research" className="ml-1" style={{ height: '1em', verticalAlign: 'middle' }} />
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default HamburgerMenu;
