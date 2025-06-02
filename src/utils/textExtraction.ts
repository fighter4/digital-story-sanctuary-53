import * as pdfjsLib from 'pdfjs-dist';

// Use local worker path (copied to public directory)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
 * @param type The type of the file ('epub', 'pdf', 'txt').
 * @returns A promise that resolves to a TextExtractionResult.
 */
export const extractTextFromFile = async (file: File, type: string): Promise<TextExtractionResult> => {
  try {
    switch (type) {
      case 'txt':
        const textContent = await file.text();
        return { text: textContent, success: true };
        
      case 'pdf':
        const arrayBuffer = await file.arrayBuffer();
        // It's important to use the `data` property for the arrayBuffer.
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        // Iterate through all pages to extract text for searching.
        // For very large PDFs, this can be memory and time-intensive.
        // A more advanced solution for search might involve:
        // 1. Indexing the PDF content in the background (e.g., using a Web Worker).
        // 2. Implementing page-by-page search if full extraction is too slow,
        //    though this makes global search less straightforward.
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // The `str` property of each item in `textContent.items` contains the text.
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n'; // Add a newline to separate page content.
        }
        
        return { text: fullText, success: true, totalPages: pdf.numPages };
        
      case 'epub':
        // EPUB text extraction for a full-document search is complex.
        // It requires unzipping the EPUB, parsing XHTML/HTML content files,
        // and stripping HTML tags.
        // A simpler approach for "search visible" would be to extract text
        // from the currently rendered EPUB content in the reader component.
        // This placeholder indicates that a full EPUB text extraction for search is not implemented here.
        console.warn("Full text extraction for EPUB search is not fully implemented in this utility. Search may rely on visible content if available.");
        // Attempt to read as text for a very basic fallback, though this will include HTML.
        try {
            const epubTextContent = await file.text();
            // This is a naive extraction and will include HTML tags.
            // A proper EPUB parser would be needed to get clean text.
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

/**
 * Extracts text from currently visible elements within a given container.
 * This is useful for features like "search visible text" or "read visible text".
 * @param element The container HTML element.
 * @returns The extracted visible text, or an empty string if no element or text.
 */
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

/**
 * Checks if an HTML element is currently visible in the viewport.
 * @param element The HTML element to check.
 * @returns True if the element is visible, false otherwise.
 */
const isElementVisible = (element: HTMLElement): boolean => {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetWidth > 0 && 
         element.offsetHeight > 0;
};
