
import { useEffect, useRef, useState } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ePub from 'epubjs';

interface EpubReaderProps {
  file: EbookFile;
}

export const EpubReader = ({ file }: EpubReaderProps) => {
  const { preferences } = useEbook();
  const { updateProgress, startSession, endSession } = useAnnotations();
  const viewerRef = useRef<HTMLDivElement>(null);
  const [book, setBook] = useState<any>(null);
  const [rendition, setRendition] = useState<any>(null);
  const [canGoPrev, setCanGoPrev] = useState(false);
  const [canGoNext, setCanGoNext] = useState(true);

  useEffect(() => {
    if (!viewerRef.current || !file.file) return;

    const loadEpub = async () => {
      try {
        const arrayBuffer = await file.file.arrayBuffer();
        const newBook = ePub(arrayBuffer);
        const newRendition = newBook.renderTo(viewerRef.current!, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated'
        });

        await newRendition.display();
        setBook(newBook);
        setRendition(newRendition);

        // Start reading session
        startSession(file.id);

        // Track location changes for progress and navigation state
        newRendition.on('relocated', (location: any) => {
          const percentage = Math.round(location.start.percentage * 100);
          updateProgress(file.id, {
            cfi: location.start.cfi,
            percentage
          });

          // Update navigation state
          setCanGoPrev(!location.atStart);
          setCanGoNext(!location.atEnd);
        });

      } catch (error) {
        console.error('Error loading EPUB:', error);
      }
    };

    loadEpub();

    return () => {
      if (rendition) {
        rendition.destroy();
      }
      endSession();
    };
  }, [file]);

  useEffect(() => {
    if (rendition) {
      // Apply reading preferences
      rendition.themes.fontSize(`${preferences.fontSize}px`);
      rendition.themes.font(preferences.fontFamily);
      
      if (preferences.theme === 'dark') {
        rendition.themes.override('color', '#ffffff');
        rendition.themes.override('background', '#1a1a1a');
      } else if (preferences.theme === 'sepia') {
        rendition.themes.override('color', '#5c4b37');
        rendition.themes.override('background', '#f4f1ea');
      } else {
        rendition.themes.override('color', '#000000');
        rendition.themes.override('background', '#ffffff');
      }
    }
  }, [rendition, preferences]);

  const handlePrevPage = () => {
    if (rendition && canGoPrev) {
      rendition.prev();
    }
  };

  const handleNextPage = () => {
    if (rendition && canGoNext) {
      rendition.next();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* EPUB Content Container */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={viewerRef} 
          className="w-full h-full"
          style={{ 
            height: 'calc(100vh - 12rem)',
            maxWidth: '100%',
            margin: '0 auto'
          }}
        />
        
        {/* Invisible navigation areas for click navigation */}
        <div className="absolute inset-0 flex pointer-events-none">
          <div 
            className="w-1/3 h-full cursor-pointer pointer-events-auto"
            onClick={handlePrevPage}
            style={{ opacity: canGoPrev ? 1 : 0.3 }}
          />
          <div className="w-1/3 h-full" />
          <div 
            className="w-1/3 h-full cursor-pointer pointer-events-auto"
            onClick={handleNextPage}
            style={{ opacity: canGoNext ? 1 : 0.3 }}
          />
        </div>
      </div>
      
      {/* Navigation Controls */}
      <div className="flex justify-between items-center p-4 border-t bg-background">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Click left/right sides of the page or use buttons to navigate
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={!canGoNext}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
