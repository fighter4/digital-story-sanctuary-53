// src/main.tsx
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import * as pdfjsLib from 'pdfjs-dist';

// Import the worker as a URL using Vite's `?url` suffix.
// This path points to the worker file within the pdfjs-dist package.
// Vite will handle making this asset available and providing the correct URL.
import PdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';

const configurePdfWorker = () => {
  // Use the URL provided by Vite's import system.
  // This is generally more robust with bundlers like Vite.
  if (PdfWorkerUrl) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorkerUrl;
    console.log(`PDF.js workerSrc configured globally to: ${PdfWorkerUrl}`);
  } else {
    // Fallback or error if Vite couldn't provide the URL (should not happen with ?url)
    console.error('Failed to get PDF Worker URL from Vite. PDF functionality may be impaired.');
    // As a last resort, you could try the CDN again, but ?url should work.
    // pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
};

// Configure the worker immediately at application startup.
configurePdfWorker();

// Then render the app.
createRoot(document.getElementById("root")!).render(<App />);
