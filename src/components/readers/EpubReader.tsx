
import { useEffect, useRef, useState } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ePub from 'epubjs';

interface EpubReaderProps {
  file: EbookFile;
}

export const EpubReader = ({ file }: EpubReaderProps) => {
  const { preferences } = useEbook();
  const { updateProgress, startSession, endSession, addAnnotation } = useAnnotations();
  const viewerRef = useRef<HTMLDivElement>(null);
  const [book, setBook] = useState<any>(null);
  const [rendition, setRendition] = useState<any>(null);
  const [canGoPrev, setCanGoPrev] = useState(false);
  const [canGoNext, setCanGoNext] = useState(true);
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    if (!viewerRef.current || !file.file) return;

    const loadEpub = async () => {
      try {
        const arrayBuffer = await file.file.arrayBuffer();
        const newBook = ePub(arrayBuffer);
        
        // Get container dimensions - use actual container size
        const container = viewerRef.current!;
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        
        const newRendition = newBook.renderTo(viewerRef.current!, {
          width: containerWidth,
          height: containerHeight,
          spread: 'none',
          flow: 'paginated',
          allowScriptedContent: false
        });

        await newRendition.display();
        setBook(newBook);
        setRendition(newRendition);

        // Start reading session
        startSession(file.id);

        // Track location changes for progress and navigation state
        newRendition.on('relocated', (location: any) => {
          const percentage = Math.round(location.start.percentage * 100);
          setCurrentProgress(percentage);
          updateProgress(file.id, {
            cfi: location.start.cfi,
            percentage
          });

          // Update navigation state
          setCanGoPrev(!location.atStart);
          setCanGoNext(!location.atEnd);
        });

        // Handle text selection for highlighting
        newRendition.on('selected', (cfiRange: string, contents: any) => {
          const selection = contents.window.getSelection();
          if (selection && selection.toString().trim()) {
            const selectedText = selection.toString().trim();
            
            // Add highlight annotation
            addAnnotation({
              fileId: file.id,
              type: 'highlight',
              content: selectedText,
              position: {
                cfi: cfiRange,
                percentage: currentProgress
              },
              color: preferences.highlightColor
            });

            // Apply highlight to the content
            newRendition.annotations.add('highlight', cfiRange, {}, null, 'highlight-annotation', {
              'background-color': preferences.highlightColor,
              'padding': '2px 0'
            });
          }
        });

        // Handle resize to maintain proper sizing
        const handleResize = () => {
          if (newRendition && viewerRef.current) {
            const newWidth = viewerRef.current.offsetWidth;
            const newHeight = viewerRef.current.offsetHeight;
            newRendition.resize(newWidth, newHeight);
          }
        };

        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
        };

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

  // Apply theme to the entire reader container
  const getThemeClasses = () => {
    switch (preferences.theme) {
      case 'dark':
        return 'bg-gray-900 text-white';
      case 'sepia':
        return 'bg-amber-50 text-amber-900';
      default:
        return 'bg-white text-black';
    }
  };

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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (event.key === 'ArrowRight') {
        handleNextPage();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [rendition, canGoPrev, canGoNext]);

  return (
    <div className={`flex-1 flex flex-col h-full max-h-full overflow-hidden ${getThemeClasses()}`}>
      {/* Progress Bar */}
      <div className="px-4 py-2 border-b flex items-center gap-4">
        <span className="text-sm font-medium">Progress:</span>
        <Progress value={currentProgress} className="flex-1 h-2" />
        <span className="text-sm text-muted-foreground min-w-[3rem]">{currentProgress}%</span>
      </div>

      {/* EPUB Content Container */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={viewerRef} 
          className="w-full h-full"
          style={{ 
            height: '100%',
            width: '100%'
          }}
        />
        
        {/* Click navigation areas */}
        <div className="absolute inset-0 flex pointer-events-none">
          <div 
            className="w-1/3 h-full cursor-pointer pointer-events-auto hover:bg-black hover:bg-opacity-5 transition-colors"
            onClick={handlePrevPage}
            style={{ opacity: canGoPrev ? 1 : 0.3 }}
            title="Previous page"
          />
          <div className="w-1/3 h-full" />
          <div 
            className="w-1/3 h-full cursor-pointer pointer-events-auto hover:bg-black hover:bg-opacity-5 transition-colors"
            onClick={handleNextPage}
            style={{ opacity: canGoNext ? 1 : 0.3 }}
            title="Next page"
          />
        </div>
      </div>
      
      {/* Navigation Controls - Always visible at bottom */}
      <div className={`flex justify-between items-center p-4 border-t flex-shrink-0 min-h-[60px] ${getThemeClasses()}`}>
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
        
        <div className="text-sm text-muted-foreground text-center">
          Click left/right sides of the page, use arrow keys, or these buttons to navigate
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
