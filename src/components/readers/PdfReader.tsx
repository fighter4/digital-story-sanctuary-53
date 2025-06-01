// src/components/readers/PdfReader.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Search, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { TocItem } from '@/types/toc'; // Import TocItem

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

interface PdfReaderProps {
  file: EbookFile;
  requestNavigation: (location: string | number) => void; // Callback for TOC navigation
}

// Helper to transform PDF outline to TocItem structure
const transformPdfOutlineToToc = (outline: any[], level = 0): TocItem[] => {
  if (!outline) return [];
  return outline.map((item: any) => ({
    id: item.dest && typeof item.dest === 'string' ? item.dest : `${item.title}-${level}-${Math.random()}`, // Ensure ID
    label: item.title,
    // For PDF, 'dest' can be a string (named destination) or an array (explicit destination).
    // Navigation will primarily use page numbers derived later if 'dest' is an array.
    // If 'dest' is a string, it might need to be resolved to a page number.
    // For simplicity, we'll primarily rely on page numbers for navigation.
    // The `navigateToPage` function in PdfReader will handle page number navigation.
    // We can store the original `dest` if needed for more complex navigation logic later.
    href: typeof item.dest === 'string' ? item.dest : undefined, // Store named destination if string
    // Page number will be resolved by the viewer when navigating via outline.
    // We can try to resolve it here if needed, but pdfjs handles it.
    subitems: item.items ? transformPdfOutlineToToc(item.items, level + 1) : [],
  }));
};


export const PdfReader = ({ file, requestNavigation }: PdfReaderProps) => {
  const { preferences, updateCurrentFileToc } = useEbook();
  const { updateProgress } = useAnnotations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null); // Store pdfDoc instance
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pageInput, setPageInput] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;
      
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;

      const percentage = totalPages > 0 ? Math.round((pageNum / totalPages) * 100) : 0;
       updateProgress(file.id, { page: pageNum, percentage });

    } catch (err) {
      console.error('Error rendering page:', err);
      setError(`Failed to render page ${pageNum}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [scale, totalPages, file.id, updateProgress]);


  useEffect(() => {
    if (!file.file) return;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1); // Reset to page 1 on new file
        setPageInput('1');

        // Extract and set TOC
        const outline = await pdf.getOutline();
        if (outline) {
          const toc = transformPdfOutlineToToc(outline);
          // We need to resolve destinations to page numbers for PDF TOC items
          const tocWithPageNumbers = await Promise.all(toc.map(async (item) => {
            let pageNum: number | undefined;
            if (item.href && typeof item.href === 'string') { // Named destination
              try {
                const dest = await pdf.getDestination(item.href);
                if (dest && dest[0]) {
                  pageNum = (await pdf.getPageIndex(dest[0])) + 1;
                }
              } catch (e) { console.warn("Could not resolve named destination:", item.href, e); }
            } else if (Array.isArray(item.href)) { // Explicit destination (already a ref)
                try {
                    if(item.href[0]) {
                         pageNum = (await pdf.getPageIndex(item.href[0])) + 1;
                    }
                } catch(e) { console.warn("Could not resolve explicit destination ref:", item.href, e); }
            }
            return { ...item, pageNumber: pageNum };
          }));
          updateCurrentFileToc(tocWithPageNumbers);
        } else {
          updateCurrentFileToc([]);
        }
        
        await renderPage(1);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadPdf();
    
    // Cleanup
    return () => {
      pdfDocRef.current = null; // Clear ref on unmount or file change
    };

  }, [file, updateCurrentFileToc, renderPage]); // renderPage added as dependency

  useEffect(() => {
    if (pdfDocRef.current && currentPage && !loading) {
      renderPage(currentPage);
    }
  }, [currentPage, scale, loading, renderPage]);


  // Expose navigation function for TOC panel
  useEffect(() => {
    const handleNavigationRequest = (event: CustomEvent) => {
      if (event.detail && pdfDocRef.current && currentFile?.id === file.id) {
        if (typeof event.detail.location === 'number') { // Expecting page number for PDF
            goToPage(event.detail.location);
        }
      }
    };
    window.addEventListener('navigate-to-pdf-location', handleNavigationRequest as EventListener);
    return () => window.removeEventListener('navigate-to-pdf-location', handleNavigationRequest as EventListener);
  }, [file.id, currentFile?.id]);


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

  const searchInPdf = async () => { /* ... existing search logic ... */ };

  const getThemeStyles = () => {
    switch (preferences.theme) {
      case 'dark': return { backgroundColor: '#1a1a1a', filter: 'invert(1) hue-rotate(180deg)' }; // Adjusted for PDF
      case 'sepia': return { backgroundColor: '#f4f1ea', filter: 'sepia(0.8)' }; // Adjusted for PDF
      default: return { backgroundColor: '#ffffff', filter: 'none' };
    }
  };
  
  const progressPercentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  if (loading) { /* ... loading UI ... */ }
  if (error) { /* ... error UI ... */ }

  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button onClick={prevPage} disabled={currentPage <= 1} size="sm"><ChevronLeft className="w-4 h-4" /></Button>
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <Input type="text" value={pageInput} onChange={handlePageInputChange} className="w-12 h-8 text-center text-xs" />
            <span className="text-xs text-muted-foreground">of {totalPages}</span>
          </form>
          <Button onClick={nextPage} disabled={currentPage >= totalPages} size="sm"><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={zoomOut} size="sm" variant="outline"><ZoomOut className="w-4 h-4" /></Button>
          <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button onClick={zoomIn} size="sm" variant="outline"><ZoomIn className="w-4 h-4" /></Button>
        </div>
        <div className="flex items-center gap-1">
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-32 h-8 text-xs" />
          <Button onClick={searchInPdf} size="sm"><Search className="w-4 h-4" /></Button>
        </div>
      </div>
      
      <div className="px-4 py-1 border-b flex items-center gap-2">
        <span className="text-xs font-medium">Progress:</span>
        <Progress value={progressPercentage} className="flex-1 h-1.5" />
        <span className="text-xs text-muted-foreground min-w-[2.5rem]">{progressPercentage}%</span>
      </div>

      {searchResults.length > 0 && ( /* ... search results UI ... */ )}
      
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start" style={getThemeStyles()}>
        <canvas ref={canvasRef} className="max-w-full h-auto shadow-lg border" />
      </div>
    </div>
  );
};
