import { useEffect, useState, useRef } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TxtReaderProps {
  file: EbookFile;
}

export const TxtReader = ({ file }: TxtReaderProps) => {
  const { preferences } = useEbook();
  const { updateProgress, addAnnotation } = useAnnotations();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentLine, setCurrentLine] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lines = content.split('\n');

  useEffect(() => {
    if (!file.file) return;

    const loadText = async () => {
      try {
        setLoading(true);
        const text = await file.file.text();
        setContent(text);
        const lineCount = text.split('\n').length;
        setTotalLines(lineCount);
      } catch (error) {
        console.error('Error loading text file:', error);
        setContent('Error loading file');
      } finally {
        setLoading(false);
      }
    };

    loadText();
  }, [file]);

  useEffect(() => {
    // Update reading progress
    const percentage = totalLines > 0 ? Math.round((currentLine / totalLines) * 100) : 0;
    updateProgress(file.id, {
      line: currentLine,
      percentage,
      offset: 0
    });
  }, [currentLine, totalLines, file.id, updateProgress]);

  useEffect(() => {
    // Listen for navigation events from search
    const handleNavigateToLine = (event: CustomEvent) => {
      const { line } = event.detail;
      scrollToLine(line - 1); // Convert to 0-based index
    };

    window.addEventListener('navigate-to-line', handleNavigateToLine as EventListener);
    return () => {
      window.removeEventListener('navigate-to-line', handleNavigateToLine as EventListener);
    };
  }, []);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      setSelectedText(selectedText);
      
      // Calculate selection range
      const range = selection.getRangeAt(0);
      setSelectionRange({
        start: range.startOffset,
        end: range.endOffset
      });
    } else {
      setSelectedText('');
      setSelectionRange(null);
    }
  };

  const addHighlight = () => {
    if (selectedText && selectionRange) {
      addAnnotation({
        fileId: file.id,
        type: 'highlight',
        content: selectedText,
        position: {
          line: currentLine,
          offset: selectionRange.start,
          percentage: Math.round((currentLine / totalLines) * 100)
        },
        color: '#fef3c7'
      });
      setSelectedText('');
      setSelectionRange(null);
    }
  };

  const addNote = () => {
    if (selectedText && selectionRange) {
      const note = prompt('Add a note:');
      if (note) {
        addAnnotation({
          fileId: file.id,
          type: 'note',
          content: selectedText,
          note,
          position: {
            line: currentLine,
            offset: selectionRange.start,
            percentage: Math.round((currentLine / totalLines) * 100)
          },
          color: '#dbeafe'
        });
        setSelectedText('');
        setSelectionRange(null);
      }
    }
  };

  const scrollToLine = (lineNumber: number) => {
    setCurrentLine(Math.max(0, Math.min(lineNumber, totalLines - 1)));
    if (contentRef.current) {
      const lineHeight = 24; // Approximate line height
      contentRef.current.scrollTop = lineNumber * lineHeight;
    }
  };

  const nextPage = () => {
    const linesPerPage = 20;
    scrollToLine(currentLine + linesPerPage);
  };

  const prevPage = () => {
    const linesPerPage = 20;
    scrollToLine(currentLine - linesPerPage);
  };

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
    <div className="flex-1 flex flex-col">
      {/* Navigation controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button onClick={prevPage} disabled={currentLine <= 0} size="sm">
          <ChevronUp className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <div className="flex items-center gap-4">
          <span className="text-sm">
            Line {currentLine + 1} of {totalLines}
          </span>
          {selectedText && (
            <div className="flex gap-2">
              <Button onClick={addHighlight} size="sm" variant="outline">
                Highlight
              </Button>
              <Button onClick={addNote} size="sm" variant="outline">
                Add Note
              </Button>
            </div>
          )}
        </div>
        <Button onClick={nextPage} disabled={currentLine >= totalLines - 20} size="sm">
          Next
          <ChevronDown className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        <div 
          ref={contentRef}
          className={`p-8 min-h-full ${getThemeStyles()}`}
          style={{
            fontSize: `${preferences.fontSize}px`,
            fontFamily: preferences.fontFamily,
            lineHeight: '1.6'
          }}
          onMouseUp={handleTextSelection}
          data-reader-content
        >
          <pre className="whitespace-pre-wrap font-inherit">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
};
