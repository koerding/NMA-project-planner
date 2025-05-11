// FILE: src/store/appStore.js
// MODIFIED: Add uiMode to store for single-panel layout toggle
// MODIFIED: Added setActiveSectionId and enhanced setUiMode functions
// MODIFIED: Enhanced setUiMode with scroll position management
// MODIFIED: Added sectionDefinitions to store state for guide mode display
// MODIFIED: Set proMode to true by default and modified setProMode to reflect this.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import sectionContent from '../data/sectionContent.json';
import { calculateUnlockedSections, isSectionVisible } from '../logic/progressionLogic';
import { callOpenAI } from '../services/openaiService';
import { buildSystemPrompt } from '../utils/promptUtils';
import { validateProjectData } from '../utils/export';

// Helper to generate initial state for all sections
const getInitialSectionStates = () => {
    if (!sectionContent || !Array.isArray(sectionContent.sections)) {
        console.error("sectionContent is missing or invalid!");
        return {}; // Return empty object to avoid crashing
    }
    return sectionContent.sections.reduce((acc, section) => {
        if (!section || !section.id) return acc; // Skip invalid sections
        const isQuestion = section.id === 'question';
        acc[section.id] = {
            id: section.id,
            title: section.title || 'Untitled Section',
            content: section.placeholder || '',
            originalInstructions: section.subsections || [], // Keep original instructions
            aiInstructions: null, // AI feedback starts as null
            isMinimized: false, 
            isVisible: true, // All sections visible due to proMode true by default
            feedbackRating: null, // Feedback rating starts as null
            editedSinceFeedback: false, // Not edited initially
            lastEditTimestamp: 0, // Timestamp for edit tracking
        };
        return acc;
    }, {});
};

// Define the complete initial state structure
const initialState = {
    sections: getInitialSectionStates(),
    activeToggles: { approach: 'hypothesis', dataMethod: 'experiment' },
    scores: {},
    proMode: true, // Set proMode to true by default
    modals: {
        confirmDialog: false, examplesDialog: false, reviewModal: false,
        privacyPolicy: false, saveDialog: false
    },
    loading: {
        project: false, import: false, export: false, review: false,
        improvement: false, chat: false
    },
    globalAiLoading: false,
    reviewData: null,
    onboarding: { step: 0, showHelpSplash: false },
    _importConfirmOperation: { active: false, message: null },
    chatMessages: {},
    currentChatMessage: '',
    currentChatSectionId: 'question',
    _forceUpdate: 0, 
    uiMode: 'write', 
    sectionDefinitions: sectionContent.sections || [], 
};


// Central Zustand store
const useAppStore = create(
  persist(
    (set, get) => ({
      ...initialState, 

      isAnyLoading: () => {
        const loadingValues = Object.values(get().loading);
        const isRegularLoading = loadingValues.some(Boolean);
        const isGlobalLoading = get().globalAiLoading;
        return isRegularLoading || isGlobalLoading;
      },

      setGlobalAiLoading: (status) => {
        console.log(`Setting globalAiLoading to ${status}`);
        set({ globalAiLoading: status });
      },

      setUiMode: (mode) => set((state) => {
        if (mode !== 'write' && mode !== 'guide') {
          console.error(`Invalid UI mode: ${mode}. Must be 'write' or 'guide'`);
          return state;
        }
        
        const currentSectionId = state.currentChatSectionId;
        const lastSectionId = localStorage.getItem('lastActiveSectionId');
        const targetSectionId = currentSectionId || lastSectionId || 'question';
        
        const prevMode = state.uiMode;
        const isModeSwitching = prevMode !== mode;
        
        if (isModeSwitching && prevMode === 'write') {
          const contentEl = document.querySelector('.main-content');
          if (contentEl) {
            localStorage.setItem('writeScrollPosition', contentEl.scrollTop);
            console.log(`Stored write scroll position: ${contentEl.scrollTop}px`);
          }
        }
        
        if (targetSectionId && state.sections && state.sections[targetSectionId]) {
          const updatedSections = { ...state.sections };
          Object.keys(updatedSections).forEach(id => {
            if (updatedSections[id]) {
              updatedSections[id] = { ...updatedSections[id], isCurrentSection: id === targetSectionId };
            }
          });
          
          setTimeout(() => {
            if (isModeSwitching) {
              if (mode === 'guide') {
                const contentEl = document.querySelector('.main-content');
                if (contentEl) {
                  contentEl.scrollTo({ top: 0, behavior: 'smooth' });
                  console.log('Scrolled to top for guide mode');
                }
              } else if (mode === 'write') {
                const storedScrollPos = localStorage.getItem('writeScrollPosition');
                if (storedScrollPos) {
                  const contentEl = document.querySelector('.main-content');
                  if (contentEl) {
                    contentEl.scrollTo({ top: parseInt(storedScrollPos, 10), behavior: 'smooth' });
                    console.log(`Restored write scroll position: ${storedScrollPos}px`);
                  }
                }
              }
            }
          }, 50);
          
          return { uiMode: mode, sections: updatedSections, currentChatSectionId: targetSectionId };
        }
        
        return { uiMode: mode };
      }),

      updateSectionContent: (sectionId, content) => set((state) => {
          if (!state.sections[sectionId]) return state;
            return { sections: { ...state.sections, [sectionId]: { ...state.sections[sectionId], content: content, lastEditTimestamp: Date.now(), editedSinceFeedback: state.sections[sectionId]?.feedbackRating !== null, }, }, };
      }),
      toggleMinimize: (sectionId) => set((state) => {
          if (!state.sections[sectionId]) return state; // Should not be called as sections are always expanded
          return state; // No change, sections always expanded
      }),
      setActiveToggle: (groupKey, sectionId) => set((state) => {
          const newActiveToggles = { ...state.activeToggles, [groupKey]: sectionId };
            const updatedSections = { ...state.sections }; // Pro mode is always true, all sections are visible based on toggles
            Object.keys(updatedSections).forEach(sId => {
              if (!updatedSections[sId]) return;
              const sectionDef = sectionContent.sections.find(s => s.id === sId);
              let isVisible = true; // All sections visible by default
              if (sectionDef?.category === 'approach' && sId !== newActiveToggles.approach) isVisible = false;
              else if (sectionDef?.category === 'dataMethod' && sId !== newActiveToggles.dataMethod) isVisible = false;
              updatedSections[sId] = { ...updatedSections[sId], isVisible: isVisible };
            });
            return { activeToggles: newActiveToggles, sections: updatedSections };
       }),
       setProMode: (enabled) => set((state) => { // This function now effectively does nothing as proMode is always true
            console.log("ProMode is always enabled. This toggle has no effect.");
            // Ensure all sections remain visible as per proMode true logic
            const updatedSections = { ...state.sections };
            const currentToggles = state.activeToggles;
            Object.keys(updatedSections).forEach(sId => {
                if (!updatedSections[sId]) return;
                const sectionDef = sectionContent.sections.find(s => s.id === sId);
                let isVisible = true; // All sections visible
                if (sectionDef?.category === 'approach' && sId !== currentToggles.approach) isVisible = false;
                else if (sectionDef?.category === 'dataMethod' && sId !== currentToggles.dataMethod) isVisible = false;
                updatedSections[sId] = { ...updatedSections[sId], isVisible: isVisible };
            });
            return { proMode: true, sections: updatedSections }; // Always ensure proMode is true
      }),
      updateSectionFeedback: (sectionId, feedbackData) => set((state) => {
            if (!state.sections[sectionId]) return state;
            const rating = feedbackData?.rating;
            const newScores = { ...state.scores, [sectionId]: rating };
            // Since proMode is always true, unlockedSections logic for visibility is overridden.
            // Visibility is determined by activeToggles for approach/dataMethod sections.
            const updatedSections = { ...state.sections };
            Object.keys(updatedSections).forEach(sId => {
                if (!updatedSections[sId]) return;
                const isCurrentSection = sId === sectionId;
                const sectionDef = sectionContent.sections.find(s => s.id === sId);
                let isVisible = true; // All sections visible
                 if (sectionDef?.category === 'approach' && sId !== state.activeToggles.approach) isVisible = false;
                 else if (sectionDef?.category === 'dataMethod' && sId !== state.activeToggles.dataMethod) isVisible = false;
                updatedSections[sId] = {
                    ...updatedSections[sId],
                    isVisible: isVisible,
                    aiInstructions: isCurrentSection ? feedbackData : updatedSections[sId].aiInstructions,
                    feedbackRating: isCurrentSection ? rating : updatedSections[sId].feedbackRating,
                    editedSinceFeedback: isCurrentSection ? false : updatedSections[sId].editedSinceFeedback,
                };
            });
            return { sections: updatedSections, scores: newScores };
       }),
      resetState: () => set({
        ...initialState,
        proMode: true, // Ensure proMode stays true on reset
        sections: getInitialSectionStates(), // Re-initialize sections with proMode true visibility
        onboarding: { ...initialState.onboarding, showHelpSplash: get().onboarding.showHelpSplash }
      }),

      setActiveSectionId: (sectionId) => set((state) => {
        if (!sectionId || !state.sections || !state.sections[sectionId]) {
          console.warn(`Invalid section ID: ${sectionId}`);
          return state;
        }
        const updatedSections = { ...state.sections };
        Object.keys(updatedSections).forEach(id => {
          if (updatedSections[id]) {
            updatedSections[id] = { ...updatedSections[id], isCurrentSection: id === sectionId };
          }
        });
        return { sections: updatedSections, currentChatSectionId: sectionId };
      }),

      loadProjectData: (data) => {
        console.log("Attempting to load project data (original format):", data);
        let loadedUserInputs = {};
        let loadedChatMessages = {};
        let detectedApproach = 'hypothesis';
        let detectedDataMethod = 'experiment';

        if (data && typeof data === 'object') {
            if (data.userInputs && typeof data.userInputs === 'object') {
                loadedUserInputs = data.userInputs;
                loadedChatMessages = data.chatMessages || {};
                if (data.detectedToggles) {
                   detectedApproach = data.detectedToggles.approach || detectedApproach;
                   detectedDataMethod = data.detectedToggles.dataMethod || detectedDataMethod;
                }
            } else if (data.sections && typeof data.sections === 'object') {
                loadedUserInputs = Object.entries(data.sections).reduce((acc, [id, sectionData]) => {
                    acc[id] = typeof sectionData === 'string' ? sectionData : (sectionData?.content || '');
                    return acc;
                }, {});
                loadedChatMessages = data.chatMessages || {};
                 if(data.detectedToggles) {
                    detectedApproach = data.detectedToggles.approach || detectedApproach;
                    detectedDataMethod = data.detectedToggles.dataMethod || detectedDataMethod;
                 }
            } else if (data.question || data.abstract || data.audience) {
                loadedUserInputs = data; 
                loadedChatMessages = {};
                 if(data.detectedToggles) {
                    detectedApproach = data.detectedToggles.approach || detectedApproach;
                    detectedDataMethod = data.detectedToggles.dataMethod || detectedDataMethod;
                 }
            } else {
                 console.error("Invalid project data format for loading. Aborting load.");
                 alert("Failed to load project: Invalid file format.");
                 return; 
            }
        } else {
             console.error("Invalid project data format for loading. Aborting load.");
             alert("Failed to load project: Invalid file format.");
             return; 
        }

        const initialSections = getInitialSectionStates(); 
        const mergedSections = {};
        const newActiveToggles = { approach: detectedApproach, dataMethod: detectedDataMethod };
        const loadedScores = data.scores || {};
        // const loadedProMode = data.proMode !== undefined ? data.proMode : true; // ProMode always true now

        const sourceSections = data.sections && typeof data.sections === 'object' && typeof Object.values(data.sections)[0] === 'object'
            ? data.sections : initialSections;
        Object.keys(initialSections).forEach(id => {
            const loadedContent = loadedUserInputs[id];
            const sourceSectionData = sourceSections[id] || initialSections[id];
            mergedSections[id] = {
                ...initialSections[id], ...sourceSectionData,
                content: loadedContent !== undefined ? loadedContent : sourceSectionData.content,
                aiInstructions: sourceSectionData.aiInstructions || null,
                feedbackRating: sourceSectionData.feedbackRating || null,
                editedSinceFeedback: sourceSectionData.editedSinceFeedback || false,
                isMinimized: false, // Always expanded in pro mode
            };
        });

        // Visibility determined by proMode (always true) and activeToggles
        Object.keys(mergedSections).forEach(sId => {
            const sectionDef = sectionContent.sections.find(s => s.id === sId);
            let isVisible = true; // All sections visible by default
            if (sectionDef?.category === 'approach' && sId !== newActiveToggles.approach) isVisible = false;
            else if (sectionDef?.category === 'dataMethod' && sId !== newActiveToggles.dataMethod) isVisible = false;
            mergedSections[sId].isVisible = isVisible;
        });

        const newState = {
            sections: mergedSections,
            activeToggles: newActiveToggles,
            scores: loadedScores,
            proMode: true, // Ensure proMode is true on load
            chatMessages: loadedChatMessages,
            modals: initialState.modals,
            loading: initialState.loading,
            globalAiLoading: false,
            reviewData: null,
            currentChatMessage: '',
            currentChatSectionId: 'question',
            sectionDefinitions: sectionContent.sections || [],
        };

        set(newState);
        console.log("Project data loaded successfully via loadProjectData (initial set). ActiveToggles:", newState.activeToggles);

        setTimeout(() => {
            set(state => ({ ...state, _forceUpdate: Math.random() })); 
            console.log("Forcing state re-read after loadProjectData.");
        }, 100); 
      }, 

       expandAllSections: () => set((state) => {
            // This function is effectively a no-op as sections are always expanded in Pro Mode.
            // Kept for compatibility if Pro Mode behavior changes.
            return state;
        }),

       openModal: (modalName) => set((state) => ({ modals: { ...state.modals, [modalName]: true } })),
       closeModal: (modalName) => set((state) => ({ modals: { ...state.modals, [modalName]: false } })),
       setLoading: (loadingType, status = true) => {
         console.log(`Setting loading state: ${loadingType} = ${status}`);
         set((state) => ({ loading: { ...state.loading, [loadingType]: status } }));
       },
       clearLoading: (loadingType) => set((state) => ({ loading: { ...state.loading, [loadingType]: false } })),
       setReviewData: (data) => set({ reviewData: data }),
       clearReviewData: () => set({ reviewData: null }),
       setOnboardingStep: (step) => set((state) => ({ onboarding: { ...state.onboarding, step: step } })),
       _initializeOnboarding: () => {
          try {
             const shouldHide = localStorage.getItem('hideWelcomeSplash') === 'true';
             set((state) => ({ onboarding: { ...state.onboarding, showHelpSplash: !shouldHide } }));
          } catch (error) { console.error("Error during _initializeOnboarding:", error); }
       },
       showHelpSplash: () => {
           localStorage.removeItem('hideWelcomeSplash');
           set((state) => ({ onboarding: { ...state.onboarding, showHelpSplash: true } }));
       },
       hideHelpSplash: () => {
           localStorage.setItem('hideWelcomeSplash', 'true');
           set((state) => ({ onboarding: { ...state.onboarding, showHelpSplash: false } }));
       },

       setCurrentChatMessage: (message) => set({ currentChatMessage: message }),
       setCurrentChatSectionId: (sectionId) => set({ currentChatSectionId: sectionId || 'question' }),
       addChatMessage: (sectionId, message) => set((state) => {
           const currentMessages = state.chatMessages[sectionId] || [];
           return { chatMessages: { ...state.chatMessages, [sectionId]: [...currentMessages, { ...message, timestamp: Date.now() }] } };
       }),
       clearChatMessagesForSection: (sectionId) => set((state) => {
           if (!sectionId) return state;
           return { chatMessages: { ...state.chatMessages, [sectionId]: [] } };
       }),
       resetChat: () => set({
           chatMessages: {},
           currentChatMessage: '',
           currentChatSectionId: get().currentChatSectionId,
           loading: { ...get().loading, chat: false }
       }),
       sendMessage: async (content = null) => {
            const messageContent = content || get().currentChatMessage;
            const currentSectionId = get().currentChatSectionId;
            if (!messageContent.trim() || !currentSectionId) return;
            get().addChatMessage(currentSectionId, { role: 'user', content: messageContent });
            set({ currentChatMessage: '' });
            get().setLoading('chat', true);
            try {
                const state = get();
                const userInputs = Object.entries(state.sections).reduce((acc, [id, data]) => { acc[id] = data.content; return acc; }, {});
                const sectionDef = sectionContent.sections.find(s => s.id === currentSectionId) || {};
                const historyForApi = state.chatMessages[currentSectionId] || [];
                const systemPrompt = buildSystemPrompt('chat', {
                    sectionTitle: sectionDef.title || 'section',
                    instructionsText: sectionDef.originalInstructions?.map(s => `${s.title}: ${s.instruction}`).join('\n') || '',
                    userContent: userInputs[currentSectionId] || "They haven't written anything substantial yet."
                });
                const response = await callOpenAI(
                    messageContent, currentSectionId, userInputs,
                    sectionContent.sections || [], { temperature: 0.9 },
                    historyForApi, systemPrompt, false
                );
                get().addChatMessage(currentSectionId, { role: 'assistant', content: response });
            } catch (error) {
                console.error('Error sending chat message via Zustand:', error);
                get().addChatMessage(currentSectionId, {
                    role: 'assistant',
                    content: "I'm sorry, I encountered an error processing your message. Please try again."
                });
            } finally {
                get().setLoading('chat', false);
            }
       },
    }),
    {
      name: 'scientific-project-planner-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
         sections: state.sections,
         activeToggles: state.activeToggles,
         proMode: state.proMode, // Will always be true
         scores: state.scores,
         chatMessages: state.chatMessages,
         onboarding: state.onboarding,
         uiMode: state.uiMode, 
      }),
      version: 6, // Incremented version for proMode default change
      onRehydrateStorage: (state) => {
        console.log("Zustand state hydration starting (v6)...");
        return (hydratedState, error) => {
          if (error) {
            console.error("Error rehydrating Zustand state (v6):", error);
          } else {
            console.log("Zustand state hydration finished successfully (v6).");
             // If proMode is loaded as false from old state, force it to true
            if (hydratedState && hydratedState.proMode === false) {
              console.log("Forcing proMode to true after hydration from older state.");
              useAppStore.setState({ proMode: true });
            }
          }
        }
      },
    }
  )
);

export default useAppStore;

export const initializeOnboardingFromLocalStorage = () => {
    useAppStore.getState()._initializeOnboarding();
};
