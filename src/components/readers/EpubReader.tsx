// src/components/readers/EpubReader.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ePub, { NavItem } from 'epubjs';
import { TocItem } from '@/types/toc';

interface EpubReaderProps {
  file: EbookFile;
  // requestNavigation prop is not strictly needed if using global events,
  // but kept for potential future direct communication.
  requestNavigation?: (location: string | number) => void; 
}

export const EpubReader = ({ file }: EpubReaderProps) => {
  // Correctly destructure currentFile from useEbook
  const { preferences, updateCurrentFileToc, currentFile } = useEbook(); 
  const { updateProgress, startSession, endSession, addAnnotation } = useAnnotations();
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);

  const [canGoPrev, setCanGoPrev] = useState(false);
  const [canGoNext, setCanGoNext] = useState(true);
  const [currentProgressState, setCurrentProgressState] = useState(0); // Renamed to avoid conflict
  const [isLoading, setIsLoading] = useState(true);

  const transformNavItemsToToc = (navItems: NavItem[]): TocItem[] => {
    return navItems.map((item: NavItem) => ({
      id: item.id || item.href,
      label: item.label.trim(),
      href: item.href,
      subitems: item.subitems ? transformNavItemsToToc(item.subitems) : [],
    }));
  };

  useEffect(() => {
    const handleNavigationRequest = (event: CustomEvent) => {
      // Use `currentFile` from the hook's scope
      if (event.detail && renditionRef.current && currentFile?.id === file.id) {
         if (typeof event.detail.location === 'string') {
            renditionRef.current.display(event.detail.location);
        }
      }
    };
    window.addEventListener('navigate-to-epub-location', handleNavigationRequest as EventListener);
    return () => window.removeEventListener('navigate-to-epub-location', handleNavigationRequest as EventListener);
  }, [file.id, currentFile]); // Depend on `currentFile` object itself

  useEffect(() => {
    if (!viewerRef.current || !file.file) return;
    setIsLoading(true);
    let newBook: any;
    let newRendition: any;

    const loadEpub = async () => {
      try {
        const arrayBuffer = await file.file.arrayBuffer();
        newBook = ePub(arrayBuffer);
        bookRef.current = newBook;
        
        const container = viewerRef.current!;
        // Ensure container has dimensions before rendering
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
            // Wait for layout or use a fixed size as fallback
            await new Promise(resolve => setTimeout(resolve, 100)); // Simple delay
            if (container.offsetWidth === 0 || container.offsetHeight === 0) {
                console.warn("EPUB container has no dimensions. Reader may not display correctly.");
            }
        }
        const containerWidth = container.offsetWidth || 600; // Fallback width
        const containerHeight = container.offsetHeight || 800; // Fallback height
        
        newRendition = newBook.renderTo(container, {
          width: containerWidth,
          height: containerHeight,
          spread: 'none',
          flow: 'paginated',
          allowScriptedContent: false
        });
        renditionRef.current = newRendition;

        await newRendition.display();
        
        const navigation = await newBook.loaded.navigation;
        if (navigation && navigation.toc) {
          const toc = transformNavItemsToToc(navigation.toc);
          updateCurrentFileToc(toc);
        } else {
          updateCurrentFileToc([]);
        }

        startSession(file.id);

        newRendition.on('relocated', (location: any) => {
          const percentage = Math.round(location.start.percentage * 100);
          setCurrentProgressState(percentage);
          updateProgress(file.id, {
            cfi: location.start.cfi,
            percentage
          });
          setCanGoPrev(!location.atStart);
          setCanGoNext(!location.atEnd);
        });

        newRendition.on('selected', (cfiRange: string, contents: any) => {
          const selection = contents.window.getSelection();
          if (selection && selection.toString().trim()) {
            const selectedText = selection.toString().trim();
            addAnnotation({
              fileId: file.id,
              type: 'highlight',
              content: selectedText,
              position: {
                cfi: cfiRange,
                percentage: currentProgressState 
              },
              color: preferences.highlightColor
            });
            newRendition.annotations.add('highlight', cfiRange, {}, null, 'highlight-annotation', {
              'background-color': preferences.highlightColor,
              'padding': '2px 0'
            });
          }
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading EPUB:', error);
        setIsLoading(false);
      }
    };

    loadEpub();

    const handleResize = () => {
      if (renditionRef.current && viewerRef.current) {
        const newWidth = viewerRef.current.offsetWidth;
        const newHeight = viewerRef.current.offsetHeight;
        if (newWidth > 0 && newHeight > 0) { // Only resize if dimensions are valid
            renditionRef.current.resize(newWidth, newHeight);
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (renditionRef.current) {
        renditionRef.current.destroy();
      }
      endSession();
    };
  }, [file, updateCurrentFileToc, startSession, endSession, addAnnotation, preferences.highlightColor, updateProgress]);

  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${preferences.fontSize}px`);
      renditionRef.current.themes.font(preferences.fontFamily);
      
      if (preferences.theme === 'dark') {
        renditionRef.current.themes.override('color', '#ffffff');
        renditionRef.current.themes.override('background', '#1a1a1a');
      } else if (preferences.theme === 'sepia') {
        renditionRef.current.themes.override('color', '#5c4b37');
        renditionRef.current.themes.override('background', '#f4f1ea');
      } else {
        renditionRef.current.themes.override('color', '#000000');
        renditionRef.current.themes.override('background', '#ffffff');
      }
    }
  }, [renditionRef.current, preferences]);

  const getThemeClasses = () => {
    switch (preferences.theme) {
      case 'dark': return 'bg-gray-900 text-white';
      case 'sepia': return 'bg-amber-50 text-amber-900';
      default: return 'bg-white text-black';
    }
  };

  const handlePrevPage = useCallback(() => {
    if (renditionRef.current && canGoPrev) renditionRef.current.prev();
  }, [canGoPrev]);

  const handleNextPage = useCallback(() => {
    if (renditionRef.current && canGoNext) renditionRef.current.next();
  }, [canGoNext]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') handlePrevPage();
      else if (event.key === 'ArrowRight') handleNextPage();
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handlePrevPage, handleNextPage]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading EPUB...</p>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full max-h-full overflow-hidden ${getThemeClasses()}`}>
      <div className="px-4 py-2 border-b flex items-center gap-4">
        <span className="text-sm font-medium">Progress:</span>
        <Progress value={currentProgressState} className="flex-1 h-2" />
        <span className="text-sm text-muted-foreground min-w-[3rem]">{currentProgressState}%</span>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <div ref={viewerRef} className="w-full h-full" data-reader-content /> {/* Added data-reader-content */}
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
      <div className={`flex justify-between items-center p-4 border-t flex-shrink-0 min-h-[60px] ${getThemeClasses()}`}>
        <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={!canGoPrev} className="flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Previous
        </Button>
        <div className="text-sm text-muted-foreground text-center">
          Click left/right sides, use arrow keys, or buttons to navigate
        </div>
        <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!canGoNext} className="flex items-center gap-2">
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};


