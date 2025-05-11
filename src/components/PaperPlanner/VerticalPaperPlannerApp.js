// FILE: src/components/PaperPlanner/VerticalPaperPlannerApp.js
// MODIFIED: Changed imports for specific exporters to point directly to their files
// and use their correct exported names.
import React, { useEffect, useCallback } from 'react';
import useAppStore from '../../store/appStore';
import { improveInstruction } from '../../services/instructionImprovementService';
import { reviewPaperContent } from '../../services/paperReviewService';

// MODIFIED: Import directly from specific exporter files
import { exportAsMarkdown } from '../../utils/export/markdownExporter'; // Corrected import
import { exportAsDocx } from '../../utils/export/docxExporter';     // Corrected import
import { exportAsPdf } from '../../utils/export/pdfExporter';       // Corrected import
import { saveProjectAsJson } from '../../utils/export'; // This one is correctly from index.js

import sectionContentData from '../../data/sectionContent.json';

import MainLayout from '../layout/MainLayout';
import SplashScreenManager from '../modals/SplashScreenManager';
import ModalManager from '../modals/ModalManager';
import AppHeader from '../layout/AppHeader';

const VerticalPaperPlannerApp = () => {
  const {
    initializeOnboardingFromLocalStorage,
    sections,
    activeToggles,
    scores,
    modals,
    openModal,
    closeModal,
    setLoading,
    setReviewData,
    loadProjectData,
    resetState,
    updateSectionFeedback,
    showHelpSplash: showHelpSplashAction,
    hideHelpSplash,
    proMode,
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

  const handleSaveProject = useCallback(() => {
    setLoading('export', true);
    try {
      const userInputsForSave = Object.fromEntries(
        Object.entries(sections).map(([id, data]) => [id, data.content])
      );
      const chatMessagesForSave = useAppStore.getState().chatMessages;
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

  // MODIFIED: Calls the correctly imported functions
  const handleExportProject = useCallback((format = 'markdown') => {
    // For exportAsMarkdown, exportAsDocx, exportAsPdf, they expect userInputs, chatMessages, sectionContent
    // We need to reconstruct userInputs (content only) and pass sectionDefinitions as sectionContent
    const userInputsOnly = Object.fromEntries(
        Object.entries(sections).map(([id, data]) => [id, data.content])
    );
    const chatMessages = useAppStore.getState().chatMessages; // Get current chat messages

    setLoading('export', true);
    try {
      if (format === 'markdown') {
        // The exportAsMarkdown function in markdownExporter.js uses sectionContent to get titles etc.
        // It internally calls getFormattedContent from exportBase.js which takes userInputs.
        // So passing userInputsOnly and sectionContentData.sections should be okay.
        exportAsMarkdown(userInputsOnly, chatMessages, sectionContentData.sections);
      } else if (format === 'docx') {
        exportAsDocx(userInputsOnly, chatMessages, sectionContentData.sections);
      } else if (format === 'pdf') {
         exportAsPdf(userInputsOnly, chatMessages, sectionContentData.sections);
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
    } finally {
      setLoading('export', false);
    }
  }, [sections, activeToggles, scores, proMode, setLoading]); // proMode, activeToggles, scores are not directly used by exportAs... functions here

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
        exportProject={handleExportProject}
        saveProject={() => openModal('saveDialog')}
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
        onExport={handleExportProject}
        onSave={handleSaveProject}
        onReviewSubmit={handleReviewPaper}
        reviewData={useAppStore.getState().reviewData}
      />
    </>
  );
};

export default VerticalPaperPlannerApp;
