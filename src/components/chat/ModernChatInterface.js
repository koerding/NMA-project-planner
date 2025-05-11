// FILE: src/components/chat/ModernChatInterface.js
// FIXED: Positioned chat button in global lower right corner
// FIXED: Better mobile width and positioning support
// FIXED: Improved mobile scrolling and fixed close button position
// MODIFIED: Removed the minimized chat button
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import ReactGA from 'react-ga4';
import { trackChatInteraction, trackPageView } from '../../utils/analyticsUtils';
import useAppStore from '../../store/appStore';
import '../../styles/PaperPlanner.css';

const ModernChatInterface = ({
  currentSection,
  currentSectionTitle,
  chatMessages,
  currentMessage,
  setCurrentMessage,
  handleSendMessage,
  loading, // Specific loading state for CHAT operations
  currentSectionData,
  onboardingStep
}) => {
  const [isMinimized, setIsMinimized] = useState(true); // Chat will start minimized
  const messagesEndRef = useRef(null);
  const previousSectionRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null); // Reference for the whole chat container

  // Get loading states from store
  const isAnyStoreLoading = useAppStore((state) => state.isAnyLoading());
  const globalAiLoading = useAppStore((state) => state.globalAiLoading);
  const isButtonDisabled = isAnyStoreLoading || globalAiLoading;

  // Scroll effect
  useEffect(() => {
    if (!isMinimized && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isMinimized, currentSection]);

  // Track section changes
  useEffect(() => {
    if (currentSection && currentSection !== previousSectionRef.current) {
      previousSectionRef.current = currentSection;
    }
  }, [currentSection]);

  // Adjust height on resize to prevent UI issues
  useEffect(() => {
    if (!isMinimized) {
      const handleResize = () => {
        adjustChatHeight();
      };

      // Initial height adjustment
      adjustChatHeight();

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isMinimized]);

  // Function to adjust chat height based on viewport
  const adjustChatHeight = () => {
    if (!chatContainerRef.current) return;

    const viewportHeight = window.innerHeight;
    const maxHeight = Math.min(Math.floor(viewportHeight * 0.8), 600); // Max 80% of viewport height or 600px

    chatContainerRef.current.style.height = `${maxHeight}px`;

    // Check if we need to make more space on smaller screens
    if (viewportHeight < 500) {
      chatContainerRef.current.style.height = `${Math.floor(viewportHeight * 0.7)}px`;
    }
  };

  // Toggle chat window - Now only opens the chat, assumes it's initially closed/minimized
  const openChat = () => {
    if (!currentSection || isButtonDisabled) return;
    if (isMinimized) { // Only act if currently minimized
        setIsMinimized(false);

        setTimeout(() => {
          adjustChatHeight();
          inputRef.current?.focus();
        }, 300);

        if (ReactGA && typeof ReactGA.isInitialized === 'function' && ReactGA.isInitialized()) {
          trackPageView(`/chat/${currentSection}`);
          trackChatInteraction(currentSection, chatMessages?.[currentSection]?.length || 0);
        }
    }
  };

  const closeChat = () => {
    setIsMinimized(true);
  }

  // Handle sending messages
  const handleSendMessageWithTracking = () => {
    if (!currentSection || loading || isButtonDisabled || currentMessage.trim() === '') return;
    if (ReactGA && typeof ReactGA.isInitialized === 'function' && ReactGA.isInitialized()) {
      trackChatInteraction(currentSection, (chatMessages?.[currentSection]?.length || 0) + 1);
    }
    handleSendMessage();
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessageWithTracking();
    }
  };

  // The chat interface is no longer controlled by a visible button when minimized.
  // It's assumed it will be opened by other means if this component is rendered,
  // or it will stay minimized (effectively hidden as per current CSS).
  // For now, we'll keep the logic that it *can* be minimized, but there's no UI to unminimize it.
  // To make it always open or controlled externally, `isMinimized` initial state and `toggleChat` would change.

  // If we want to ensure it's always "open" when this component is rendered (and not toggleable here):
  // useEffect(() => {
  //   setIsMinimized(false); // Force open
  //   adjustChatHeight();
  //   inputRef.current?.focus();
  // }, []);


  const safeChatMessages = currentSection && chatMessages?.[currentSection] ? chatMessages[currentSection] : [];

  if (!currentSection || !currentSectionData) {
    return null;
  }


  // The minimized button is removed. The chat window will be hidden if isMinimized is true.
  // To make the chat window appear, something external would need to set isMinimized to false.
  // Or, remove the isMinimized logic entirely if the chat is always meant to be open when this component is used.
  return (
    <>
      {/* Minimized Chat Icon Button REMOVED */}

      {/* Expanded chat interface - IMPROVED MOBILE RESPONSIVENESS */}
      <div
        ref={chatContainerRef}
        className={`fixed shadow-lg rounded-lg overflow-hidden transition-all duration-300 ease-in-out chat-container ${
          isMinimized ? 'opacity-0 pointer-events-none translate-y-10' : 'opacity-100 translate-y-0'
        }`}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          left: 'auto', // Ensure it doesn't stretch to the left side
          width: 'min(550px, 92vw)', // Use min() to ensure it doesn't exceed 92% of viewport width
          maxWidth: '92vw', // Add explicit max-width for older browsers
          height: '500px', // Default height, will be adjusted by useEffect
          maxHeight: '80vh', // Never exceed 80% of viewport height
          zIndex: 899,
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column' // Use flexbox for better height distribution
        }}
      >
        {currentSection && currentSectionData ? (
          <>
            {/* Chat header - sticky with z-index */}
            <div className="bg-indigo-600 px-4 py-3 flex justify-between items-center chat-header flex-shrink-0 sticky top-0 z-20">
              <div className="flex items-center overflow-hidden flex-grow">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                 <span className="font-medium text-white truncate">{`Let's talk about ${currentSectionTitle}`}</span>
              </div>
              <button
                onClick={closeChat} // Changed from toggleChat to closeChat
                className="text-white hover:text-gray-200 focus:outline-none ml-2 flex-shrink-0"
                aria-label="Minimize chat"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /></svg>
              </button>
            </div>

            {/* Chat messages container - scrollable */}
            <div className="flex-grow overflow-y-auto p-4 messages-container" style={{ backgroundColor: '#f7f9fc' }}>
              {/* Messages rendering */}
              {safeChatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  {/* Empty state */}
                  <div className="bg-gray-100 rounded-lg p-6 text-center max-w-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                      <p className="text-lg font-medium mb-1">No messages yet</p>
                      <p className="text-sm text-gray-600">Ask questions about your {currentSectionTitle.toLowerCase()} section or get help with your project.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Message Bubbles */}
                  {safeChatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && ( <div className="ai-avatar">AI</div> )}
                      <div
                        className={`message-bubble rounded-lg p-3 max-w-[85%] ${ msg.role === 'user' ? 'bg-indigo-600 text-white self-end' : 'bg-white border border-gray-200 text-gray-800 self-start' }`}
                        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', borderTopRightRadius: msg.role === 'user' ? '0' : '1rem', borderTopLeftRadius: msg.role === 'assistant' ? '0' : '1rem' }}
                      >
                        <div className="message-content">
                          <ReactMarkdown className="prose prose-sm">{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {(loading || isButtonDisabled) && (
                    <div className="flex justify-start">
                       <div className="ai-avatar">AI</div>
                       <div className="bg-white border border-gray-200 rounded-lg p-3 inline-flex items-center shadow-sm">
                           <div className="typing-indicator"><span></span><span></span><span></span></div>
                       </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat input - sticky at bottom */}
            <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0 sticky bottom-0 z-20">
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <input
                  type="text"
                  ref={inputRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Ask about ${currentSectionTitle}...`}
                  className="flex-grow px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={loading || isButtonDisabled}
                />
                <button
                  onClick={handleSendMessageWithTracking}
                  disabled={currentMessage.trim() === '' || loading || isButtonDisabled}
                  className={`px-4 flex items-center justify-center transition-colors flex-shrink-0 ${ currentMessage.trim() === '' || loading || isButtonDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700' }`}
                >
                  {(loading || isButtonDisabled) ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-gray-500">Loading section data...</div>
        )}
      </div>
    </>
  );
};

export default ModernChatInterface;
