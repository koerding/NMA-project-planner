// FILE: src/components/layout/LeftPanel.js
// UPDATED: Removed pro mode messaging card - moved to splash screen

import React, { useEffect, useRef } from 'react';
import useAppStore from '../../store/appStore';
import { isSectionVisible, isToggleVisible } from '../../logic/progressionLogic';
import { getVisibleSectionsInDisplayOrder, getApproachSectionIds, getDataMethodSectionIds } from '../../utils/sectionOrderUtils';
import SectionCard from '../sections/SectionCard';
import sectionContent from '../../data/sectionContent.json';

// Helper function to render a standard SectionCard
const renderStandardSectionCard = (section, activeSection, handleSectionFocus, handleMagic, onRequestFeedback) => {
  if (!section || !section.id) return null;
  const sectionState = useAppStore.getState().sections[section.id];
  if (!sectionState) return null; // Ensure state exists

  const isCurrentActive = activeSection === section.id;
  return (
    <SectionCard
      key={section.id} // Use section ID as key
      sectionId={section.id}
      isCurrentSection={isCurrentActive}
      onRequestFeedback={handleMagic}
      handleSectionFocus={handleSectionFocus}
      isToggleSection={false} // Explicitly false
      onSwitchToGuide={onRequestFeedback} // Pass the mode switch function
    />
  );
};


const LeftPanel = ({
  activeSection,
  handleSectionFocus,
  handleApproachToggle,
  handleDataMethodToggle,
  handleMagic,
  proMode,
  onRequestFeedback, // Callback to switch to guide mode
  contentRef, // Reference to container for scrolling
}) => {

  // Create refs for each section card
  const sectionRefs = useRef({});

  // Direct prop logging (can be removed later)
  useEffect(() => {
    console.log("[LeftPanel] Mounted with onRequestFeedback:", !!onRequestFeedback);
  }, [onRequestFeedback]);

  // Scroll to active section when it changes
  useEffect(() => {
    if (activeSection && sectionRefs.current[activeSection]) {
      // Use the contentRef to find the section element with the proper ID
      if (contentRef && contentRef.current) {
        const sectionElement = contentRef.current.querySelector(`#section-${activeSection}`);
        if (sectionElement) {
          // Scroll the section into view with a smooth effect
          sectionElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start'
          });
          console.log(`Scrolling to section: ${activeSection}`);
        }
      }
    }
  }, [activeSection, contentRef]);

  // --- Select State from Zustand Store ---
  const sections = useAppStore((state) => state.sections);
  const activeToggles = useAppStore((state) => state.activeToggles);
  const storeState = useAppStore((state) => state);

  // --- Debug Log ---
  useEffect(() => {
    console.log("DEBUG [LeftPanel]: activeToggles updated in store:", activeToggles);
  }, [activeToggles]);
  // ---

  // --- Derived State & Logic ---
  const allSectionsArray = sections && typeof sections === 'object' ? Object.values(sections) : [];
  const activeApproachSectionId = activeToggles.approach;
  const activeDataMethodSectionId = activeToggles.dataMethod;
  const sectionDefinitions = sectionContent.sections || [];
  const showApproachToggle = isToggleVisible('approach', storeState);
  const showDataToggle = isToggleVisible('data', storeState);

  // Filter standard sections for rendering
  const standardSectionsToRender = getVisibleSectionsInDisplayOrder(
      allSectionsArray,
      activeApproachSectionId,
      activeDataMethodSectionId
  ).filter(section =>
      section &&
      !getApproachSectionIds().includes(section.id) &&
      !getDataMethodSectionIds().includes(section.id) &&
      isSectionVisible(section.id, storeState)
  );

  // Define options for toggles
  const approachOptions = [ 
    { id: 'hypothesis', label: 'Hypothesis' }, 
    { id: 'needsresearch', label: 'Needs' }, 
    { id: 'exploratoryresearch', label: 'Exploratory' } 
  ];
  const dataMethodOptions = [ 
    { id: 'experiment', label: 'Experiment' }, 
    { id: 'existingdata', label: 'Dataset' }, 
    { id: 'theorysimulation', label: 'Theory' } 
  ];

  // Find specific standard sections for ordering
  const questionSectionDef = standardSectionsToRender.find(s => s?.id === 'question');
  const audienceSectionDef = standardSectionsToRender.find(s => s?.id === 'audience');
  const relatedPapersSectionDef = standardSectionsToRender.find(s => s?.id === 'relatedpapers');
  const analysisSectionDef = standardSectionsToRender.find(s => s?.id === 'analysis');
  const processSectionDef = standardSectionsToRender.find(s => s?.id === 'process');
  const abstractSectionDef = standardSectionsToRender.find(s => s?.id === 'abstract');

  return (
    <div className="w-full h-full overflow-y-auto pb-8 box-border flex-shrink-0">
      {/* HeaderCard removed as it's now in the parent SinglePanelLayout */}

      {/* Question Section */}
      {questionSectionDef && (
        <div ref={el => sectionRefs.current.question = el}>
          {renderStandardSectionCard(questionSectionDef, activeSection, handleSectionFocus, handleMagic, onRequestFeedback)}
        </div>
      )}

      {/* Approach Toggle Section Card */}
      {showApproachToggle && (
        <div ref={el => sectionRefs.current[activeApproachSectionId] = el}>
          <SectionCard
            key={activeApproachSectionId} // Dynamic key
            sectionId={activeApproachSectionId}
            isCurrentSection={activeSection === activeApproachSectionId}
            onRequestFeedback={handleMagic}
            handleSectionFocus={handleSectionFocus}
            options={approachOptions}
            activeOption={activeApproachSectionId}
            onToggle={handleApproachToggle}
            isToggleSection={true}
            onSwitchToGuide={onRequestFeedback} // Pass the mode switch function
          />
        </div>
      )}

      {/* Audience Section */}
      {audienceSectionDef && (
        <div ref={el => sectionRefs.current.audience = el}>
          {renderStandardSectionCard(audienceSectionDef, activeSection, handleSectionFocus, handleMagic, onRequestFeedback)}
        </div>
      )}

      {/* Related Papers Section */}
      {relatedPapersSectionDef && (
        <div ref={el => sectionRefs.current.relatedpapers = el}>
          {renderStandardSectionCard(relatedPapersSectionDef, activeSection, handleSectionFocus, handleMagic, onRequestFeedback)}
        </div>
      )}

      {/* Data Method Toggle Section Card */}
      {showDataToggle && (
        <div ref={el => sectionRefs.current[activeDataMethodSectionId] = el}>
         <SectionCard
           key={activeDataMethodSectionId} // Dynamic key
           sectionId={activeDataMethodSectionId}
           isCurrentSection={activeSection === activeDataMethodSectionId}
           onRequestFeedback={handleMagic}
           handleSectionFocus={handleSectionFocus}
           options={dataMethodOptions}
           activeOption={activeDataMethodSectionId}
           onToggle={handleDataMethodToggle}
           isToggleSection={true}
           onSwitchToGuide={onRequestFeedback} // Pass the mode switch function
         />
        </div>
      )}

      {/* Analysis Section */}
      {analysisSectionDef && (
        <div ref={el => sectionRefs.current.analysis = el}>
          {renderStandardSectionCard(analysisSectionDef, activeSection, handleSectionFocus, handleMagic, onRequestFeedback)}
        </div>
      )}

      {/* Process Section */}
      {processSectionDef && (
        <div ref={el => sectionRefs.current.process = el}>
          {renderStandardSectionCard(processSectionDef, activeSection, handleSectionFocus, handleMagic, onRequestFeedback)}
        </div>
      )}

      {/* Abstract Section */}
      {abstractSectionDef && (
        <div ref={el => sectionRefs.current.abstract = el}>
          {renderStandardSectionCard(abstractSectionDef, activeSection, handleSectionFocus, handleMagic, onRequestFeedback)}
        </div>
      )}

      {/* Gray card with Pro Mode info removed - now in splash screen */}
    </div>
  );
};

export default LeftPanel;
