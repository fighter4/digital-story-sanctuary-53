
import * as pdfjsLib from 'pdfjs-dist';

export interface TextExtractionResult {
  text: string;
  success: boolean;
  error?: string;
}

export const extractTextFromFile = async (file: File, type: string): Promise<TextExtractionResult> => {
  try {
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
        
        return { text: fullText, success: true };
        
      case 'epub':
        // For EPUB, we would need to parse the EPUB structure
        // This is a simplified version - in a real app, you'd extract from the currently displayed chapter
        return { text: 'EPUB text extraction is complex and would require accessing the current chapter content.', success: true };
        
      default:
        return { text: '', success: false, error: 'Unsupported file type' };
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    return { text: '', success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const extractVisibleText = (element: HTMLElement | null): string => {
  if (!element) return '';
  
  // Extract text from visible elements
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let text = '';
  let node;
  
  while (node = walker.nextNode()) {
    const parentElement = node.parentElement;
    if (parentElement && isElementVisible(parentElement)) {
      text += node.textContent + ' ';
    }
  }
  
  return text.trim();
};

const isElementVisible = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetWidth > 0 && 
         element.offsetHeight > 0;
};
