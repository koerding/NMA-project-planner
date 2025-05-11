// FILE: src/components/modals/SplashScreen.js
// MODIFIED: Cleaned up content to reflect current application features (always pro mode, focus on AI feedback).
import React from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import useAppStore from '../../store/appStore';
import c4rLogo from '../../assets/icons/01_C4R-short.png'; // Ensure this path is correct

const SplashScreen = ({ onStart, onShowPrivacy }) => {
  const { hideHelpSplash } = useAppStore();

  const handleGetStarted = () => {
    if (onStart) {
      onStart(); // Call the passed-in onStart function
    }
    hideHelpSplash(); // Also hide splash via store
  };

  return (
    <Dialog open={true} onClose={() => { /* Splash should be explicitly closed by button */ }} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-2xl w-full rounded-lg bg-white p-8 shadow-xl">
          <DialogTitle className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-indigo-600 text-white rounded-md p-2 mr-3 text-xl">SPP</span>
            Welcome to the Scientific Project Planner!
          </DialogTitle>

          <div className="space-y-4 text-gray-700 prose prose-sm max-w-none">
            <p className="text-base">
              Your AI-powered assistant for crafting high-quality research projects.
            </p>

            <div className="pt-2">
              <h3 className="font-semibold text-gray-800 text-md mb-1">What is this tool?</h3>
              <p>
                This tool is designed to guide you through the process of planning a scientific project,
                from formulating your initial question to outlining your entire paper. It uses AI to
                provide feedback and help you refine your ideas.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 text-md mb-2">How it Works</h3>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>
                  <strong>Outline Your Project:</strong> Work through the sections, filling in details
                  for your project. The planner provides structure and prompts.
                </li>
                <li>
                  <strong>Get AI Feedback:</strong> At any point, request AI-powered feedback on your
                  written sections to identify areas for improvement, ensure clarity, and strengthen
                  your arguments.
                </li>
                <li>
                  <strong>Iterate and Refine:</strong> Use the feedback to revise your content. Repeat
                  the process until you're satisfied with your project plan.
                </li>
              </ol>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 text-md mb-2">Key Features</h3>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>
                  <strong>Guided Structure:</strong> Follow a comprehensive, step-by-step guide for all
                  essential components of a research paper.
                </li>
                <li>
                  <strong>AI-Powered Feedback:</strong> Receive contextual suggestions and constructive
                  criticism on your content.
                </li>
                <li>
                  <strong>Iterative Improvement:</strong> Continuously refine your project with AI assistance.
                </li>
                <li>
                  <strong>Export Options:</strong> Save your project plan in various formats (Markdown, DOCX, PDF).
                </li>
              </ul>
            </div>

            <div className="pt-3">
              <h3 className="font-semibold text-gray-800 text-md mb-1">Get Started</h3>
              <p>
                Simply close this window and begin outlining your project. You can revisit this help
                screen anytime from the main menu.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                We value your privacy. This application processes data locally in your browser. AI features
                involve sending content to a third-party API (OpenAI). By using these features, you agree
                to their terms. We use cookies to remember your preferences (like hiding this splash screen).
                Learn more in our <button onClick={onShowPrivacy} className="text-indigo-600 hover:underline focus:outline-none">Privacy Policy</button>.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Built by KordingLab
              <a href="https://c4r.io" target="_blank" rel="noopener noreferrer" className="inline-flex items-center hover:underline ml-1">
                in collaboration with <img src={c4rLogo} alt="C4R" className="ml-1 h-3" />
              </a>
            </div>
            <button
              onClick={handleGetStarted}
              className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 focus:outline-none"
            >
              Got it, let's start!
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default SplashScreen;
