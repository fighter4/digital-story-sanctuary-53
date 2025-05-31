
import { useEffect, useRef, useState } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfReaderProps {
  file: EbookFile;
}

export const PdfReader = ({ file }: PdfReaderProps) => {
  const { preferences } = useEbook();
  const { updateProgress } = useAnnotations();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [pageInput, setPageInput] = useState('1');

  useEffect(() => {
    if (!canvasRef.current || !file.file) return;

    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        renderPage(pdf, 1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPdf();
  }, [file]);

  useEffect(() => {
    if (pdfDoc && currentPage) {
      renderPage(pdfDoc, currentPage);
      // Update reading progress
      const percentage = Math.round((currentPage / totalPages) * 100);
      updateProgress(file.id, {
        page: currentPage,
        percentage
      });
    }
  }, [currentPage, scale, pdfDoc, totalPages, file.id, updateProgress]);

  const renderPage = async (pdf: any, pageNum: number) => {
    if (!canvasRef.current) return;

    const page = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
  };

  const goToPage = (pageNum: number) => {
    if (pdfDoc && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setPageInput(pageNum.toString());
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (!isNaN(pageNum)) {
      goToPage(pageNum);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));

  const searchInPdf = async () => {
    if (!pdfDoc || !searchTerm.trim()) return;

    const results = [];
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      
      if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push({
          page: i,
          text: text.substring(0, 200) + '...'
        });
      }
    }
    setSearchResults(results);
  };

  const getThemeStyles = () => {
    switch (preferences.theme) {
      case 'dark':
        return { backgroundColor: '#1a1a1a', filter: 'invert(1)' };
      case 'sepia':
        return { backgroundColor: '#f4f1ea', filter: 'sepia(1)' };
      default:
        return { backgroundColor: '#ffffff', filter: 'none' };
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top controls */}
      <div className="flex items-center justify-between p-4 border-b gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={prevPage} disabled={currentPage <= 1} size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
            <Input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              className="w-16 text-center"
              size={1}
            />
            <span className="text-sm">of {totalPages}</span>
          </form>
          
          <Button onClick={nextPage} disabled={currentPage >= totalPages} size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={zoomOut} size="sm" variant="outline">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button onClick={zoomIn} size="sm" variant="outline">
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            placeholder="Search in PDF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-40"
          />
          <Button onClick={searchInPdf} size="sm">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="p-2 border-b bg-muted max-h-32 overflow-y-auto">
          <div className="text-sm font-medium mb-2">Search Results ({searchResults.length})</div>
          {searchResults.map((result, index) => (
            <div
              key={index}
              className="text-xs p-2 hover:bg-accent cursor-pointer rounded"
              onClick={() => goToPage(result.page)}
            >
              <span className="font-medium">Page {result.page}:</span> {result.text}
            </div>
          ))}
        </div>
      )}
      
      {/* PDF content */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto shadow-lg"
          style={getThemeStyles()}
        />
      </div>
    </div>
  );
};
