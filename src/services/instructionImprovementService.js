// FILE: src/services/instructionImprovementService.js
// MODIFIED: Function now processes a single section based on sectionIdToAnalyze.
// MODIFIED: AI prompt changed to reflect single section analysis.
// MODIFIED: Expected AI response is a single feedback object.
import { callOpenAI } from './openaiService';
import { buildSystemPrompt } from '../utils/promptUtils';
// sectionContentData is now passed in as sectionDefinitions
// import useAppStore from '../store/appStore'; // No longer directly accessing store here, state passed in

/**
 * Improves instructions for a SINGLE section based on its content and defined subsections.
 *
 * @param {string} sectionIdToAnalyze - The ID of the section to analyze.
 * @param {Object} allSectionsState - The current state of all sections (e.g., from useAppStore.getState().sections).
 * @param {Object} sectionDefinitionsContainer - The container for section definitions (e.g., sectionContentData json directly).
 * @returns {Promise<Object>} - Result with success flag and raw analysis data from AI for the section.
 */
export const improveBatchInstructions = async ( // Keep name for alias `improveInstruction`
  sectionIdToAnalyze,
  allSectionsState, // e.g., useAppStore.getState().sections
  sectionDefinitionsContainer // e.g., the imported sectionContent.json
) => {
  try {
    console.log(`[Instruction Improvement] Starting instruction improvement for section: ${sectionIdToAnalyze}.`);
    console.time(`instructionImprovementTime_${sectionIdToAnalyze}`);

    if (!sectionIdToAnalyze || !allSectionsState || !allSectionsState[sectionIdToAnalyze]) {
      console.error("[Instruction Improvement] Invalid sectionId or section state provided.");
      return { success: false, message: "Invalid sectionId or section state." };
    }

    const sectionDefsArray = sectionDefinitionsContainer?.sections;
    if (!sectionDefsArray || !Array.isArray(sectionDefsArray)) {
        console.error("[Instruction Improvement] Invalid section definitions provided.");
        return { success: false, message: "Invalid section definitions." };
    }

    const sectionState = allSectionsState[sectionIdToAnalyze];
    const sectionDef = sectionDefsArray.find(s => s.id === sectionIdToAnalyze);

    if (!sectionDef) {
      console.error(`[Instruction Improvement] Definition not found for section: ${sectionIdToAnalyze}.`);
      return { success: false, message: `Definition not found for section ${sectionIdToAnalyze}.` };
    }

    const content = sectionState.content;
    const placeholder = sectionDef.placeholder || '';
    const hasMeaningfulContent = typeof content === 'string' && content.trim() !== '' && content.trim() !== placeholder.trim();

    if (!hasMeaningfulContent) {
      console.log(`[Instruction Improvement] Section ${sectionIdToAnalyze} has no meaningful content to analyze.`);
      return { success: false, message: "Section has no meaningful content to analyze." };
    }

    // Prepare the single section for analysis
    const sectionForAnalysis = {
      id: sectionState.id,
      title: sectionDef.title,
      userContent: content,
      originalPlaceholder: placeholder,
      introText: sectionDef.introText || '',
      subsections: (sectionDef.subsections || []).map(subsection => ({
        id: subsection.id,
        title: subsection.title,
        instruction: subsection.instruction,
      })),
    };
    // Removed: No longer sending previous feedback context (as per earlier change)

    const systemPrompt = buildSystemPrompt('instructionImprovement');

    // MODIFIED: User prompt to analyze a single section object
    const userPrompt = `
      I need you to evaluate the following research section based on its content against the provided instructions for each subsection.
      Your response should be a single JSON object (not an array) with the following structure: 
      { "id": "${sectionIdToAnalyze}", "overallFeedback": "...", "completionStatus": "...", "rating": <1-10>, "subsections": [ ... ] }
      The 'subsections' array should contain objects with 'id', 'isComplete' (boolean), and 'feedback' (string).
      
      RATING SCALE: Provide a numerical rating from 1-10 for the section based on the quality and completeness of the user's content against the instructions. 1=very poor, 5=average student work, 10=publication quality.
            
      Here is the section and its subsection instructions to evaluate:
      ${JSON.stringify(sectionForAnalysis, null, 2)}
    `;

    console.log(`[Instruction Improvement] Analyzing section "${sectionDef.title}" with JSON structure.`);

    const response = await callOpenAI(
      userPrompt,
      "improve_single_instruction_structured", // Category for logging/tracking if needed
      { [sectionIdToAnalyze]: content }, // userInputs (context for OpenAI call)
      sectionDefsArray, // allSectionDefinitions (context for OpenAI call)
      { temperature: 0.0, max_tokens: 2048 }, // Reduced max_tokens as it's a single section
      [], // history
      systemPrompt,
      true // expectJson
    );

    console.log(`[Instruction Improvement] Response received from OpenAI for section ${sectionIdToAnalyze}`);

    // MODIFIED: Expect a single object, not an array
    if (response && response.id === sectionIdToAnalyze && response.overallFeedback) {
      console.log(`[Instruction Improvement] Successfully processed analysis for section ${sectionIdToAnalyze}`);
      console.timeEnd(`instructionImprovementTime_${sectionIdToAnalyze}`);
      return {
        success: true,
        improvedData: response, // The single feedback object
      };
    } else {
      console.error(`[Instruction Improvement] Unexpected response format or mismatched section ID for ${sectionIdToAnalyze}:`, response);
      throw new Error(`Invalid or unexpected response format from OpenAI for section ${sectionIdToAnalyze}`);
    }

  } catch (error) {
    console.error(`Error improving instructions for section ${sectionIdToAnalyze}:`, error);
    console.timeEnd(`instructionImprovementTime_${sectionIdToAnalyze}`);
    return {
        success: false,
        improvedData: null,
        errorMessage: error.message || `An error occurred while improving instructions for section ${sectionIdToAnalyze}`,
        errorType: error.name || "UnknownError"
    };
  }
};

// Keep the alias if other parts of the app might still use `improveInstruction`
// and expect it to now work for a single section when sectionIdToAnalyze is passed.
export const improveInstruction = improveBatchInstructions;
