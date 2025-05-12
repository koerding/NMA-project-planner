// FILE: src/components/PaperPlanner/VerticalPaperPlannerApp.js
// START OF FILE
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { preprint, preprintLight, dødePikselClipped, dødePikselLightClipped, amstelvar, amstelvarLight } from '@cloudinary/url-gen/qualifiers/fontHinting';
import SectionCard from '../sections/SectionCard';
import HeaderCard from '../sections/HeaderCard';
import LeftRailNavigation from '../navigation/LeftRailNavigation';
import ModalManager from '../modals/ModalManager';
import { SplashScreenManager } from '../modals/SplashScreenManager';
import { sectionContent as initialSectionContent } from '../../data/sectionContent.json';
import { generateSectionPrompts } from '../../utils/promptUtils';
import { loadData, saveData, deleteData, listProjects } from '../../services/storageService';
import { initializeOpenAI, getOpenAIClient, setOpenAIClient } } from '../../services/openaiService';
import { exportToDOCX, exportToMarkdown, exportToPDF } from '../../utils/export';
import { trackEvent, initializeAnalytics } from '../../utils/analyticsUtils';
import { useAppStore } from '../../store/appStore';
import { getSectionOrder, updateSectionOrder, initializeSectionOrder, isSectionOrderInitialized, DEFAULT_ORDER } from '../../utils/sectionOrderUtils';
import { isTouchDevice } from '../../utils/touchDetection';
import MainLayout from '../layout/MainLayout';
import { reviewScientificPaper as reviewPaperContent } from '../../services/paperReviewService'; // Corrected import
import { logError, logInfo, logWarning, logDebug } from '../../utils/debugUtils';
import { loadFontsFromCDN } from '../../utils/cdnLoader';
import { processImportedDocument } from '../../services/documentImportService';
import { useDocumentImport } from '../../hooks/useDocumentImport';


const VerticalPaperPlannerApp = () => {
    logInfo("VerticalPaperPlannerApp component rendering", { initialSectionContent });

    const [sectionContentData, setSectionContentData] = useState(() => {
        logDebug("Initializing sectionContentData state");
        const initialData = initializeSectionOrder(initialSectionContent);
        logDebug("Initialized section order in sectionContentData", initialData);
        return initialData;
    });

    const [sectionPrompts, setSectionPrompts] = useState({});
    const [projectName, setProjectName] = useState('defaultProject');
    const [projects, setProjects] = useState([]);
    const [activeModal, setActiveModal] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeSection, setActiveSection] = useState(null);
    const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [error, setError] = useState(null);
    const { isProMode, toggleProMode, showSplashScreen, setShowSplashScreen, apiKey, setApiKey } = useAppStore();
    const [currentRightPanelContent, setCurrentRightPanelContent] = useState('instructions'); // 'instructions', 'chat', 'review'
    const [reviewResult, setReviewResult] = useState(null);
    const [isReviewing, setIsReviewing] = useState(false);

    const backend = isTouchDevice() ? TouchBackend : HTML5Backend;
    const mainContentRef = useRef(null);

    const {
        importedSections,
        isImporting,
        importError,
        handleFileSelect: handleDocumentImportFileSelect,
        clearImportedData: clearImportedDocumentData
    } = useDocumentImport(setSectionContentData, sectionContentData);


    const updateSectionContent = useCallback((id, content, field = "content") => {
        logDebug("updateSectionContent called", { id, field });
        setSectionContentData(prevData => {
            const newData = { ...prevData };
            if (!newData[id]) {
                logWarning(`Section with id ${id} not found in sectionContentData`, { availableIds: Object.keys(newData) });
                return prevData; // or handle error appropriately
            }
            newData[id] = { ...newData[id], [field]: content };
            logDebug("Section content updated", { id, field, newContent: newData[id] });
            return newData;
        });
        trackEvent('section_content_updated', { section_id: id, field_updated: field });
    }, []);


    const handleReviewPaper = useCallback(async (file) => {
        logInfo("handleReviewPaper called");
        if (!file) {
            logWarning("No file provided for review.");
            setError("Please select a file to review.");
            return;
        }
        setIsReviewing(true);
        setError(null);
        setReviewResult(null);
        setCurrentRightPanelContent('review'); // Switch to review tab
        try {
            const result = await reviewPaperContent(file, sectionContentData);
            setReviewResult(result);
            logInfo("Paper review successful", { result });
            trackEvent('paper_review_success');
        } catch (err) {
            logError("Error reviewing paper:", err);
            setError(`Failed to review paper: ${err.message}`);
            setReviewResult({ error: `Failed to review paper: ${err.message}` });
            trackEvent('paper_review_failed', { error: err.message });
        } finally {
            setIsReviewing(false);
        }
    }, [sectionContentData]);


    const handleSave = useCallback(async () => {
        logInfo("handleSave called", { projectName });
        setIsLoading(true);
        setError(null);
        try {
            const client = getOpenAIClient(); // Ensure client is available if needed for save, though not directly used here
            if (!client && isProMode) { // Example check, adjust if OpenAI client is needed for some pro save feature
                logWarning("OpenAI client not initialized for Pro Mode save operation.");
                // setError("OpenAI API key is not set. Please set it in the settings.");
                // setIsLoading(false);
                // return;
            }
            await saveData(projectName, sectionContentData, getSectionOrder());
            logInfo("Data saved successfully for project:", projectName);
            alert('Project saved successfully!');
            trackEvent('project_saved', { project_name: projectName });
            fetchProjects(); // Refresh project list
        } catch (err) {
            logError("Error saving data:", err);
            setError(`Failed to save project: ${err.message}`);
            trackEvent('project_save_failed', { project_name: projectName, error: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [projectName, sectionContentData, isProMode]);

    const handleLoad = useCallback(async (name) => {
        logInfo("handleLoad called", { name });
        setIsLoading(true);
        setError(null);
        try {
            const { data, order } = await loadData(name);
            if (data) {
                setSectionContentData(data);
                if (order && Array.isArray(order) && order.length > 0) {
                    updateSectionOrder(order);
                } else {
                    // If no valid order in loaded data, initialize based on current data or default
                    const currentKeys = Object.keys(data);
                    const newOrder = DEFAULT_ORDER.filter(key => currentKeys.includes(key));
                    currentKeys.forEach(key => {
                        if (!newOrder.includes(key)) newOrder.push(key);
                    });
                    updateSectionOrder(newOrder);
                }
                setProjectName(name);
                logInfo("Data loaded successfully for project:", name);
                alert('Project loaded successfully!');
                trackEvent('project_loaded', { project_name: name });
            } else {
                logWarning("No data found for project:", name);
                setError("No data found for this project.");
                trackEvent('project_load_not_found', { project_name: name });
            }
        } catch (err) {
            logError("Error loading data:", err);
            setError(`Failed to load project: ${err.message}`);
            trackEvent('project_load_failed', { project_name: name, error: err.message });
        } finally {
            setIsLoading(false);
            setActiveModal(null); // Close load dialog
        }
    }, []);

    const handleDelete = useCallback(async (name) => {
        logInfo("handleDelete called", { name });
        setIsLoading(true);
        setError(null);
        try {
            await deleteData(name);
            fetchProjects(); // Refresh project list
            if (name === projectName) {
                setProjectName('defaultProject'); // Reset to default if current project is deleted
                setSectionContentData(initializeSectionOrder(initialSectionContent)); // Reset data
            }
            logInfo("Project deleted successfully:", name);
            alert('Project deleted successfully!');
            trackEvent('project_deleted', { project_name: name });
        } catch (err) {
            logError("Error deleting data:", err);
            setError(`Failed to delete project: ${err.message}`);
            trackEvent('project_delete_failed', { project_name: name, error: err.message });
        } finally {
            setIsLoading(false);
            setActiveModal(null); // Close delete confirmation or load dialog if open
        }
    }, [projectName]);


    const fetchProjects = useCallback(async () => {
        logDebug("fetchProjects called");
        setIsLoading(true);
        try {
            const projectNames = await listProjects();
            setProjects(projectNames);
            logDebug("Projects fetched successfully", { projectNames });
        } catch (err) {
            logError("Error fetching projects:", err);
            setError("Failed to fetch project list.");
            trackEvent('fetch_projects_failed', { error: err.message });
        } finally {
            setIsLoading(false);
        }
    }, []);


    const handleExport = useCallback(async (format) => {
        logInfo("handleExport called", { format, projectName });
        setError(null);
        try {
            const orderedContent = getSectionOrder().map(id => ({
                title: sectionContentData[id]?.title || "Untitled Section",
                content: sectionContentData[id]?.content || ""
            }));

            if (format === 'docx') {
                await exportToDOCX(orderedContent, `${projectName}.docx`, sectionContentData);
            } else if (format === 'md') {
                await exportToMarkdown(orderedContent, `${projectName}.md`, sectionContentData);
            } else if (format === 'pdf') {
                await exportToPDF(orderedContent, `${projectName}.pdf`, sectionContentData);
            }
            logInfo("Export successful", { format });
            trackEvent('project_exported', { format: format, project_name: projectName });
        } catch (err) {
            logError("Error exporting data:", err);
            setError(`Failed to export project: ${err.message}`);
            trackEvent('project_export_failed', { format: format, project_name: projectName, error: err.message });
        }
    }, [projectName, sectionContentData]);


    const handleAddNewSection = useCallback((newSection) => {
        logInfo("handleAddNewSection called", { newSection });
        setSectionContentData(prevData => {
            const newData = { ...prevData, [newSection.id]: newSection };
            return newData;
        });
        const currentOrder = getSectionOrder();
        updateSectionOrder([...currentOrder, newSection.id]);
        setActiveSection(newSection.id); // Optionally make the new section active
        trackEvent('section_added', { section_id: newSection.id, section_title: newSection.title });
    }, []);

    const moveSection = useCallback((dragId, hoverId) => {
        logDebug("moveSection called", { dragId, hoverId });
        const currentOrder = getSectionOrder();
        const dragIndex = currentOrder.indexOf(dragId);
        const hoverIndex = currentOrder.indexOf(hoverId);

        if (dragIndex === -1 || hoverIndex === -1) {
            logWarning("Drag or hover ID not found in current order", { dragId, hoverId, currentOrder });
            return;
        }

        const newOrder = [...currentOrder];
        newOrder.splice(dragIndex, 1);
        newOrder.splice(hoverIndex, 0, dragId);
        updateSectionOrder(newOrder);
        // No need to call setSectionContentData if only order changes
        trackEvent('section_moved', { dragged_section_id: dragId, target_section_id: hoverId });
    }, []);


    const handleGeneratePrompts = useCallback(async (sectionId) => {
        logInfo("handleGeneratePrompts called", { sectionId });
        if (!isProMode) {
            logWarning("Prompt generation attempted in non-Pro mode.");
            setActiveModal('proModeNag');
            return;
        }
        if (!getOpenAIClient()) {
            logWarning("OpenAI client not initialized for prompt generation.");
            setActiveModal('apiKeyNeeded');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const section = sectionContentData[sectionId];
            if (!section) {
                logError(`Section ${sectionId} not found for prompt generation.`);
                throw new Error(`Section ${sectionId} not found.`);
            }
            const generatedPrompts = await generateSectionPrompts(section.title, section.content, getOpenAIClient());
            setSectionPrompts(prev => ({ ...prev, [sectionId]: generatedPrompts }));
            updateSectionContent(sectionId, generatedPrompts.join('\n\n'), 'prompts');
            logInfo("Prompts generated successfully", { sectionId, generatedPrompts });
            trackEvent('prompts_generated', { section_id: sectionId });
        } catch (err) {
            logError("Error generating prompts:", err);
            setError(`Failed to generate prompts: ${err.message}`);
            trackEvent('prompts_generation_failed', { section_id: sectionId, error: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [isProMode, sectionContentData, updateSectionContent]);


    const handleAPIKeyChange = (key) => {
        logInfo("handleAPIKeyChange called");
        try {
            initializeOpenAI(key);
            setApiKey(key); // Save to Zustand store, which also saves to localStorage
            setError(null);
            setActiveModal(null); // Close API key modal if open
            logInfo("OpenAI API key updated and client initialized.");
            trackEvent('api_key_set');
        } catch (err) {
            logError("Error initializing OpenAI with new key:", err);
            setError("Failed to initialize OpenAI client: " + err.message);
            trackEvent('api_key_set_failed', { error: err.message });
        }
    };

    // Initialize analytics and load fonts on component mount
    useEffect(() => {
        logInfo("VerticalPaperPlannerApp component mounted");
        initializeAnalytics();
        loadFontsFromCDN(); // Load fonts like Amstelvar

        if (!isSectionOrderInitialized()) {
            logInfo("Section order not initialized, initializing with default.");
            const initialOrder = initializeSectionOrder(initialSectionContent);
            setSectionContentData(initialOrder); // This also sets the order via initializeSectionOrder
        } else {
            logInfo("Section order already initialized.");
            // Ensure sectionContentData is also in sync with the loaded order if app rehydrates
            const currentOrder = getSectionOrder();
            const orderedData = {};
            currentOrder.forEach(id => {
                if (initialSectionContent[id]) {
                    orderedData[id] = initialSectionContent[id];
                } else {
                    logWarning(`Section ID ${id} from order not found in initialSectionContent`);
                }
            });
            // Add any missing sections not in the order
            Object.keys(initialSectionContent).forEach(id => {
                if (!orderedData[id]) {
                    orderedData[id] = initialSectionContent[id];
                    logDebug(`Adding section ${id} to data as it was missing from ordered init.`);
                }
            });
            setSectionContentData(orderedData);

        }
        fetchProjects();

        const storedApiKey = localStorage.getItem('openai_api_key');
        if (storedApiKey) {
            logInfo("Found stored API key, initializing OpenAI.");
            setApiKey(storedApiKey); // Set in store
            try {
                initializeOpenAI(storedApiKey);
            } catch (error) {
                logError("Failed to initialize OpenAI with stored key on mount:", error);
                setError("Failed to initialize OpenAI with stored API key.");
            }
        } else if (isProMode) {
            logInfo("Pro mode enabled but no API key found on mount.");
            // Consider prompting for API key if in Pro mode and no key is set
            // setActiveModal('apiKeyNeeded');
        }

        // Check if splash screen should be shown
        const returningUser = localStorage.getItem('returningUser');
        if (!returningUser) {
            logInfo("New user detected, showing splash screen.");
            setShowSplashScreen(true);
            localStorage.setItem('returningUser', 'true');
            trackEvent('show_splash_screen', { type: 'first_visit' });
        } else {
            logInfo("Returning user, splash screen not shown by default.");
            setShowSplashScreen(false); // Explicitly set to false for returning users if needed by logic
        }
        return () => {
            logInfo("VerticalPaperPlannerApp component unmounting");
            // Cleanup listeners or timers if any
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isProMode, fetchProjects, setApiKey, setShowSplashScreen]); // Added setShowSplashScreen

    // Effect to handle imported document data
    useEffect(() => {
        if (importedSections && Object.keys(importedSections).length > 0) {
            logInfo("Imported sections detected, updating sectionContentData.", { importedSections });
            // This assumes importedSections is in the same format as sectionContentData
            // and that sectionOrder is handled or needs to be updated separately.
            // For now, we are replacing the content. A merge strategy might be needed.
            setSectionContentData(prevData => {
                const newData = { ...prevData };
                let newOrder = getSectionOrder();
                Object.keys(importedSections).forEach(key => {
                    newData[key] = {
                        ...(prevData[key] || { title: importedSections[key].title, id: key }), // keep existing id and title if merging
                        content: importedSections[key].content,
                        // any other relevant fields from import
                    };
                    if (!newOrder.includes(key)) {
                        // Add to order if it's a truly new section based on ID
                        // This simple add might not be ideal, consider placement logic
                        newOrder.push(key);
                    }
                });
                updateSectionOrder(newOrder);
                return newData;
            });
            alert("Document content has been imported into the respective sections.");
            trackEvent('document_imported_successfully');
            // clearImportedDocumentData(); // Clear after processing to prevent re-processing
        }
        if (importError) {
            logError("Error during document import process:", importError);
            setError(`Document import failed: ${importError}`);
            trackEvent('document_import_failed', { error: importError });
            // clearImportedDocumentData(); // Clear error after showing
        }
    }, [importedSections, importError, clearImportedDocumentData]);



    const currentOrder = getSectionOrder();
    if (!currentOrder || currentOrder.length === 0) {
        logWarning("Section order is empty or not yet initialized properly in render.", { currentOrder });
        // This might indicate an issue with initialization logic or state update timing.
        // Potentially return a loading state or an error message.
    }


    return (
        <DndProvider backend={backend} options={{ enableMouseEvents: !isTouchDevice() }}>
            <SplashScreenManager
                showSplashScreen={showSplashScreen}
                onClose={() => {
                    setShowSplashScreen(false);
                    trackEvent('splash_screen_closed');
                }}
            />
            <ModalManager
                activeModal={activeModal}
                onClose={() => setActiveModal(null)}
                onSave={handleSave}
                onLoad={handleLoad}
                onDelete={handleDelete}
                onExport={handleExport}
                onSetApiKey={handleAPIKeyChange}
                projects={projects}
                currentProjectName={projectName}
                onProjectNameChange={setProjectName}
                onAddNewSection={handleAddNewSection}
                onImportFileSelect={handleDocumentImportFileSelect}
                isImportingDocument={isImporting}
                onReviewPaper={handleReviewPaper}
                isLoading={isLoading}
            />
            <MainLayout
                isLeftPanelOpen={isLeftPanelOpen}
                setIsLeftPanelOpen={setIsLeftPanelOpen}
                isRightPanelOpen={isRightPanelOpen}
                setIsRightPanelOpen={setIsRightPanelOpen}
                currentRightPanelContent={currentRightPanelContent}
                setCurrentRightPanelContent={setCurrentRightPanelContent}
                headerContent={
                    <AppHeader
                        projectName={projectName}
                        onProjectNameChange={setProjectName}
                        onSave={() => setActiveModal('save')}
                        onLoad={() => { fetchProjects(); setActiveModal('load'); }}
                        onExport={() => setActiveModal('export')}
                        onMenuToggle={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                        onSettings={() => setActiveModal('settings')}
                        onNewProject={() => {
                            setProjectName("NewProject");
                            setSectionContentData(initializeSectionOrder(initialSectionContent));
                            updateSectionOrder(DEFAULT_ORDER); // Reset order for new project
                            trackEvent('new_project_created');
                        }}
                        onImportDocument={() => setActiveModal('importDocument')}
                        onReviewPaper={() => setActiveModal('reviewPaper')}
                    />
                }
                leftPanelContent={
                    <LeftRailNavigation
                        sections={currentOrder.map(id => sectionContentData[id]).filter(Boolean)}
                        activeSection={activeSection}
                        setActiveSection={(id) => {
                            setActiveSection(id);
                            if (mainContentRef.current) {
                                const element = document.getElementById(`section-card-${id}`);
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }
                            trackEvent('navigation_section_clicked', { section_id: id });
                        }}
                        onToggle={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                        isProMode={isProMode}
                        onToggleProMode={() => {
                            toggleProMode();
                            if (!isProMode && !apiKey) setActiveModal('apiKeyNeeded');
                            trackEvent('pro_mode_toggled', { enabled: !isProMode });
                        }}
                        onShowHelp={() => setActiveModal('help')}
                        onAddNewSection={() => setActiveModal('addSection')}
                    />
                }
                mainContentRef={mainContentRef}
                reviewResult={reviewResult} // Pass reviewResult to MainLayout for the review panel
                isReviewing={isReviewing} // Pass isReviewing state
            >
                {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">{error}</div>}
                {isLoading && !isReviewing && <div className="p-4 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg">Loading...</div>}

                <HeaderCard
                    title={sectionContentData.header?.title || "Scientific Paper Planner"}
                    content={sectionContentData.header?.content || "Plan your next paper with AI assistance."}
                    onContentChange={(content) => updateSectionContent('header', content)}
                    onTitleChange={(title) => updateSectionContent('header', title, 'title')}
                    isProMode={isProMode}
                />
                {currentOrder.map((id, index) => {
                    const section = sectionContentData[id];
                    if (!section) {
                        logWarning(`Section with id ${id} not found in sectionContentData during map. Order:`, currentOrder);
                        return null; // or some fallback UI
                    }
                    return (
                        <SectionCard
                            key={section.id}
                            id={section.id}
                            index={index}
                            title={section.title}
                            content={section.content}
                            instructions={section.instructions}
                            prompts={sectionPrompts[section.id] || section.prompts}
                            onContentChange={(content) => updateSectionContent(section.id, content)}
                            onTitleChange={(title) => updateSectionContent(section.id, title, 'title')}
                            onInstructionChange={(instructions) => updateSectionContent(section.id, instructions, 'instructions')}
                            onGeneratePrompts={() => handleGeneratePrompts(section.id)}
                            onDelete={() => {
                                const newContentData = { ...sectionContentData };
                                delete newContentData[section.id];
                                setSectionContentData(newContentData);
                                const newOrder = currentOrder.filter(sId => sId !== section.id);
                                updateSectionOrder(newOrder);
                                trackEvent('section_deleted', { section_id: section.id });
                            }}
                            moveSection={moveSection}
                            isProMode={isProMode}
                            isActive={activeSection === section.id}
                            onClick={() => {
                                setActiveSection(section.id);
                                trackEvent('section_card_clicked', { section_id: section.id });
                            }}
                            isLoading={isLoading && activeSection === section.id} // Example: show loading on specific card
                            promptsFromInstructions={section.promptsFromInstructions}
                            onPromptsFromInstructionsChange={(value) => updateSectionContent(section.id, value, 'promptsFromInstructions')}
                            customPrompt={section.customPrompt}
                            onCustomPromptChange={(value) => updateSectionContent(section.id, value, 'customPrompt')}
                        />
                    );
                })}

            </MainLayout>
        </DndProvider>
    );
};

export default VerticalPaperPlannerApp;
// END OF FILE
