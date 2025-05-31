
import { useEffect, useState } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';

interface TxtReaderProps {
  file: EbookFile;
}

export const TxtReader = ({ file }: TxtReaderProps) => {
  const { preferences } = useEbook();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!file.file) return;

    const loadText = async () => {
      try {
        setLoading(true);
        const text = await file.file.text();
        setContent(text);
      } catch (error) {
        console.error('Error loading text file:', error);
        setContent('Error loading file');
      } finally {
        setLoading(false);
      }
    };

    loadText();
  }, [file]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const getThemeStyles = () => {
    switch (preferences.theme) {
      case 'dark':
        return 'bg-gray-900 text-white';
      case 'sepia':
        return 'bg-yellow-50 text-yellow-900';
      default:
        return 'bg-white text-black';
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div 
        className={`p-8 min-h-full ${getThemeStyles()}`}
        style={{
          fontSize: `${preferences.fontSize}px`,
          fontFamily: preferences.fontFamily,
          lineHeight: '1.6'
        }}
      >
        <pre className="whitespace-pre-wrap font-inherit">
          {content}
        </pre>
      </div>
    </div>
  );
};
