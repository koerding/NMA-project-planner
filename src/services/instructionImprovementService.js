// FILE: src/services/instructionImprovementService.js
// MODIFIED: Simplified implementation with direct mode parameter

/**
 * Enhanced service for improving instructions based on user progress
 * UPDATED: Now supports both single-section and batch mode via direct parameter.
 * UPDATED: Increased max_tokens for the OpenAI API call.
 * UPDATED: Excludes 'tooltip' text from subsection data sent to OpenAI to reduce payload size.
 * UPDATED: Includes previous feedback context for more consistent ratings in both modes.
 */
import { callOpenAI } from './openaiService';
import { buildSystemPrompt } from '../utils/promptUtils';
import sectionContentData from '../data/sectionContent.json';
import useAppStore from '../store/appStore';

// Directly check if we're in development mode to enable toggle functionality
const isDevelopment = process.env.NODE_ENV === 'development';

// Try to get feedback mode setting from localStorage in dev mode only
let defaultFeedbackMode = 'single';
if (isDevelopment && typeof localStorage !== 'undefined') {
  try {
    const storedMode = localStorage.getItem('kording_feedback_mode');
    if (storedMode === 'batch') {
      defaultFeedbackMode = 'batch';
      console.log('[DEV] Using stored feedback mode: batch');
    }
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Helper function to toggle feedback mode (development only)
 * This is directly attached to window for easy access
 */
if (isDevelopment && typeof window !== 'undefined') {
  window.toggleFeedbackMode = function() {
    try {
      const currentMode = localStorage.getItem('kording_feedback_mode') || 'single';
      const newMode = currentMode === 'single' ? 'batch' : 'single';
      localStorage.setItem('kording_feedback_mode', newMode);
      
      // Show visual notification
      console.log(`%c[DEV] Feedback Mode switched to: ${newMode.toUpperCase()}`, 
        'background: #4b0082; color: white; padding: 2px 6px; border-radius: 3px');
      
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
      
      return newMode;
    } catch (e) {
      console.error('Error toggling feedback mode:', e);
      return 'single';
    }
  };
  
  // Add to kording namespace if it exists
  if (window.kording) {
    window.kording.toggleMode = window.toggleFeedbackMode;
  } else {
    window.kording = { toggleMode: window.toggleFeedbackMode };
  }
  
  console.log('%c[DEV] Feedback mode can be toggled with window.toggleFeedbackMode() or window.kording.toggleMode()', 
    'color: #666; font-style: italic;');
}

/**
 * Improves instructions for sections using a structured JSON approach.
 * Can operate in either single-section or batch mode.
 * Each section's subsections are evaluated separately for completion status and feedback.
 * Now also includes a numerical rating from 1-10.
 *
 * @param {Array} currentSections - Deprecated: This is no longer used directly. State is fetched from the store.
 * @param {Object} userInputs - Deprecated: This is no longer used directly. State is fetched from the store.
 * @param {Object} sectionContent - The full, original section content definition object (still needed for definitions).
 * @param {Boolean} forceImprovement - Deprecated: Not used anymore.
 * @param {String} targetSectionId - The ID of the section to analyze (required for single mode)
 * @param {String} mode - Optional: Override the mode ('single' or 'batch')
 * @returns {Promise<Object>} - Result with success flag and raw analysis data from AI for the section(s).
 */
export const improveBatchInstructions = async (
  currentSections, // Not directly used anymore
  userInputs,      // Not directly used anymore
  sectionContent,  // Still used for definitions
  forceImprovement = false, // Not used anymore
  targetSectionId = null,   // Required for single mode
  mode = null               // Optional override
) => {
  try {
    // Check which mode to use - first prioritize passed parameter, then dev setting, then default to single
    let feedbackMode = 'single'; // Default to single mode in production
    
    if (mode === 'single' || mode === 'batch') {
      // Use explicit mode parameter if provided
      feedbackMode = mode;
    } else if (isDevelopment && typeof localStorage !== 'undefined') {
      // In development, check localStorage for saved preference
      try {
        const storedMode = localStorage.getItem('kording_feedback_mode');
        if (storedMode === 'batch') {
          feedbackMode = 'batch';
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    const isSingleMode = feedbackMode === 'single';
    
    console.log(`[Instruction Improvement] Starting instruction improvement process in ${feedbackMode} mode`);
    
    // In single mode, we need a target section ID
    if (isSingleMode && !targetSectionId) {
      console.error("[Instruction Improvement] Error: No target section ID provided for single mode");
      return { 
        success: false, 
        message: "No target section ID was provided for feedback."
      };
    }

    console.time("instructionImprovementTime");

    // Get the full, current sections state from the Zustand store
    const allSectionsState = useAppStore.getState().sections;
    const sectionDefs = sectionContent || sectionContentData; // Use passed-in or imported definitions

    // Prepare sections for analysis based on mode
    let sectionsForAnalysis = [];
    
    if (isSingleMode) {
      // Single mode: process only the target section
      const sectionState = allSectionsState[targetSectionId];
      
      if (!sectionState) {
        console.error(`[Instruction Improvement] Error: Section with ID ${targetSectionId} not found in state`);
        return { 
          success: false, 
          message: `Section with ID ${targetSectionId} not found.`
        };
      }

      // Get the section definition
      const sectionDef = sectionDefs?.sections?.find(s => s.id === targetSectionId);
      
      if (!sectionDef) {
        console.error(`[Instruction Improvement] Error: Section definition with ID ${targetSectionId} not found`);
        return { 
          success: false, 
          message: `Section definition with ID ${targetSectionId} not found.`
        };
      }

      // Check if the section has content
      const content = sectionState.content;
      const placeholder = sectionDef?.placeholder || '';
      const hasMeaningfulContent = typeof content === 'string' && content.trim() !== '' && content !== placeholder;

      if (!hasMeaningfulContent) {
        console.log(`[Instruction Improvement] Section ${targetSectionId} has no meaningful content.`);
        return { 
          success: false, 
          message: "Please add content to the section before requesting feedback."
        };
      }

      // Prepare the single section for analysis
      const sectionForAnalysis = {
        id: targetSectionId,
        title: sectionDef.title,
        userContent: content,
        originalPlaceholder: placeholder,
        introText: sectionDef.introText || '',
        subsections: (sectionDef.subsections || []).map(subsection => ({
          id: subsection.id,
          title: subsection.title,
          instruction: subsection.instruction
        }))
      };
      
      // Include previous feedback if available, just like in batch mode
      if (sectionState.aiInstructions) {
        sectionForAnalysis.previousFeedback = {
          overallFeedback: sectionState.aiInstructions.overallFeedback,
          rating: sectionState.aiInstructions.rating,
          subsections: sectionState.aiInstructions.subsections?.map(sub => ({
            id: sub.id,
            isComplete: sub.isComplete,
            feedback: sub.feedback
          }))
        };
      }
      
      sectionsForAnalysis = [sectionForAnalysis];
      
    } else {
      // Batch mode: filter based on content AND edit status
      sectionsForAnalysis = Object.values(allSectionsState)
        .map(sectionState => {
          if (!sectionState || !sectionState.id) return null; // Skip if state is invalid

          const sectionDef = sectionDefs?.sections?.find(s => s.id === sectionState.id);
          const content = sectionState.content;
          const placeholder = sectionDef?.placeholder || '';
          const hasMeaningfulContent = typeof content === 'string' && content.trim() !== '' && content !== placeholder;
          const needsFeedback = sectionState.editedSinceFeedback || sectionState.feedbackRating === null; // Edited OR never reviewed

          // Include section only if definition exists, has content, AND needs feedback
          if (sectionDef && hasMeaningfulContent && needsFeedback) {
            const result = {
              id: sectionState.id,
              title: sectionDef.title,
              userContent: content,
              originalPlaceholder: placeholder,
              introText: sectionDef.introText || '',
              subsections: (sectionDef.subsections || []).map(subsection => ({
                id: subsection.id,
                title: subsection.title,
                instruction: subsection.instruction
              }))
            };
            
            // Include previous feedback if available for consistency
            if (sectionState.aiInstructions) {
              result.previousFeedback = {
                overallFeedback: sectionState.aiInstructions.overallFeedback,
                rating: sectionState.aiInstructions.rating,
                subsections: sectionState.aiInstructions.subsections?.map(sub => ({
                  id: sub.id,
                  isComplete: sub.isComplete,
                  feedback: sub.feedback
                }))
              };
            }
            
            return result;
          }
          return null; // Exclude sections that don't meet criteria
        })
        .filter(Boolean); // Filter out null entries
    }

    if (sectionsForAnalysis.length === 0) {
      const message = isSingleMode 
        ? "The selected section has no content requiring feedback."
        : "No sections found with new edits requiring feedback.";
      
      console.log(`[Instruction Improvement] ${message}`);
      return { success: false, message };
    }

    // Build the appropriate prompt based on mode
    const systemPrompt = buildSystemPrompt('instructionImprovement');
    let userPrompt;
    
    if (isSingleMode) {
      // Single mode prompt with consistency notes
      userPrompt = `
        I need you to evaluate the following research section based on its content against the provided instructions for each subsection.
        Return your response as a JSON object with the following structure: 
        {
          "result": {
            "id": "${sectionsForAnalysis[0].id}",
            "overallFeedback": "Comprehensive feedback on the entire section addressing strengths and areas for improvement",
            "completionStatus": "incomplete|partially_complete|complete",
            "rating": 7,
            "subsections": [
              {
                "id": "subsection_id_1",
                "isComplete": true,
                "feedback": "Specific feedback for this subsection"
              },
              {
                "id": "subsection_id_2",
                "isComplete": false,
                "feedback": "Specific feedback for this subsection"
              }
            ]
          }
        }
        
        RATING SCALE: Provide a numerical rating from 1-10 based on the quality and completeness of the user's content against the instructions:
        1-3 = Poor (many missing elements, major improvements needed)
        4-6 = Average (some elements present but substantial improvements possible)
        7-8 = Good (most elements present with minor improvements needed)
        9-10 = Excellent (comprehensive, publication-quality content)
        
        IMPORTANT FOR CONSISTENCY: The section may include previous feedback. If the section shows only minor improvements from the previous feedback, maintain a similar rating. If significant improvements were made, the rating should increase accordingly.
              
        Here is the section and its subsection instructions to evaluate:
        ${JSON.stringify(sectionsForAnalysis[0], null, 2)}
      `;
      
      console.log(`[Instruction Improvement] Analyzing section "${sectionsForAnalysis[0].title}" (ID: ${sectionsForAnalysis[0].id})`);
    } else {
      // Batch mode prompt with consistency notes
      userPrompt = `
        I need you to evaluate the following research sections based on their content against the provided instructions for each subsection.
        Return your response as a JSON object with the following structure: { "results": [ ... ] } where each result object contains 'id', 'overallFeedback', 'completionStatus', 'rating', and a 'subsections' array.
        The 'subsections' array should contain objects with 'id', 'isComplete' (boolean), and 'feedback' (string).
        
        RATING SCALE: Provide a numerical rating from 1-10 for each section based on the quality and completeness of the user's content against the instructions:
        1-3 = Poor (many missing elements, major improvements needed)
        4-6 = Average (some elements present but substantial improvements possible)
        7-8 = Good (most elements present with minor improvements needed)
        9-10 = Excellent (comprehensive, publication-quality content)
        
        IMPORTANT FOR CONSISTENCY: Some sections include previous feedback. If a section shows only minor improvements from the previous feedback, maintain a similar rating. If significant improvements were made, the rating should increase accordingly.
              
        Here are the sections and their subsection instructions to evaluate:
        ${JSON.stringify(sectionsForAnalysis, null, 2)}
      `;
      
      console.log(`[Instruction Improvement] Analyzing ${sectionsForAnalysis.length} edited/new sections with JSON structure`);
    }

    // Prepare section content object for the OpenAI request
    const sectionContentObj = sectionsForAnalysis.reduce((acc, section) => { 
      acc[section.id] = section.userContent; 
      return acc; 
    }, {});

    // Prepare section definitions for the OpenAI request
    const sectionDefsForRequest = isSingleMode 
      ? [sectionDefs?.sections?.find(s => s.id === sectionsForAnalysis[0].id)].filter(Boolean)
      : sectionDefs?.sections || [];

    // Call OpenAI with JSON mode
    const response = await callOpenAI(
      userPrompt,
      "improve_instructions_structured",
      sectionContentObj,
      sectionDefsForRequest, 
      {
        temperature: 0.0,
        max_tokens: 4096 
      },
      [],
      systemPrompt,
      true 
    );

    console.log("[Instruction Improvement] Response received from OpenAI");

    // Process the response based on mode
    let analysisResults = [];
    
    if (isSingleMode) {
      // Extract result from single mode response
      if (response && response.result) {
        analysisResults = [response.result];
      } else if (typeof response === 'object' && response.id === sectionsForAnalysis[0].id) {
        analysisResults = [response];
      } else if (Array.isArray(response) && response.length > 0) {
        const matchingResult = response.find(item => item.id === sectionsForAnalysis[0].id);
        if (matchingResult) {
          analysisResults = [matchingResult];
        }
      }
    } else {
      // Extract results from batch mode response
      if (response && response.results && Array.isArray(response.results)) {
        analysisResults = response.results;
      } else if (Array.isArray(response)) { 
        analysisResults = response;
      }
    }

    if (analysisResults.length === 0) {
      console.error("[Instruction Improvement] Could not find valid results in response:", response);
      throw new Error("Invalid or unexpected response format from OpenAI");
    }

    console.log(`[Instruction Improvement] Successfully processed ${analysisResults.length} analysis results`);
    console.timeEnd("instructionImprovementTime");

    return {
      success: true,
      improvedData: analysisResults
    };

  } catch (error) {
    console.error("Error improving instructions:", error);
    console.timeEnd("instructionImprovementTime");

    return {
      success: false,
      improvedData: [],
      errorMessage: error.message || "An error occurred while improving instructions",
      errorType: error.name || "UnknownError"
    };
  }
};

export const improveInstruction = improveBatchInstructions;
