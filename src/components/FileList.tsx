import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEbook, EbookFile } from "@/contexts/EbookContext";
import { useAnnotations } from "@/contexts/AnnotationContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
// import { Badge } from "@/components/ui/badge"; // Not used in this simplified version, but can be added back
import { Book, FileX, Bookmark } from "lucide-react";

// Configuration for virtualization
const ITEM_HEIGHT = 88; // Approximate height of each item in pixels (adjust as needed)
const VISIBLE_ITEMS_BUFFER = 5; // Number of items to render above and below the viewport

export const FileList = () => {
  const { files, currentFile, setCurrentFile, removeFile } = useEbook();
  const { getProgress, getAnnotationsForFile } = useAnnotations();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [visibleEndIndex, setVisibleEndIndex] = useState(Math.min(files.length, Math.ceil(window.innerHeight / ITEM_HEIGHT) + VISIBLE_ITEMS_BUFFER * 2));

  // Function to calculate visible items based on scroll position
  const updateVisibleItems = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, clientHeight } = scrollContainerRef.current;
    const newStartIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - VISIBLE_ITEMS_BUFFER);
    const newEndIndex = Math.min(
      files.length,
      Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT) + VISIBLE_ITEMS_BUFFER
    );

    if (newStartIndex !== visibleStartIndex || newEndIndex !== visibleEndIndex) {
      setVisibleStartIndex(newStartIndex);
      setVisibleEndIndex(newEndIndex);
    }
  }, [files.length, visibleStartIndex, visibleEndIndex]);

  // Effect to update visible items on scroll and resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateVisibleItems);
      window.addEventListener('resize', updateVisibleItems);
      updateVisibleItems(); // Initial calculation
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', updateVisibleItems);
      }
      window.removeEventListener('resize', updateVisibleItems);
    };
  }, [updateVisibleItems]);

  // Reset visible items when files change
   useEffect(() => {
    setVisibleStartIndex(0);
    setVisibleEndIndex(Math.min(files.length, Math.ceil(window.innerHeight / ITEM_HEIGHT) + VISIBLE_ITEMS_BUFFER * 2));
    if(scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  }, [files]);


  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No books yet. Upload some files to get started!
      </div>
    );
  }

  // Get the subset of files to render
  const visibleFiles = files.slice(visibleStartIndex, visibleEndIndex);

  return (
    <div 
      ref={scrollContainerRef} 
      className="space-y-0 p-2 overflow-y-auto" 
      style={{ height: 'calc(100vh - 200px)' }} // Adjust height as needed for your layout
    >
      {/*
        This container sets the total height to enable proper scrollbar behavior.
        Its height is the total number of items multiplied by the item height.
      */}
      <div style={{ height: `${files.length * ITEM_HEIGHT}px`, position: 'relative' }}>
        {visibleFiles.map((file, index) => {
          const actualIndex = visibleStartIndex + index; // The actual index in the `files` array
          const progress = getProgress(file.id);
          const annotations = getAnnotationsForFile(file.id);
          
          return (
            <div
              key={file.id}
              className={`p-3 rounded-md border cursor-pointer transition-colors absolute w-[calc(100%-1rem)]`} // Adjust width for padding
              style={{ 
                top: `${actualIndex * ITEM_HEIGHT}px`, 
                height: `${ITEM_HEIGHT - 4}px`, // -4 for spacing
                left: '0.5rem', // Corresponds to p-2 on parent
                right: '0.5rem',
                backgroundColor: currentFile?.id === file.id ? 'hsl(var(--primary))' : 'transparent',
                color: currentFile?.id === file.id ? 'hsl(var(--primary-foreground))' : 'inherit',
              }}
              onClick={() => setCurrentFile(file)}
              onMouseEnter={(e) => { if (currentFile?.id !== file.id) e.currentTarget.style.backgroundColor = 'hsl(var(--accent))'; }}
              onMouseLeave={(e) => { if (currentFile?.id !== file.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div className="flex items-start justify-between gap-2 h-full">
                <div className="flex items-start gap-2 min-w-0 flex-1 h-full">
                  <Book className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1 flex flex-col justify-between h-full">
                    <div>
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs opacity-70 uppercase">{file.type}</p>
                        {annotations.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Bookmark className="w-3 h-3" />
                            <span className="text-xs">{annotations.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {progress && progress.currentPosition.percentage > 0 && (
                      <div className="space-y-1 mt-auto">
                        <Progress 
                          value={progress.currentPosition.percentage} 
                          className="h-1"
                        />
                        <div className="text-xs opacity-70">
                          {Math.round(progress.currentPosition.percentage)}% complete
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                >
                  <FileX className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
