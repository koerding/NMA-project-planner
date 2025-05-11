// FILE: src/services/instructionImprovementService.js

/**
 * Enhanced service for improving instructions based on user progress
 * UPDATED: Increased max_tokens for the OpenAI API call.
 * UPDATED: Filters sections to only send those edited since last feedback (or never reviewed).
 * UPDATED: Excludes 'tooltip' text from subsection data sent to OpenAI to reduce payload size.
 * MODIFIED: Does not send previous feedback context to the AI.
 */
import { callOpenAI } from './openaiService';
import { buildSystemPrompt } from '../utils/promptUtils';
import sectionContentData from '../data/sectionContent.json';
import useAppStore from '../../store/appStore'; // Import Zustand store to access full section state

/**
 * Improves instructions for multiple sections using a structured JSON approach.
 * Filters sections to only include those that have been edited since last feedback or have never received feedback.
 * Each section's subsections are evaluated separately for completion status and feedback.
 * Now also includes a numerical rating from 1-10.
 *
 * @param {Array} currentSections - Deprecated: This is no longer used directly. State is fetched from the store.
 * @param {Object} userInputs - Deprecated: This is no longer used directly. State is fetched from the store.
 * @param {Object} sectionContent - The full, original section content definition object (still needed for definitions).
 * @param {Boolean} forceImprovement - Deprecated: Filtering logic now determines which sections are sent.
 * @returns {Promise<Object>} - Result with success flag and raw analysis data from AI for the relevant sections.
 */
export const improveBatchInstructions = async (
  // These parameters are kept for signature compatibility but might be cleaned up later
  currentSections, // Not directly used anymore
  userInputs,      // Not directly used anymore
  sectionContent,  // Still used for definitions
  forceImprovement = false // Not used anymore due to filtering logic
) => {
  try {
    console.log("[Instruction Improvement] Starting instruction improvement process (filtered for edited sections, excluding tooltips, no previous feedback sent).");
    console.time("instructionImprovementTime");

    // Get the full, current sections state from the Zustand store
    const allSectionsState = useAppStore.getState().sections;
    const sectionDefs = sectionContent || sectionContentData; // Use passed-in or imported definitions

    // Prepare sections for analysis: Filter based on content AND edit status
    const sectionsForAnalysis = Object.values(allSectionsState)
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
            // Pass only necessary subsection info (id, title, instruction)
            // Tooltip is excluded as it's context for the UI, not essential for AI evaluation
            subsections: (sectionDef.subsections || []).map(subsection => ({
              id: subsection.id,
              title: subsection.title,
              instruction: subsection.instruction
              // tooltip: subsection.tooltip // <-- EXCLUDED PROPERTY
            }))
          };
          
          // DO NOT INCLUDE PREVIOUS FEEDBACK in the data sent to the AI
          // if (sectionState.aiInstructions) {
          //   result.previousFeedback = {
          //     overallFeedback: sectionState.aiInstructions.overallFeedback,
          //     rating: sectionState.aiInstructions.rating,
          //     subsections: sectionState.aiInstructions.subsections?.map(sub => ({
          //       id: sub.id,
          //       isComplete: sub.isComplete,
          //       feedback: sub.feedback
          //     }))
          //   };
          // }
          
          return result;
        }
        return null; // Exclude sections that don't meet criteria
      })
      .filter(Boolean); // Filter out null entries


    if (sectionsForAnalysis.length === 0) {
      console.log("[Instruction Improvement] No sections found needing feedback.");
       return { success: false, message: "No sections found with new edits requiring feedback." };
    }


    // Build system prompt (unchanged)
    const systemPrompt = buildSystemPrompt('instructionImprovement');

    // Create the user prompt (structure unchanged, but subsection context is smaller)
    // MODIFIED: Removed mention of previous feedback from the prompt to AI
    const userPrompt = `
      I need you to evaluate the following research sections based on their content against the provided instructions for each subsection.
      Return your response as a JSON object with the following structure: { "results": [ ... ] } where each result object contains 'id', 'overallFeedback', 'completionStatus', 'rating', and a 'subsections' array.
      The 'subsections' array should contain objects with 'id', 'isComplete' (boolean), and 'feedback' (string).
      
      RATING SCALE: Provide a numerical rating from 1-10 for each section based on the quality and completeness of the user's content against the instructions. 1=very poor, 5=average student work, 10=publication quality.
            
      Here are the sections and their subsection instructions to evaluate:
      ${JSON.stringify(sectionsForAnalysis, null, 2)}
    `;

    console.log(`[Instruction Improvement] Analyzing ${sectionsForAnalysis.length} edited/new sections with JSON structure (tooltips excluded, no previous feedback sent).`);

    // Call OpenAI with JSON mode and INCREASED max_tokens
    const response = await callOpenAI(
      userPrompt,
      "improve_instructions_structured",
      sectionsForAnalysis.reduce((acc, section) => { acc[section.id] = section.userContent; return acc; }, {}),
      sectionDefs?.sections || [], 
      {
        temperature: 0.0,
        max_tokens: 4096 
      },
      [],
      systemPrompt,
      true 
    );

    console.log("[Instruction Improvement] Response received from OpenAI");

    let analysisResults = [];
    if (response && response.results && Array.isArray(response.results)) {
      analysisResults = response.results;
    } else if (Array.isArray(response)) { 
        analysisResults = response;
    } else {
      console.error("[Instruction Improvement] Unexpected response format:", response);
      throw new Error("Invalid or unexpected response format from OpenAI");
    }

    console.log(`[Instruction Improvement] Successfully processed ${analysisResults.length} analysis results for edited sections`);
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
