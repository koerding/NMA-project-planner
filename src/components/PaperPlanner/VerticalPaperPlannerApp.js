// FILE: src/components/PaperPlanner/VerticalPaperPlannerApp.js
// Key changes:
// 1. Updated handleImprovementRequest to only process the current section
// 2. Passes the target section ID to improveBatchInstructions
// 3. No complicated feature flag or dev utils imports that could break the build

import React, { useState, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
import useAppStore from '../../store/appStore';
import { useDocumentImport } from '../../hooks/useDocumentImport';
import { reviewScientificPaper } from '../../services/paperReviewService';
import { improveBatchInstructions } from '../../services/instructionImprovementService';
import { exportProject, saveProjectAsJson } from '../../utils/export';
import { trackSectionChange, trackApproachToggle, trackDataMethodToggle, trackExport, trackSave } from '../../utils/analyticsUtils';
import MainLayout from '../layout/MainLayout';
import { ForwardedSplashScreenManager } from '../modals/SplashScreenManager';
import '../../styles/PaperPlanner.css';
import { getNextVisibleSectionId } from '../../utils/sectionOrderUtils';
import sectionContentData from '../../data/sectionContent.json';

// Simple dev mode check that's safe for production
const isDevelopment = process.env.NODE_ENV === 'development';

// Set up developer console helpers in development mode only
if (isDevelopment && typeof window !== 'undefined') {
  // Add dev welcome message
  console.log('%c[DEV] Development mode enabled', 'background: #4b0082; color: white; padding: 4px 8px; border-radius: 3px');
  
  // Initialize kording namespace if needed
  if (!window.kording) {
    window.kording = {};
  }
  
  // Add helper for showing current mode
  window.kording.showMode = function() {
    try {
      const mode = localStorage.getItem('kording_feedback_mode') || 'single';
      console.log(`%c[DEV] Current feedback mode: ${mode.toUpperCase()}`, 
        'background: #333; color: #33F096; font-weight: bold; padding: 4px 8px;');
      return mode;
    } catch (e) {
      return 'single';
    }
  };
  
  // Run initial check
  setTimeout(() => {
    if (window.kording && window.kording.showMode) {
      window.kording.showMode();
    }
  }, 1000);
}

const VerticalPaperPlannerApp = () => {
  // --- Get State and Actions from Zustand Store ---
  const sections = useAppStore((state) => state.sections);
  const activeToggles = useAppStore((state) => state.activeToggles);
  const proMode = useAppStore((state) => state.proMode);
  // Scores are managed internally by updateSectionFeedback now
  const updateSectionContent = useAppStore((state) => state.updateSectionContent);
  const setActiveToggle = useAppStore((state) => state.setActiveToggle);
  const updateSectionFeedback = useAppStore((state) => state.updateSectionFeedback);
  const resetState = useAppStore((state) => state.resetState);
  const loadStoreProjectData = useAppStore((state) => state.loadProjectData);
  const expandAllSections = useAppStore((state) => state.expandAllSections);
  const modals = useAppStore((state) => state.modals);
  const loadingFlags = useAppStore((state) => state.loading); // Get the loading object
  const reviewData = useAppStore((state) => state.reviewData);
  const openModal = useAppStore((state) => state.openModal);
  const closeModal = useAppStore((state) => state.closeModal);
  const setLoading = useAppStore((state) => state.setLoading);
  const setReviewData = useAppStore((state) => state.setReviewData);
  const clearReviewData = useAppStore((state) => state.clearReviewData);
  const zustandShowHelpSplash = useAppStore((state) => state.showHelpSplash);
  const chatMessages = useAppStore((state) => state.chatMessages);
  const currentChatMessage = useAppStore((state) => state.currentChatMessage);
  const currentChatSectionId = useAppStore((state) => state.currentChatSectionId);
  const setCurrentChatMessage = useAppStore((state) => state.setCurrentChatMessage);
  const setCurrentChatSectionId = useAppStore((state) => state.setCurrentChatSectionId);
  const zustandSendMessage = useAppStore((state) => state.sendMessage);


  // --- Local State & Refs ---
  // Active section ID state - this controls the focus
  const [activeSectionId, setActiveSectionId] = useState('question');
  const sectionRefs = useRef({});
  const splashManagerRef = useRef(null);

  // --- Get Current Section Data ---
  const currentSectionData = sections?.[activeSectionId] || null;

  // --- Document Import Hook ---
  // Pass the store's load function and reset function
  const { importLoading: docImportSpecificLoading, handleDocumentImport } = useDocumentImport(
      loadStoreProjectData,
      sectionContentData,
      resetState
  );

  // --- Effects ---
  useEffect(() => {
    // Make splash manager accessible globally if needed
    window.splashManagerRef = splashManagerRef;
  }, []);

  useEffect(() => {
     // Update chat context when active section changes
     // (This is now also updated directly in toggle handlers)
     setCurrentChatSectionId(activeSectionId);
     // Track page view only if GA is initialized
     if (ReactGA.isInitialized) {
         ReactGA.send({ hitType: "pageview", page: `/section/${activeSectionId}` });
     }
  }, [activeSectionId, setCurrentChatSectionId]); // Keep existing effect for general focus changes

  useEffect(() => {
    // Initialize refs for sections
    if (sections) { Object.keys(sections).forEach(sectionId => { sectionRefs.current[sectionId] = sectionRefs.current[sectionId] || React.createRef(); }); }
   }, [sections]);

  useEffect(() => {
    // Listener for opening privacy policy (e.g., from footer link)
    const handleOpenPrivacyPolicy = () => openModal('privacyPolicy');
    window.addEventListener('openPrivacyPolicy', handleOpenPrivacyPolicy);
    return () => window.removeEventListener('openPrivacyPolicy', handleOpenPrivacyPolicy);
   }, [openModal]);


  // --- Core Functions ---
  const handleSectionFocus = (sectionId) => setActiveSectionId(sectionId);
  const handleContentChange = (sectionId, value) => updateSectionContent(sectionId, value);

  // --- MODIFIED TOGGLE HANDLERS ---
  const handleApproachToggle = (approachId) => {
    trackApproachToggle(approachId);
    setActiveToggle('approach', approachId); // Update the active toggle in the store
    setActiveSectionId(approachId); // <<< Set focus to the clicked section
    setCurrentChatSectionId(approachId); // <<< Also update chat context immediately
  };

  const handleDataMethodToggle = (methodId) => {
    trackDataMethodToggle(methodId);
    setActiveToggle('dataMethod', methodId); // Update the active toggle in the store
    setActiveSectionId(methodId); // <<< Set focus to the clicked section
    setCurrentChatSectionId(methodId); // <<< Also update chat context immediately
  };
  // --- END MODIFIED TOGGLE HANDLERS ---

  const handleResetRequest = () => openModal('confirmDialog');
  const handleConfirmReset = () => { resetState(); setActiveSectionId('question'); closeModal('confirmDialog'); };

  // Load project data into the store
  const handleLoadProject = (data) => {
    loadStoreProjectData(data); // Use the store action to load data
    // Set active section based on loaded data, defaulting to 'question'
    const loadedState = useAppStore.getState(); // Get state *after* loading
    setActiveSectionId(loadedState.activeToggles?.approach || 'question');
    expandAllSections(); // Optionally expand all sections after load
  };

  const handleSaveRequest = () => openModal('saveDialog');

  // UPDATED: handleSaveWithFilename to use the new approach
  const handleSaveWithFilename = (fileName) => {
    trackSave();
    // Just pass chat messages to saveProjectAsJson
    // The function will get the full sections data from the store
    saveProjectAsJson(null, chatMessages, fileName);
    closeModal('saveDialog');
  };

  // Export uses only content for PDF/DOCX/MD
  const handleExportRequest = () => {
    trackExport('any');
    const sectionsToExport = Object.entries(sections || {}).reduce((acc, [id, data]) => {
      acc[id] = data?.content; // Export only the content
      return acc;
    }, {});
    exportProject(sectionsToExport, chatMessages); // Pass chat messages if needed
  };

  const handleOpenExamples = () => openModal('examplesDialog');
  const handleShowHelpSplash = () => {
    zustandShowHelpSplash(); // Use store action
    if (splashManagerRef.current && typeof splashManagerRef.current.showSplash === 'function') {
      splashManagerRef.current.showSplash();
    } else {
      console.warn("Could not call showSplash on splashManagerRef");
    }
  };
  const handleOpenReviewModal = () => openModal('reviewModal');
  const handleReviewPaperRequest = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading('review', true); // Set loading state in store
    try {
        const result = await reviewScientificPaper(file);
        if (result.success) setReviewData(result); // Update review data in store
        else { clearReviewData(); alert(`Error reviewing paper: ${result.error || 'Unknown error'}`); }
    } catch (error) { clearReviewData(); alert(`Error reviewing paper: ${error.message || 'Unknown error'}`); }
    finally { setLoading('review', false); } // Clear loading state in store
  };

  // UPDATED: Request AI feedback for a section (or current active section)
  const handleImprovementRequest = async (sectionId = null) => {
    const targetSectionId = sectionId || activeSectionId;
    const sectionToImprove = sections?.[targetSectionId];

    // Basic check if section exists and has content
    if (!sectionToImprove || sectionToImprove.content === (sectionToImprove.placeholder || '') || sectionToImprove.content.trim() === '') {
      alert("Please add content to the section before requesting feedback.");
      return;
    }

    setLoading('improvement', true); // Set loading state in store
    try {
      // Call the improved service function, which now manages mode internally
      const result = await improveBatchInstructions(
        null,                // currentSections (unused)
        null,                // userInputs (unused)
        sectionContentData,  // sectionContent
        false,               // forceImprovement (unused)
        targetSectionId      // Pass the targetSectionId as needed
      );

      if (result.success && result.improvedData && result.improvedData.length > 0) {
        // Update feedback for the improved section in the store
        const feedbackItem = result.improvedData[0];
        if (feedbackItem && feedbackItem.id) {
          updateSectionFeedback(feedbackItem.id, feedbackItem);
          
          // Logic to potentially advance section after feedback
          const nextSectionId = getNextVisibleSectionId(targetSectionId, activeToggles.approach, activeToggles.dataMethod);
          // If next section exists and is minimized, expand it
          if (nextSectionId && sections?.[nextSectionId]?.isMinimized) {
            useAppStore.getState().toggleMinimize(nextSectionId);
          }
          // Optionally, focus the next section
          // if (nextSectionId) {
          //   setActiveSectionId(nextSectionId);
          // }
        }
      } else {
        console.error("Improvement failed", result);
        alert(`Failed to get feedback: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error improving:", error);
      alert(`Error getting feedback: ${error.message}`);
    } finally {
      setLoading('improvement', false); // Clear loading state in store
    }
  };
  
  const handleCloseReviewModal = () => closeModal('reviewModal');

  // --- Props for Child Components ---
  // Ensure sections is an object before passing down
  const safeSections = sections || {};

  const contentAreaProps = {
        activeSection: activeSectionId, // Pass the state variable
        activeApproach: activeToggles.approach,
        activeDataMethod: activeToggles.dataMethod,
        handleSectionFocus,
        handleApproachToggle, // Pass the modified handler
        handleDataMethodToggle, // Pass the modified handler
        proMode,
        handleMagic: handleImprovementRequest,
        // Loading state is accessed by components directly from store when needed
    };

  const interactionProps = {
      currentSection: currentChatSectionId,
      currentSectionTitle: sections?.[currentChatSectionId]?.title || '',
      chatMessages: chatMessages,
      currentMessage: currentChatMessage,
      setCurrentMessage: setCurrentChatMessage,
      handleSendMessage: zustandSendMessage, // Use the store's send message action
      loading: loadingFlags.chat, // Pass chat-specific loading flag
      // isAiBusy is accessed by components directly from store when needed
      currentSectionData: sections?.[currentChatSectionId] || null,
  };

  // --- Render ---
  // Render loading state or the main layout
  if (!sections || Object.keys(sections).length === 0) {
      // This might happen briefly during initial load or if state fails
      return <div className="p-4 text-center text-gray-500">Loading application state...</div>;
  }

  return (
    <MainLayout
      splashManagerRef={splashManagerRef}
      resetProject={handleResetRequest}
      exportProject={handleExportRequest}
      saveProject={handleSaveRequest} // Pass the function that opens the save dialog
      loadProject={handleLoadProject} // Pass the function that handles loading data into the store
      importDocumentContent={handleDocumentImport} // Pass the import handler
      onOpenReviewModal={handleOpenReviewModal}
      openExamplesDialog={handleOpenExamples}
      showHelpSplash={handleShowHelpSplash}
      contentAreaProps={contentAreaProps}
      interactionProps={interactionProps}
      modalState={modals} // Pass modal visibility state from store
      currentReviewData={reviewData} // Pass review data from store
      modalActions={{
          closeConfirmDialog: () => closeModal('confirmDialog'),
          closeExamplesDialog: () => closeModal('examplesDialog'),
          closeReviewModal: handleCloseReviewModal,
          closePrivacyPolicy: () => closeModal('privacyPolicy'),
          closeSaveDialog: () => closeModal('saveDialog'),
          onConfirmReset: handleConfirmReset,
      }}
      handleReviewPaper={handleReviewPaperRequest}
      saveWithFilename={handleSaveWithFilename} // Pass the function that performs the actual save
      // No need to pass isAnyAiLoading as a prop anymore - components access store directly
    />
  );
};

export default VerticalPaperPlannerApp;
