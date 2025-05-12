// FILE: src/services/instructionImprovementService.js
// MODIFIED: Now only processes the current active section instead of all sections.
// MODIFIED: Does not send previous feedback context to the AI.

/**
 * Enhanced service for improving instructions based on user progress
 * UPDATED: Now only processes the current active section.
 * UPDATED: Increased max_tokens for the OpenAI API call.
 * UPDATED: Excludes 'tooltip' text from subsection data sent to OpenAI to reduce payload size.
 * MODIFIED: Does not send previous feedback context to the AI.
 */
import { callOpenAI } from './openaiService';
import { buildSystemPrompt } from '../utils/promptUtils';
import sectionContentData from '../data/sectionContent.json';
import useAppStore from '../store/appStore'; 

/**
 * Improves instructions for a single section using a structured JSON approach.
 * Now specifically targets only the current active section instead of filtering multiple sections.
 * Each section's subsections are evaluated separately for completion status and feedback.
 * Now also includes a numerical rating from 1-10.
 *
 * @param {Array} currentSections - Deprecated: This is no longer used directly. State is fetched from the store.
 * @param {Object} userInputs - Deprecated: This is no longer used directly. State is fetched from the store.
 * @param {Object} sectionContent - The full, original section content definition object (still needed for definitions).
 * @param {Boolean} forceImprovement - Deprecated: Not used anymore.
 * @param {String} targetSectionId - The ID of the section to analyze (required parameter now)
 * @returns {Promise<Object>} - Result with success flag and raw analysis data from AI for the target section.
 */
export const improveBatchInstructions = async (
  // These parameters are kept for signature compatibility but might be cleaned up later
  currentSections, // Not directly used anymore
  userInputs,      // Not directly used anymore
  sectionContent,  // Still used for definitions
  forceImprovement = false, // Not used anymore
  targetSectionId = null    // New parameter for the section ID to process
) => {
  try {
    // If no targetSectionId is provided, fail early
    if (!targetSectionId) {
      console.error("[Instruction Improvement] Error: No target section ID provided");
      return { 
        success: false, 
        message: "No target section ID was provided for feedback."
      };
    }

    console.log(`[Instruction Improvement] Starting instruction improvement process for section ID: ${targetSectionId}`);
    console.time("instructionImprovementTime");

    // Get the full, current sections state from the Zustand store
    const allSectionsState = useAppStore.getState().sections;
    const sectionDefs = sectionContent || sectionContentData; // Use passed-in or imported definitions

    // Get the target section's state
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
      // Pass only necessary subsection info (id, title, instruction)
      subsections: (sectionDef.subsections || []).map(subsection => ({
        id: subsection.id,
        title: subsection.title,
        instruction: subsection.instruction
        // tooltip is excluded as it's context for the UI, not essential for AI evaluation
      }))
    };

    // Build system prompt
    const systemPrompt = buildSystemPrompt('instructionImprovement');

    // Create the user prompt focused on a single section
    const userPrompt = `
      I need you to evaluate the following research section based on its content against the provided instructions for each subsection.
      Return your response as a JSON object with the following structure: 
      {
        "result": {
          "id": "${targetSectionId}",
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
            
      Here is the section and its subsection instructions to evaluate:
      ${JSON.stringify(sectionForAnalysis, null, 2)}
    `;

    console.log(`[Instruction Improvement] Analyzing section "${sectionForAnalysis.title}" (ID: ${targetSectionId})`);

    // Call OpenAI with JSON mode and INCREASED max_tokens
    const response = await callOpenAI(
      userPrompt,
      "improve_instructions_structured",
      { [targetSectionId]: content }, // Only send the current section's content
      [sectionDef], // Only send the current section definition
      {
        temperature: 0.0,
        max_tokens: 4096 
      },
      [],
      systemPrompt,
      true 
    );

    console.log("[Instruction Improvement] Response received from OpenAI");

    // Extract the result from the response
    let analysisResult = null;
    
    if (response && response.result) {
      // Single result format
      analysisResult = response.result;
    } else if (typeof response === 'object' && response.id === targetSectionId) {
      // Direct object format
      analysisResult = response;
    } else if (Array.isArray(response) && response.length > 0) {
      // Array format (take the first item if it matches our section ID)
      const matchingResult = response.find(item => item.id === targetSectionId);
      if (matchingResult) {
        analysisResult = matchingResult;
      }
    }

    if (!analysisResult) {
      console.error("[Instruction Improvement] Could not find valid result in response:", response);
      throw new Error("Invalid or unexpected response format from OpenAI");
    }

    console.log(`[Instruction Improvement] Successfully processed analysis result for section "${sectionForAnalysis.title}"`);
    console.timeEnd("instructionImprovementTime");

    return {
      success: true,
      improvedData: [analysisResult] // Still return as array for backward compatibility
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
