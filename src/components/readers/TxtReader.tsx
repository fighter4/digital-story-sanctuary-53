// src/components/readers/TxtReader.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { TocItem } from '@/types/toc';

interface TxtReaderProps {
  file: EbookFile;
  requestNavigation?: (location: string | number) => void;
}

export const TxtReader = ({ file }: TxtReaderProps) => {
  const { preferences, updateCurrentFileToc, currentFile } = useEbook(); // Correctly destructure currentFile
  const { updateProgress, addAnnotation } = useAnnotations();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentLine, setCurrentLine] = useState(0);
  const [totalLines, setTotalLines] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const linesPerPage = 20; 

  const generateTxtToc = useCallback((text: string): TocItem[] => {
    const lines = text.split('\n');
    const toc: TocItem[] = [];
    const chapterRegex = /^(chapter\s+\d+|part\s+\d+|[IVXLCDM]+\.\s+)/i;

    lines.forEach((line, index) => {
      if (chapterRegex.test(line.trim())) {
        toc.push({
          id: `line-${index}`,
          label: line.trim().substring(0, 50),
          lineNumber: index + 1,
        });
      }
    });

    if (toc.length === 0 && lines.length > linesPerPage * 2) {
      for (let i = 0; i < lines.length; i += Math.max(linesPerPage * 2, Math.floor(lines.length / 10))) {
        toc.push({
          id: `line-${i}`,
          label: `Section starting line ${i + 1}`,
          lineNumber: i + 1,
        });
      }
    }
    
    if (toc.length === 0 && lines.length > 0) {
        toc.push({ id: 'line-0', label: 'Beginning', lineNumber: 1 });
    }
    return toc;
  }, [linesPerPage]);

  useEffect(() => {
    if (!file.file) return;
    setLoading(true);
    const loadText = async () => {
      try {
        const text = await file.file.text();
        setContent(text);
        const lines = text.split('\n');
        setTotalLines(lines.length);
        setCurrentLine(0);
        
        const toc = generateTxtToc(text);
        updateCurrentFileToc(toc);
      } catch (error) {
        console.error('Error loading text file:', error);
        setContent('Error loading file');
      } finally {
        setLoading(false);
      }
    };
    loadText();
  }, [file, generateTxtToc, updateCurrentFileToc]);

  const scrollToLine = useCallback((lineNumberOneIndexed: number) => {
    const targetLineZeroIndexed = Math.max(0, Math.min(lineNumberOneIndexed - 1, totalLines - 1));
    setCurrentLine(targetLineZeroIndexed);
    if (contentRef.current) {
      const lineElement = contentRef.current.querySelector(`[data-line-number="${targetLineZeroIndexed}"]`);
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const lineHeightStyle = getComputedStyle(contentRef.current).lineHeight;
        const lineHeight = parseFloat(lineHeightStyle) || (preferences.fontSize * 1.7); // Fallback based on font size
        contentRef.current.scrollTop = targetLineZeroIndexed * lineHeight;
      }
    }
  }, [totalLines, preferences.fontSize]);
  
  useEffect(() => {
    if (totalLines > 0) { // Ensure totalLines is set
        const percentage = Math.round(((currentLine + 1) / totalLines) * 100);
        updateProgress(file.id, {
        line: currentLine + 1,
        percentage,
        offset: 0 
        });
    }
  }, [currentLine, totalLines, file.id, updateProgress]);

  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      // Use `currentFile` from the hook's scope
      if (event.detail && currentFile?.id === file.id) {
        if (typeof event.detail.location === 'number') {
          scrollToLine(event.detail.location);
        }
      }
    };
    window.addEventListener('navigate-to-txt-location', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate-to-txt-location', handleNavigate as EventListener);
  }, [file.id, currentFile, scrollToLine]); // Depend on `currentFile` and `scrollToLine`

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      const range = selection.getRangeAt(0);
      // For TXT, offset might be relative to the start of the visible block or entire content.
      // This is a simplified version.
      setSelectionRange({ start: range.startOffset, end: range.endOffset });
    } else {
      setSelectedText('');
      setSelectionRange(null);
    }
  };

  const handleAddAnnotation = (type: 'highlight' | 'note') => {
    if (selectedText && selectionRange && currentFile) {
      let noteContent: string | undefined = undefined;
      if (type === 'note') {
        noteContent = prompt('Add a note:');
        if (noteContent === null) return; // User cancelled
      }
      addAnnotation({
        fileId: currentFile.id,
        type: type,
        content: selectedText,
        note: noteContent,
        position: {
          line: currentLine + 1, // Store 1-indexed line
          offset: selectionRange.start,
          percentage: Math.round(((currentLine + 1) / totalLines) * 100)
        },
        color: type === 'highlight' ? preferences.highlightColor : '#dbeafe' // Default blue for notes
      });
      setSelectedText('');
      setSelectionRange(null);
    }
  };


  const nextPage = () => scrollToLine(currentLine + 1 + linesPerPage);
  const prevPage = () => scrollToLine(currentLine + 1 - linesPerPage);

  const getThemeStyles = () => {
    switch (preferences.theme) {
      case 'dark': return 'bg-gray-900 text-white';
      case 'sepia': return 'bg-yellow-50 text-yellow-900';
      default: return 'bg-white text-black';
    }
  };
  const progressPercentage = totalLines > 0 ? Math.round(((currentLine + 1) / totalLines) * 100) : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading TXT...</p>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b gap-2">
        <Button onClick={prevPage} disabled={currentLine <= 0} size="sm"><ChevronUp className="w-4 h-4 mr-1" /> Prev</Button>
        <div className="flex items-center gap-2 text-xs">
          <span>Line {currentLine + 1} of {totalLines}</span>
          {selectedText && (
            <div className="flex gap-1">
              <Button onClick={() => handleAddAnnotation('highlight')} size="xs" variant="outline">Highlight</Button>
              <Button onClick={() => handleAddAnnotation('note')} size="xs" variant="outline">Note</Button>
            </div>
          )}
        </div>
        <Button onClick={nextPage} disabled={currentLine + linesPerPage >= totalLines} size="sm">Next <ChevronDown className="w-4 h-4 ml-1" /></Button>
      </div>
      
      <div className="px-4 py-1 border-b flex items-center gap-2">
        <span className="text-xs font-medium">Progress:</span>
        <Progress value={progressPercentage} className="flex-1 h-1.5" />
        <span className="text-xs text-muted-foreground min-w-[2.5rem]">{progressPercentage}%</span>
      </div>

      <div className="flex-1 overflow-auto" ref={contentRef} onMouseUp={handleTextSelection} data-reader-content>
        <div 
          className={`p-4 md:p-6 min-h-full ${getThemeStyles()}`}
          style={{ fontSize: `${preferences.fontSize}px`, fontFamily: preferences.fontFamily, lineHeight: '1.7' }}
        >
          {content.split('\n').map((line, index) => (
            <div key={index} data-line-number={index} className="whitespace-pre-wrap">
              {line || <br />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
