// src/components/readers/PdfReader.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Search, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { TocItem } from '@/types/toc';

// The configureWorker function is removed from here as it's now handled globally in main.tsx

const transformPdfOutlineToToc = async (pdfDoc: any, outline: any[], level = 0): Promise<TocItem[]> => {
  if (!outline) return [];
  
  const tocItems: TocItem[] = [];

  for (const item of outline) {
    let pageNumber: number | undefined;
    if (item.dest) {
      try {
        // Ensure `getDestination` and `getPageIndex` are called on a valid pdfDoc object.
        if (pdfDoc && typeof pdfDoc.getDestination === 'function' && typeof pdfDoc.getPageIndex === 'function') {
            const destination = await pdfDoc.getDestination(item.dest);
            if (destination && destination[0]) {
              pageNumber = (await pdfDoc.getPageIndex(destination[0])) + 1;
            }
        } else {
            console.warn("pdfDoc object is not as expected for TOC generation for item:", item.title);
        }
      } catch (e) {
        console.warn("Could not resolve PDF destination for TOC item:", item.title, e);
      }
    }

    const tocItem: TocItem = {
      id: item.title + '-' + (pageNumber || level) + '-' + Math.random().toString(16).slice(2),
      label: item.title,
      href: typeof item.dest === 'string' ? item.dest : undefined, // Keep href if it's a string
      pageNumber: pageNumber,
      subitems: item.items ? await transformPdfOutlineToToc(pdfDoc, item.items, level + 1) : [],
    };
    tocItems.push(tocItem);
  }
  return tocItems;
};

interface PdfReaderProps {
  file: EbookFile;
  requestNavigation?: (location: string | number) => void; // Kept for consistency, though events are primary
}

export const PdfReader = ({ file }: PdfReaderProps) => {
  const { preferences, updateCurrentFileToc, currentFile } = useEbook();
  const { updateProgress } = useAnnotations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null); // pdfjsLib.PDFDocumentProxy
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [searchTerm, setSearchTerm] = useState(''); // Placeholder for future in-PDF search
  const [searchResults, setSearchResults] = useState<any[]>([]); // Placeholder
  const [pageInput, setPageInput] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Removed workerConfigured state, assuming global configuration from main.tsx

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) {
        console.log("RenderPage: pdfDoc or canvasRef not ready.");
        return;
    }
    setLoading(true); // Indicate loading state for page rendering
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) {
          console.error("RenderPage: Failed to get 2D context from canvas.");
          setError("Failed to get canvas context.");
          setLoading(false);
          return;
      }
      
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      console.log(`Rendered page ${pageNum} at scale ${scale}`);

      if (totalPages > 0) {
        const percentage = Math.round((pageNum / totalPages) * 100);
        updateProgress(file.id, { page: pageNum, percentage });
      }

    } catch (err) {
      console.error('Error rendering page:', pageNum, err);
      setError(`Failed to render page ${pageNum}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
        setLoading(false);
    }
  }, [scale, totalPages, file.id, updateProgress]);

  useEffect(() => {
    // Now relies on global worker configuration in main.tsx
    if (!file.file) {
        setError("No file data provided to PDF reader.");
        setLoading(false);
        return;
    }
    
    // Check if pdf.worker.min.js is globally set, if not, it's a problem with main.tsx setup
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        console.error("PDF.js workerSrc is not set globally. Check main.tsx configuration.");
        setError("PDF worker not configured. Please refresh or check console.");
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setPageInput('1');

    const loadPdf = async () => {
      try {
        console.log('Starting PDF load process in PdfReader...');
        const arrayBuffer = await file.file.arrayBuffer();
        console.log('ArrayBuffer created for PDF, size:', arrayBuffer.byteLength);
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log('PDF loaded successfully in PdfReader, pages:', pdf.numPages);
        
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        
        const outline = await pdf.getOutline();
        if (outline) {
          const toc = await transformPdfOutlineToToc(pdf, outline);
          updateCurrentFileToc(toc);
        } else {
          updateCurrentFileToc([]); // Set empty TOC if no outline
        }
        
        if (pdf.numPages > 0) {
            // renderPage will be called by the other useEffect that depends on currentPage
        } else {
            setError("PDF has no pages.");
        }
      } catch (err) {
        console.error('Error loading PDF in PdfReader:', err);
        setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false); // Set loading to false after initial load attempt
      }
    };

    loadPdf();
    
    return () => {
      // Cleanup if pdfDocRef.current has a destroy method or similar
      if (pdfDocRef.current && typeof pdfDocRef.current.destroy === 'function') {
        pdfDocRef.current.destroy();
      }
      pdfDocRef.current = null;
    };

  }, [file, updateCurrentFileToc]); // Removed renderPage from dependencies here

  useEffect(() => {
    // This effect handles rendering when currentPage, scale, or totalPages changes,
    // and after the initial loading is complete.
    if (pdfDocRef.current && currentPage && !loading && totalPages > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, scale, loading, totalPages, renderPage]);


  // Event listener for navigation (unchanged, but relies on currentFile for context)
  useEffect(() => {
    const handleNavigationRequest = (event: CustomEvent) => {
      if (event.detail && pdfDocRef.current && currentFile?.id === file.id) { // Check currentFile
        if (typeof event.detail.location === 'number') {
            goToPage(event.detail.location);
        } else if (typeof event.detail.location === 'string' && pdfDocRef.current) {
            // Handle string destinations (e.g., named destinations from TOC)
            pdfDocRef.current.getDestination(event.detail.location).then((destArray: any) => {
                if (destArray && destArray[0]) {
                    return pdfDocRef.current.getPageIndex(destArray[0]);
                }
                return null;
            }).then((pageIndex: number | null) => {
                if (pageIndex !== null) {
                    goToPage(pageIndex + 1);
                } else {
                    console.warn("Could not navigate to PDF destination:", event.detail.location);
                }
            }).catch((err: any) => {
                console.error("Error processing PDF named destination:", err);
            });
        }
      }
    };
    window.addEventListener('navigate-to-pdf-location', handleNavigationRequest as EventListener);
    return () => window.removeEventListener('navigate-to-pdf-location', handleNavigationRequest as EventListener);
  }, [file.id, currentFile]); // Added currentFile to dependencies

  const goToPage = (pageNum: number) => {
    if (pdfDocRef.current && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setPageInput(pageNum.toString());
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setPageInput(e.target.value);
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (!isNaN(pageNum)) goToPage(pageNum);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  const searchInPdf = async () => {
    // TODO: Implement actual in-PDF search if desired, or remove UI
    console.log("Search term:", searchTerm, "Search results:", searchResults);
    // This would typically involve iterating through page text content or using a library
  };

  const getThemeStyles = () => {
    // Apply theme primarily to the container, not directly to canvas filter
    // as canvas filter can make text unreadable in dark/sepia.
    // PDF.js renders its own colors. Theme adjustments here are for the reader's chrome.
    switch (preferences.theme) {
      case 'dark': return { backgroundColor: '#1f2937', color: '#f3f4f6' }; // Dark background for container
      case 'sepia': return { backgroundColor: '#fbf3e6', color: '#5c4033' }; // Sepia background
      default: return { backgroundColor: '#ffffff', color: '#111827' }; // Light background
    }
  };
  
  const progressPercentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  if (loading && !pdfDocRef.current) { // Show loading only if pdfDoc isn't ready yet
    return (
      <div className="flex-1 flex items-center justify-center" style={getThemeStyles()}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-600 dark:text-red-400 p-4" style={getThemeStyles()}>
        <p className="text-center">Error: {error}</p>
      </div>
    );
  }
  
  if (!pdfDocRef.current && !loading) { // If not loading and no PDF doc, means it failed silently or no file
      return (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-4" style={getThemeStyles()}>
              <p>Could not load PDF. Please try selecting the file again or check the console.</p>
          </div>
      );
  }


  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden" style={getThemeStyles()}>
      <div className="flex items-center justify-between p-2 border-b gap-2 flex-wrap" style={{borderColor: preferences.theme === 'dark' ? '#374151' : preferences.theme === 'sepia' ? '#eaddc7' : '#e5e7eb'}}>
        <div className="flex items-center gap-1">
          <Button onClick={prevPage} disabled={currentPage <= 1 || loading} size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <Input 
              type="text" 
              value={pageInput} 
              onChange={handlePageInputChange} 
              className="w-12 h-8 text-center text-xs" 
              disabled={loading}
            />
            <span className="text-xs text-muted-foreground">of {totalPages}</span>
          </form>
          <Button onClick={nextPage} disabled={currentPage >= totalPages || loading} size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={zoomOut} size="sm" variant="outline" disabled={loading}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button onClick={zoomIn} size="sm" variant="outline" disabled={loading}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        {/* Placeholder for search UI - consider removing if not implementing in-reader search */}
        <div className="flex items-center gap-1">
          <Input 
            placeholder="Search PDF..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-32 h-8 text-xs" 
            disabled={true} // Disabled until implemented
          />
          <Button onClick={searchInPdf} size="sm" disabled={true}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="px-4 py-1 border-b flex items-center gap-2" style={{borderColor: preferences.theme === 'dark' ? '#374151' : preferences.theme === 'sepia' ? '#eaddc7' : '#e5e7eb'}}>
        <span className="text-xs font-medium">Progress:</span>
        <Progress value={progressPercentage} className="flex-1 h-1.5" />
        <span className="text-xs text-muted-foreground min-w-[2.5rem]">{progressPercentage}%</span>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start" data-reader-content>
        {/* Canvas container to manage centering and potential max-width/height */}
        <div className="relative"> 
            <canvas 
                ref={canvasRef} 
                className="max-w-full h-auto shadow-lg border" 
                style={{ 
                    visibility: loading && currentPage > 0 ? 'hidden' : 'visible', // Hide canvas during page transition loading
                    borderColor: preferences.theme === 'dark' ? '#4b5563' : preferences.theme === 'sepia' ? '#d3c0a6' : '#d1d5db'
                }}
            />
            {loading && currentPage > 0 && ( // Show spinner over canvas area during page render
                 <div className="absolute inset-0 flex items-center justify-center bg-opacity-50" style={{backgroundColor: getThemeStyles().backgroundColor + '80'}}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};
