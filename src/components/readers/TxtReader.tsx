// src/components/readers/TxtReader.tsx
import { useEffect, useState, useRef, useCallback }_ from 'react';
import { useEbook, EbookFile } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { TocItem } from '@/types/toc'; // Import TocItem

interface TxtReaderProps {
  file: EbookFile;
  requestNavigation: (location: string | number) => void; // Callback for TOC navigation
}

export const TxtReader = ({ file, requestNavigation }: TxtReaderProps) => {
  const { preferences, updateCurrentFileToc } = useEbook();
  const { updateProgress, addAnnotation } = useAnnotations();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [currentLine, setCurrentLine] = useState(0); // 0-indexed
  const [totalLines, setTotalLines] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const linesPerPage = 20; // Approximate lines per "page"

  // Basic TOC generation for TXT (e.g., every N lines or by chapter keyword)
  const generateTxtToc = useCallback((text: string): TocItem[] => {
    const lines = text.split('\n');
    const toc: TocItem[] = [];
    const chapterRegex = /^(chapter\s+\d+|part\s+\d+|[IVXLCDM]+\.\s+)/i; // Basic chapter detection

    // Option 1: By Chapter Keyword
    lines.forEach((line, index) => {
      if (chapterRegex.test(line.trim())) {
        toc.push({
          id: `line-${index}`,
          label: line.trim().substring(0, 50), // Truncate long labels
          lineNumber: index + 1, // 1-indexed for display/navigation
        });
      }
    });

    // Option 2: Fallback to every N lines if no chapters found
    if (toc.length === 0 && lines.length > linesPerPage * 2) { // Only if book is reasonably long
      for (let i = 0; i < lines.length; i += Math.max(linesPerPage * 2, Math.floor(lines.length / 10)) ) { // at least 10 items or 2 pages
        toc.push({
          id: `line-${i}`,
          label: `Section starting line ${i + 1}`,
          lineNumber: i + 1,
        });
      }
    }
    
    // Ensure at least one item if content exists
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
        setCurrentLine(0); // Reset to start
        
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

  const scrollToLine = useCallback((lineNumber: number) => { // lineNumber is 1-indexed
    const targetLine = Math.max(0, Math.min(lineNumber - 1, totalLines - 1)); // Convert to 0-indexed and clamp
    setCurrentLine(targetLine);
    if (contentRef.current) {
      // Attempt to scroll the specific line into view if possible
      const lineElement = contentRef.current.querySelector(`[data-line-number="${targetLine}"]`);
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        // Fallback: scroll based on approximate line height
        const lineHeight = parseFloat(getComputedStyle(contentRef.current).lineHeight) || 24;
        contentRef.current.scrollTop = targetLine * lineHeight;
      }
    }
  }, [totalLines]);
  
  // Update progress
  useEffect(() => {
    const percentage = totalLines > 0 ? Math.round(((currentLine + 1) / totalLines) * 100) : 0;
    updateProgress(file.id, {
      line: currentLine + 1, // 1-indexed for progress
      percentage,
      offset: 0 
    });
  }, [currentLine, totalLines, file.id, updateProgress]);

  // Listen for navigation events
  useEffect(() => {
    const handleNavigate = (event: CustomEvent) => {
      if (event.detail && currentFile?.id === file.id) {
        if (typeof event.detail.location === 'number') { // Expecting line number for TXT
          scrollToLine(event.detail.location);
        }
      }
    };
    window.addEventListener('navigate-to-txt-location', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate-to-txt-location', handleNavigate as EventListener);
  }, [file.id, currentFile?.id, scrollToLine]);


  const handleTextSelection = () => { /* ... existing selection logic ... */ };
  const addHighlight = () => { /* ... existing highlight logic ... */ };
  const addNote = () => { /* ... existing note logic ... */ };

  const nextPage = () => scrollToLine(currentLine + 1 + linesPerPage);
  const prevPage = () => scrollToLine(currentLine + 1 - linesPerPage);

  if (loading) { /* ... loading UI ... */ }

  const getThemeStyles = () => { /* ... existing theme styles ... */ };
  const progressPercentage = totalLines > 0 ? Math.round(((currentLine + 1) / totalLines) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b gap-2">
        <Button onClick={prevPage} disabled={currentLine <= 0} size="sm"><ChevronUp className="w-4 h-4 mr-1" /> Prev</Button>
        <div className="flex items-center gap-2 text-xs">
          <span>Line {currentLine + 1} of {totalLines}</span>
          {selectedText && ( /* ... selection actions ... */ )}
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
          {/* Render lines with data-line-number for precise scrolling if needed */}
          {content.split('\n').map((line, index) => (
            <div key={index} data-line-number={index} className="whitespace-pre-wrap">
              {line || <br />} {/* Render a break for empty lines to maintain spacing */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
