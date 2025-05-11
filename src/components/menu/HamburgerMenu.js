// FILE: src/components/menu/HamburgerMenu.js
// MODIFIED: Removed PDF->Example button and ProModeToggle. Load button moved to AppHeader.
import React, { useState, useRef, useEffect } from 'react';
import c4rLogo from '../../assets/icons/01_C4R-short.png'; // Import the C4R logo

const HamburgerMenu = ({
  resetProject,
  exportProject,
  // loadProject, // Removed, handled in AppHeader now
  importDocumentContent, // Retained, as it's a different functionality (PDF to Example)
  onOpenReviewModal,
  showHelpSplash,
  isAiBusy,
  localImportLoading,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef(null);

  // Loading spinner SVG
  const loadingSpinner = (
    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target) && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Function to handle file import (PDF to Example)
  const handlePdfToExampleImport = async (event) => {
    const file = event.target.files?.[0];
    if (file && importDocumentContent) {
      await importDocumentContent(file); // This is the PDF->Example functionality
    }
    event.target.value = ''; // Reset input
    setIsOpen(false); // Close drawer after import
  };

  const handleNewButtonClick = () => {
    if (resetProject) resetProject();
    setIsOpen(false); // Close drawer after action
  };

  const handleReviewClick = () => {
    if (onOpenReviewModal) onOpenReviewModal();
    setIsOpen(false); // Close drawer after action
  };

  const handleExportClick = () => {
    if (exportProject) exportProject();
    setIsOpen(false); // Close drawer after action
  };

  const handleHelpClick = () => {
    if (showHelpSplash) showHelpSplash();
    setIsOpen(false); // Close drawer after action
  };

  return (
    <>
      {/* Hamburger Icon */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-md focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-400"
        aria-label="Open menu"
        disabled={isAiBusy || localImportLoading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Drawer Background Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-25 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 left-0 bottom-0 bg-white shadow-lg w-64 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
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

        {/* Menu Items */}
        <nav className="p-4">
          {/* Project Group */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Project</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={handleNewButtonClick}
                  disabled={isAiBusy || localImportLoading}
                  className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                >
                  {isAiBusy ? loadingSpinner : (
                    <svg className="h-4 w-4 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  New Project
                </button>
              </li>
              {/* "PDF->Example" button removed here */}
            </ul>
          </div>

          {/* Mode Settings - ProModeToggle removed */}
          {/*
          <div className="mb-4 pt-3 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Settings</h3>
             <div className="px-3 py-2">
               <ProModeToggle /> Removed
             </div>
          </div>
          */}

          {/* Import/Export Group */}
          <div className="mb-4 pt-3 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tools</h3>
            <ul className="space-y-2">
              <li>
                 <label
                  className={`w-full text-left flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${(isAiBusy || localImportLoading) ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
                  style={(isAiBusy || localImportLoading) ? { pointerEvents: 'none' } : {}}
                 >
                  {localImportLoading ? loadingSpinner : (
                    <svg className="h-4 w-4 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                  {localImportLoading ? "Importing..." : "Import Doc for Example"}
                  <input type="file" className="hidden" accept=".pdf,.docx,.doc" onChange={handlePdfToExampleImport} disabled={isAiBusy || localImportLoading} />
                 </label>
              </li>
              <li>
                <button
                  onClick={handleExportClick}
                  disabled={isAiBusy || localImportLoading}
                  className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                >
                  {isAiBusy ? loadingSpinner : (
                    <svg className="h-4 w-4 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  )}
                  Export
                </button>
              </li>
              <li>
                <button
                  onClick={handleReviewClick}
                  disabled={isAiBusy || localImportLoading}
                  className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                >
                  {isAiBusy ? loadingSpinner : (
                    <svg className="h-4 w-4 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Review
                </button>
              </li>
              <li>
                <button
                  onClick={handleHelpClick}
                  disabled={isAiBusy || localImportLoading}
                  className="w-full text-left flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-100"
                >
                  {isAiBusy ? loadingSpinner : (
                    <svg className="h-4 w-4 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Help
                </button>
              </li>
            </ul>
          </div>

          {/* Footer Text - With Added C4R Logo */}
          <div className="absolute bottom-4 left-4 right-4 text-xs text-gray-500 text-center">
            <p>Scientific Project Planner</p>
            <p className="mt-1">
              Built with ❤️ by Konrad @Kordinglab
              in collaboration with <a href="https://c4r.io" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:underline">
                <img src={c4rLogo} alt="Center for Reproducible Research" className="ml-1" style={{ height: '1em', verticalAlign: 'middle' }} />
              </a>
            </p>
          </div>
        </nav>
      </div>
    </>
  );
};

export default HamburgerMenu;
