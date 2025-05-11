// FILE: src/components/PaperPlanner/VerticalPaperPlannerApp.js
// MODIFIED: handleImproveInstructions now accepts sectionId and calls service for a single section.
import React, { useEffect, useCallback } from 'react';
import useAppStore from '../../store/appStore';
import { improveInstruction } from '../../services/instructionImprovementService'; // This will be the modified service
import { reviewPaperContent } from '../../services/paperReviewService';
import { exportToMarkdown, exportToDocx, exportToPdf, saveProjectToFile } from '../../utils/export'; // Removed loadProjectFromFile as it's handled by store
import sectionContentData from '../../data/sectionContent.json'; // Renamed for clarity

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
    loadProjectData, // Store action for loading
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
    const projectState = {
      sections: sections,
      activeToggles: activeToggles,
      scores: scores,
      proMode: proMode,
      chatMessages: useAppStore.getState().chatMessages,
    };
    saveProjectToFile(projectState, setLoading); // setLoading is from appStore now
  }, [sections, activeToggles, scores, proMode, setLoading]);

  const handleLoadProject = useCallback((data) => { // This function is called by AppHeader after file is read
    setLoading('project', true);
    try {
      loadProjectData(data); // Call the store action
    } catch (error) {
      console.error("Error loading project data in VerticalPaperPlannerApp:", error);
      alert("Failed to load project: " + (error.message || "Unknown error"));
    } finally {
      setLoading('project', false);
    }
  }, [loadProjectData, setLoading]);

  const handleExportProject = useCallback((format = 'markdown') => {
    const projectState = { sections, activeToggles, scores, proMode };
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

  // MODIFIED: Accepts sectionId and processes feedback for that single section
  const handleImproveInstructions = useCallback(async (sectionIdToImprove) => {
    if (!sectionIdToImprove) {
      console.error("handleImproveInstructions called without a sectionId.");
      return;
    }
    setLoading('improvement', true);
    setGlobalAiLoading(true);
    try {
      // Pass the specific sectionId, the current state of all sections, and definitions
      const result = await improveInstruction(
        sectionIdToImprove,
        sections, // Current state of all sections from the store
        sectionContentData // The full section definitions (contains .sections array)
      );

      if (result.success && result.improvedData) {
        // result.improvedData should now be a single feedback object, not an array
        if (result.improvedData.id === sectionIdToImprove) {
          updateSectionFeedback(sectionIdToImprove, result.improvedData);
        } else {
          console.error("Received feedback for an unexpected section ID:", result.improvedData.id);
        }
      } else {
        console.error("Failed to get improved instructions for section " + sectionIdToImprove + ":", result.message);
        // Optionally, provide user feedback about the failure
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
        // sections prop might not be needed directly by MainLayout if SectionCards fetch their own data or it's passed down
        // sections={sections}
        // activeToggles={activeToggles}
        // scores={scores}
        openModal={openModal}
        onImproveInstructions={handleImproveInstructions} // This is passed to SectionCard -> FeedbackButton
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
