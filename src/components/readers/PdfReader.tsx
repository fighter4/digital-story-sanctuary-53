
import { useEffect, useRef, useState } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PdfReaderProps {
  file: EbookFile;
}

export const PdfReader = ({ file }: PdfReaderProps) => {
  const { preferences } = useEbook();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

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

  const renderPage = async (pdf: any, pageNum: number) => {
    if (!canvasRef.current) return;

    const page = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    const viewport = page.getViewport({ scale: 1.5 });
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
      renderPage(pdfDoc, pageNum);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <button 
          onClick={prevPage}
          disabled={currentPage <= 1}
          className="px-3 py-1 bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          onClick={nextPage}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto shadow-lg"
          style={{
            filter: preferences.theme === 'sepia' ? 'sepia(1)' : 'none',
            backgroundColor: preferences.theme === 'dark' ? '#1a1a1a' : '#ffffff'
          }}
        />
      </div>
    </div>
  );
};
