// src/utils/textExtraction.ts
import * as pdfjsLib from 'pdfjs-dist';

// The global workerSrc should be configured once at application startup.
// For example, in main.tsx or App.tsx, or via the configureWorker function from PdfReader.
// pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
// The above line should be removed or managed globally.

export interface TextExtractionResult {
  text: string;
  success: boolean;
  error?: string;
  totalPages?: number; // Useful for PDF progress
}

/**
 * Extracts text content from a given file.
 * For PDFs, it extracts text from all pages.
 * For EPUBs, this is a placeholder and would need a proper EPUB parsing library
 * and likely access to the rendition to get currently visible content or specific chapters.
 * @param file The file object (EPUB, PDF, TXT).
 * * @param type The type of the file ('epub', 'pdf', 'txt').
 * @returns A promise that resolves to a TextExtractionResult.
 */
export const extractTextFromFile = async (file: File, type: string): Promise<TextExtractionResult> => {
  try {
    // Ensure worker is configured before use, if not done globally.
    // This is a fallback, ideally it's set once.
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        console.warn("PDF.js workerSrc not set globally, attempting to set fallback for textExtraction.");
        // Attempt to use the same logic as PdfReader's configureWorker or a simplified version
        // This is a simplified fallback. A robust solution would share the configureWorker logic.
        const localWorkerPath = '/pdf.worker.min.js';
        try {
            const response = await fetch(localWorkerPath, { method: 'HEAD' });
            if (response.ok) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
            } else {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
            }
        } catch (e) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }
    }


    switch (type) {
      case 'txt':
        const textContent = await file.text();
        return { text: textContent, success: true };
        
      case 'pdf':
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n'; 
        }
        
        return { text: fullText, success: true, totalPages: pdf.numPages };
        
      case 'epub':
        console.warn("Full text extraction for EPUB search is not fully implemented in this utility. Search may rely on visible content if available.");
        try {
            const epubTextContent = await file.text();
            return { text: epubTextContent, success: true, error: "EPUB extraction is basic and includes HTML." };
        } catch (epubError) {
            return { text: '', success: false, error: `EPUB file could not be read as text: ${epubError instanceof Error ? epubError.message : String(epubError)}` };
        }
        
      default:
        return { text: '', success: false, error: 'Unsupported file type for text extraction' };
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    return { text: '', success: false, error: error instanceof Error ? error.message : 'Unknown error during text extraction' };
  }
};

// extractVisibleText and isElementVisible remain the same
// ... (rest of the file)
export const extractVisibleText = (element: HTMLElement | null): string => {
  if (!element) return '';
  
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT, // Only consider text nodes
    null // No custom filter
  );
  
  let text = '';
  let node;
  
  while (node = walker.nextNode()) {
    const parentElement = node.parentElement;
    // Check if the parent element is visible
    if (parentElement && isElementVisible(parentElement)) {
      text += node.textContent + ' ';
    }
  }
  
  return text.trim();
};

const isElementVisible = (element: HTMLElement): boolean => {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetWidth > 0 && 
         element.offsetHeight > 0;
};
```typescript
// src/main.tsx (or App.tsx - ensure this runs once at startup)
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker globally
const configurePdfWorker = async () => {
  const localWorkerPath = '/pdf.worker.min.js'; // Path in your public folder
  const cdnWorkerPath = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  
  try {
    // Check if local worker is available (vite dev server or after build)
    const response = await fetch(localWorkerPath, { method: 'HEAD' });
    if (response.ok) {
      console.log('Using local PDF.js worker from main.tsx');
      pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
      return;
    }
  } catch (e) {
    console.warn('Local PDF.js worker not accessible, trying CDN from main.tsx.');
  }
  
  console.log('Using CDN PDF.js worker from main.tsx');
  pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerPath;
};

configurePdfWorker().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
}).catch(error => {
  console.error("Failed to configure PDF worker, application might not function correctly for PDFs:", error);
  // Still render the app, but PDF functionality might be impaired.
  createRoot(document.getElementById("root")!).render(<App />);
});

