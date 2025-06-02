
import { useEffect, useRef, useState, useCallback } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Search, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { TocItem } from '@/types/toc';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

interface PdfReaderProps {
  file: EbookFile;
  requestNavigation?: (location: string | number) => void;
}

const transformPdfOutlineToToc = async (pdfDoc: any, outline: any[], level = 0): Promise<TocItem[]> => {
  if (!outline) return [];
  
  const tocItems: TocItem[] = [];

  for (const item of outline) {
    let pageNumber: number | undefined;
    if (item.dest) {
      try {
        const destination = await pdfDoc.getDestination(item.dest);
        if (destination && destination[0]) {
          pageNumber = (await pdfDoc.getPageIndex(destination[0])) + 1;
        }
      } catch (e) {
        console.warn("Could not resolve PDF destination:", item.dest, e);
      }
    }

    const tocItem: TocItem = {
      id: item.title + '-' + (pageNumber || level) + '-' + Math.random().toString(16).slice(2),
      label: item.title,
      href: typeof item.dest === 'string' ? item.dest : undefined,
      pageNumber: pageNumber,
      subitems: item.items ? await transformPdfOutlineToToc(pdfDoc, item.items, level + 1) : [],
    };
    tocItems.push(tocItem);
  }
  return tocItems;
};

export const PdfReader = ({ file }: PdfReaderProps) => {
  const { preferences, updateCurrentFileToc, currentFile } = useEbook();
  const { updateProgress } = useAnnotations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);
  
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

      if (totalPages > 0) {
        const percentage = Math.round((pageNum / totalPages) * 100);
        updateProgress(file.id, { page: pageNum, percentage });
      }

    } catch (err) {
      console.error('Error rendering page:', err);
      setError(`Failed to render page ${pageNum}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [scale, totalPages, file.id, updateProgress]);

  useEffect(() => {
    if (!file.file) return;
    setLoading(true);
    setError(null);
    setCurrentPage(1);
    setPageInput('1');

    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        
        const outline = await pdf.getOutline();
        if (outline) {
          const toc = await transformPdfOutlineToToc(pdf, outline);
          updateCurrentFileToc(toc);
        } else {
          updateCurrentFileToc([]);
        }
        
        if (pdf.numPages > 0) {
            await renderPage(1);
        } else {
            setError("PDF has no pages.");
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadPdf();
    
    return () => {
      pdfDocRef.current = null;
    };

  }, [file, updateCurrentFileToc, renderPage]);

  useEffect(() => {
    if (pdfDocRef.current && currentPage && !loading && totalPages > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, scale, loading, totalPages, renderPage]);

  useEffect(() => {
    const handleNavigationRequest = (event: CustomEvent) => {
      if (event.detail && pdfDocRef.current && currentFile?.id === file.id) {
        if (typeof event.detail.location === 'number') {
            goToPage(event.detail.location);
        }
      }
    };
    window.addEventListener('navigate-to-pdf-location', handleNavigationRequest as EventListener);
    return () => window.removeEventListener('navigate-to-pdf-location', handleNavigationRequest as EventListener);
  }, [file.id, currentFile]);

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
    // Search functionality placeholder
  };

  const getThemeStyles = () => {
    switch (preferences.theme) {
      case 'dark': return { backgroundColor: '#1a1a1a', filter: 'invert(1) hue-rotate(180deg)' };
      case 'sepia': return { backgroundColor: '#f4f1ea', filter: 'sepia(0.8)' };
      default: return { backgroundColor: '#ffffff', filter: 'none' };
    }
  };
  
  const progressPercentage = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button onClick={prevPage} disabled={currentPage <= 1} size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <Input 
              type="text" 
              value={pageInput} 
              onChange={handlePageInputChange} 
              className="w-12 h-8 text-center text-xs" 
            />
            <span className="text-xs text-muted-foreground">of {totalPages}</span>
          </form>
          <Button onClick={nextPage} disabled={currentPage >= totalPages} size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button onClick={zoomOut} size="sm" variant="outline">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button onClick={zoomIn} size="sm" variant="outline">
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Input 
            placeholder="Search..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-32 h-8 text-xs" 
          />
          <Button onClick={searchInPdf} size="sm">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="px-4 py-1 border-b flex items-center gap-2">
        <span className="text-xs font-medium">Progress:</span>
        <Progress value={progressPercentage} className="flex-1 h-1.5" />
        <span className="text-xs text-muted-foreground min-w-[2.5rem]">{progressPercentage}%</span>
      </div>

      {searchResults.length > 0 && (
        <div className="border-b p-2">
          <p className="text-sm">Search results: {searchResults.length}</p>
        </div>
      )}
      
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start" style={getThemeStyles()} data-reader-content>
        <canvas ref={canvasRef} className="max-w-full h-auto shadow-lg border" />
      </div>
    </div>
  );
};
