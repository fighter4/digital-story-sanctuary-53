// src/types/toc.ts

/**
 * Represents a single item in the Table of Contents.
 */
export interface TocItem {
  id: string; // Unique identifier for the TOC item
  label: string; // The text to display for the TOC item
  href?: string; // The link or reference within the document (e.g., CFI for EPUB, page number for PDF)
  pageNumber?: number; // Explicit page number, useful for PDFs
  lineNumber?: number; // Explicit line number, useful for TXTs
  subitems?: TocItem[]; // For nested TOC structures
}
