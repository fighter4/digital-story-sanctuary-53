
import { useEffect, useRef, useState } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
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

  useEffect(() => {
    if (!viewerRef.current || !file.file) return;

    const loadEpub = async () => {
      try {
        const arrayBuffer = await file.file.arrayBuffer();
        const newBook = ePub(arrayBuffer);
        const newRendition = newBook.renderTo(viewerRef.current!, {
          width: '100%',
          height: '100%',
          spread: 'none'
        });

        await newRendition.display();
        setBook(newBook);
        setRendition(newRendition);

        // Start reading session
        startSession(file.id);

        // Track location changes for progress
        newRendition.on('relocated', (location: any) => {
          const percentage = Math.round(location.start.percentage * 100);
          updateProgress(file.id, {
            cfi: location.start.cfi,
            percentage
          });
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
    if (rendition) {
      rendition.prev();
    }
  };

  const handleNextPage = () => {
    if (rendition) {
      rendition.next();
    }
  };

  return (
    <div className="flex-1 overflow-hidden relative">
      <div 
        ref={viewerRef} 
        className="w-full h-full"
        style={{ height: 'calc(100vh - 8rem)' }}
      />
      
      {/* Navigation overlay */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div 
          className="w-1/3 h-full cursor-pointer pointer-events-auto"
          onClick={handlePrevPage}
        />
        <div className="w-1/3 h-full" />
        <div 
          className="w-1/3 h-full cursor-pointer pointer-events-auto"
          onClick={handleNextPage}
        />
      </div>
    </div>
  );
};
