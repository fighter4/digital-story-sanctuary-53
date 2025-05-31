
import { useEffect, useRef, useState } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import ePub from 'epub.js';

interface EpubReaderProps {
  file: EbookFile;
}

export const EpubReader = ({ file }: EpubReaderProps) => {
  const { preferences } = useEbook();
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
      } catch (error) {
        console.error('Error loading EPUB:', error);
      }
    };

    loadEpub();

    return () => {
      if (rendition) {
        rendition.destroy();
      }
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

  return (
    <div className="flex-1 overflow-hidden">
      <div 
        ref={viewerRef} 
        className="w-full h-full"
        style={{ height: 'calc(100vh - 4rem)' }}
      />
    </div>
  );
};
