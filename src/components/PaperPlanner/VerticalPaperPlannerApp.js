// FILE: src/components/PaperPlanner/VerticalPaperPlannerApp.js
// MODIFIED: Changed saveProjectToFile to saveProjectAsJson and updated its usage.
import React, { useEffect, useCallback } from 'react';
import useAppStore from '../../store/appStore';
import { improveInstruction } from '../../services/instructionImprovementService';
import { reviewPaperContent } from '../../services/paperReviewService';
// MODIFIED: Import saveProjectAsJson instead of saveProjectToFile
import { exportToMarkdown, exportToDocx, exportToPdf, saveProjectAsJson } from '../../utils/export';
import sectionContentData from '../../data/sectionContent.json';

import MainLayout from '../layout/MainLayout';
import SplashScreenManager from '../modals/SplashScreenManager';
import ModalManager from '../modals/ModalManager';
import AppHeader from '../layout/AppHeader';

const VerticalPaperPlannerApp = () => {
  const {
    initializeOnboardingFromLocalStorage,
    sections, // Used for constructing what saveProjectAsJson might need if not getting from store
    activeToggles, // Same as above
    scores, // Same as above
    modals,
    openModal,
    closeModal,
    setLoading, // Passed to saveProjectAsJson indirectly via SaveDialog, or directly if we adapt
    setReviewData,
    loadProjectData,
    resetState,
    updateSectionFeedback,
    showHelpSplash: showHelpSplashAction,
    hideHelpSplash,
    proMode, // Used for constructing what saveProjectAsJson might need
    setUiMode,
    uiMode,
    currentChatSectionId,
    setActiveSectionId,
    setGlobalAiLoading,
  } = useAppStore();

  useEffect(() => {
    initializeOnboardingFromLocalStorage();
  }, [initializeOnboardingFromLocalStorage]);

  const handleResetProject = useCallback(() => {
    openModal('confirmDialog');
  }, [openModal]);

  const confirmResetProject = useCallback(() => {
    resetState();
    closeModal('confirmDialog');
  }, [resetState, closeModal]);

  // MODIFIED: This function will now call saveProjectAsJson.
  // saveProjectAsJson internally gets most state from the store and prompts for filename.
  // It primarily needs userInputs and chatMessages for backward compatibility or specific reasons.
  const handleSaveProject = useCallback(() => {
    setLoading('export', true); // Keep loading state consistent with other exports
    try {
      // Extract userInputs (content only) and chatMessages as currently expected by saveProjectAsJson
      // though it mainly uses store data for the comprehensive save.
      const userInputsForSave = Object.fromEntries(
        Object.entries(sections).map(([id, data]) => [id, data.content])
      );
      const chatMessagesForSave = useAppStore.getState().chatMessages;

      // saveProjectAsJson will prompt for filename internally
      const success = saveProjectAsJson(userInputsForSave, chatMessagesForSave);
      if (success) {
        console.log("Project save initiated by saveProjectAsJson.");
      } else {
        console.warn("Project save may have been cancelled or failed.");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Failed to save project: " + (error.message || "Unknown error"));
    } finally {
      setLoading('export', false);
    }
  }, [sections, setLoading]);


  const handleLoadProject = useCallback((data) => {
    setLoading('project', true);
    try {
      loadProjectData(data);
    } catch (error) {
      console.error("Error loading project data in VerticalPaperPlannerApp:", error);
      alert("Failed to load project: " + (error.message || "Unknown error"));
    } finally {
      setLoading('project', false);
    }
  }, [loadProjectData, setLoading]);

  const handleExportProject = useCallback((format = 'markdown') => {
    const projectState = { sections, activeToggles, scores, proMode }; // This structure is for MD, DOCX, PDF
    setLoading('export', true);
    try {
      if (format === 'markdown') {
        exportToMarkdown(projectState, sectionContentData.sections);
      } else if (format === 'docx') {
        exportToDocx(projectState, sectionContentData.sections);
      } else if (format === 'pdf') {
         exportToPdf(projectState, sectionContentData.sections);
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
    } finally {
      setLoading('export', false);
    }
  }, [sections, activeToggles, scores, proMode, setLoading]);

  const handleImproveInstructions = useCallback(async (sectionIdToImprove) => {
    if (!sectionIdToImprove) {
      console.error("handleImproveInstructions called without a sectionId.");
      return;
    }
    setLoading('improvement', true);
    setGlobalAiLoading(true);
    try {
      const result = await improveInstruction(
        sectionIdToImprove,
        sections,
        sectionContentData
      );
      if (result.success && result.improvedData) {
        if (result.improvedData.id === sectionIdToImprove) {
          updateSectionFeedback(sectionIdToImprove, result.improvedData);
        } else {
          console.error("Received feedback for an unexpected section ID:", result.improvedData.id);
        }
      } else {
        console.error("Failed to get improved instructions for section " + sectionIdToImprove + ":", result.message);
        alert(`Could not get feedback for section ${sections[sectionIdToImprove]?.title || sectionIdToImprove}. ${result.message || ''}`);
      }
    } catch (error) {
      console.error("Error improving instructions for section " + sectionIdToImprove + ":", error);
      alert(`An error occurred while getting feedback for section ${sections[sectionIdToImprove]?.title || sectionIdToImprove}.`);
    } finally {
      setLoading('improvement', false);
      setGlobalAiLoading(false);
    }
  }, [sections, updateSectionFeedback, setLoading, setGlobalAiLoading]);


  const handleReviewPaper = useCallback(async (file) => {
    if (!file) return;
    setLoading('review', true);
    setGlobalAiLoading(true);
    try {
      const reviewResult = await reviewPaperContent(file, sectionContentData);
      setReviewData(reviewResult);
      openModal('reviewModal');
    } catch (error) {
      console.error("Error reviewing paper:", error);
      setReviewData({ error: error.message || "Failed to review paper." });
      openModal('reviewModal');
    } finally {
      setLoading('review', false);
      setGlobalAiLoading(false);
    }
  }, [openModal, setReviewData, setLoading, setGlobalAiLoading]);

  const handleShowHelpSplash = () => {
    showHelpSplashAction();
  };

  return (
    <>
      <AppHeader
        resetProject={handleResetProject}
        exportProject={handleExportProject} // This likely opens a dialog for MD, DOCX, PDF
        saveProject={() => openModal('saveDialog')} // This modal should now correctly trigger handleSaveProject -> saveProjectAsJson
        loadProject={handleLoadProject}
        onOpenReviewModal={() => openModal('reviewModalSetup')}
        showHelpSplash={handleShowHelpSplash}
      />
      <MainLayout
        openModal={openModal}
        onImproveInstructions={handleImproveInstructions}
        uiMode={uiMode}
        setUiMode={setUiMode}
        currentChatSectionId={currentChatSectionId}
        setActiveSectionId={setActiveSectionId}
      />
      <SplashScreenManager onStart={hideHelpSplash} onShowPrivacy={() => openModal('privacyPolicy')} />
      <ModalManager
        modals={modals}
        closeModal={closeModal}
        confirmResetProject={confirmResetProject}
        onExport={handleExportProject} // For SaveDialog's other export options
        onSave={handleSaveProject}     // For SaveDialog's "Save Project (.json)" option
        onReviewSubmit={handleReviewPaper}
        reviewData={useAppStore.getState().reviewData}
      />
    </>
  );
};

export default VerticalPaperPlannerApp;
