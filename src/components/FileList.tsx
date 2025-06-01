import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useEbook, EbookFile } from "@/contexts/EbookContext";
import { useAnnotations } from "@/contexts/AnnotationContext"; // For lastReadAt if integrated
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Book, FileX, Bookmark, Edit3, Trash2, Filter, ArrowUpDown, CheckCircle, Circle } from "lucide-react";
import { EditMetadataModal } from './EditMetadataModal'; // Create this component
import { toast } from '@/hooks/use-toast';

// Configuration for virtualization (from previous step)
const ITEM_HEIGHT = 100; // Adjusted for checkbox and edit button
const VISIBLE_ITEMS_BUFFER = 5;

type SortableField = 'title' | 'author' | 'addedAt' | 'lastReadAt' | 'type' | 'genre';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'inProgress' | 'completed' | 'notStarted';

export const FileList = () => {
  const { files, currentFile, setCurrentFile, removeFile } = useEbook();
  const { getProgress, getAnnotationsForFile } = useAnnotations(); // For completion status & lastReadAt

  // --- State for Library Management ---
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortableField>('addedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fileToEdit, setFileToEdit] = useState<EbookFile | null>(null);

  // --- Virtualization State & Refs (from previous step) ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [visibleEndIndex, setVisibleEndIndex] = useState(0); // Initialized in useEffect

  const allGenres = useMemo(() => {
    const genres = new Set(files.map(f => f.genre).filter(Boolean) as string[]);
    return ['all', ...Array.from(genres)];
  }, [files]);

  const filteredAndSortedFiles = useMemo(() => {
    let processedFiles = [...files];

    // Filtering
    if (searchTerm) {
      processedFiles = processedFiles.filter(
        (file) =>
          (file.title || file.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
          file.author?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterGenre !== 'all') {
      processedFiles = processedFiles.filter((file) => file.genre === filterGenre);
    }
    if (filterStatus !== 'all') {
        processedFiles = processedFiles.filter(file => {
            const progress = getProgress(file.id);
            if (filterStatus === 'completed') return progress?.isFinished === true;
            if (filterStatus === 'inProgress') return progress && !progress.isFinished && progress.currentPosition.percentage > 0;
            if (filterStatus === 'notStarted') return !progress || progress.currentPosition.percentage === 0;
            return true;
        });
    }


    // Sorting
    processedFiles.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === 'title') {
        valA = a.title || a.name;
        valB = b.title || b.name;
      }
      
      // Handle undefined or null values for sorting, pushing them to the end
      if (valA == null && valB != null) return sortDirection === 'asc' ? 1 : -1;
      if (valA != null && valB == null) return sortDirection === 'asc' ? -1 : 1;
      if (valA == null && valB == null) return 0;


      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (valA instanceof Date && valB instanceof Date) {
        return sortDirection === 'asc' ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
      }
      // Fallback for other types or mixed types (less ideal)
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return processedFiles;
  }, [files, searchTerm, sortBy, sortDirection, filterGenre, filterStatus, getProgress]);

  // --- Virtualization Logic (adapted from previous step) ---
   useEffect(() => {
    setVisibleEndIndex(Math.min(filteredAndSortedFiles.length, Math.ceil((scrollContainerRef.current?.clientHeight || window.innerHeight) / ITEM_HEIGHT) + VISIBLE_ITEMS_BUFFER * 2));
  }, [filteredAndSortedFiles.length]);


  const updateVisibleItems = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, clientHeight } = scrollContainerRef.current;
    const newStartIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - VISIBLE_ITEMS_BUFFER);
    const newEndIndex = Math.min(
      filteredAndSortedFiles.length,
      Math.ceil((scrollTop + clientHeight) / ITEM_HEIGHT) + VISIBLE_ITEMS_BUFFER
    );
    if (newStartIndex !== visibleStartIndex || newEndIndex !== visibleEndIndex) {
      setVisibleStartIndex(newStartIndex);
      setVisibleEndIndex(newEndIndex);
    }
  }, [filteredAndSortedFiles.length, visibleStartIndex, visibleEndIndex]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateVisibleItems);
      window.addEventListener('resize', updateVisibleItems);
      updateVisibleItems(); 
    }
    return () => {
      if (container) container.removeEventListener('scroll', updateVisibleItems);
      window.removeEventListener('resize', updateVisibleItems);
    };
  }, [updateVisibleItems]);

  useEffect(() => {
    setVisibleStartIndex(0);
    setVisibleEndIndex(Math.min(filteredAndSortedFiles.length, Math.ceil((scrollContainerRef.current?.clientHeight || window.innerHeight) / ITEM_HEIGHT) + VISIBLE_ITEMS_BUFFER * 2));
    if(scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    setSelectedFiles(new Set()); // Clear selection when list changes
  }, [filteredAndSortedFiles]);


  const handleSelectFile = (fileId: string) => {
    const newSelectedFiles = new Set(selectedFiles);
    if (newSelectedFiles.has(fileId)) {
      newSelectedFiles.delete(fileId);
    } else {
      newSelectedFiles.add(fileId);
    }
    setSelectedFiles(newSelectedFiles);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredAndSortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredAndSortedFiles.map(f => f.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) {
      toast({ title: "No files selected", description: "Please select files to delete.", variant: "destructive" });
      return;
    }
    // Add a confirmation dialog here in a real app
    removeFile(Array.from(selectedFiles));
    toast({ title: "Files Deleted", description: `${selectedFiles.size} file(s) have been removed.` });
    setSelectedFiles(new Set());
  };

  const openEditModal = (file: EbookFile, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent item click from firing
    setFileToEdit(file);
    setIsEditModalOpen(true);
  };

  const visibleListItems = useMemo(() => 
    filteredAndSortedFiles.slice(visibleStartIndex, visibleEndIndex),
    [filteredAndSortedFiles, visibleStartIndex, visibleEndIndex]
  );

  if (files.length === 0 && !searchTerm && filterGenre === 'all' && filterStatus === 'all') {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Your library is empty. Upload some books to get started!
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Controls: Search, Sort, Filter */}
      <div className="p-2 space-y-2 border-b">
        <Input
          placeholder="Search title or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <ArrowUpDown className="w-3 h-3 mr-1.5" />
                Sort: {sortBy} ({sortDirection})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(['title', 'author', 'addedAt', 'lastReadAt', 'type', 'genre'] as SortableField[]).map(field => (
                <DropdownMenuItem key={field} onClick={() => {
                  if (sortBy === field) {
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(field);
                    setSortDirection('asc');
                  }
                }}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  {sortBy === field && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={filterGenre} onValueChange={setFilterGenre}>
            <SelectTrigger className="text-xs h-8 w-auto min-w-[100px]">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              {allGenres.map(genre => (
                <SelectItem key={genre} value={genre} className="text-xs capitalize">{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>

           <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
            <SelectTrigger className="text-xs h-8 w-auto min-w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="notStarted" className="text-xs">Not Started</SelectItem>
              <SelectItem value="inProgress" className="text-xs">In Progress</SelectItem>
              <SelectItem value="completed" className="text-xs">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedFiles.size > 0 && (
        <div className="p-2 border-b bg-muted flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{selectedFiles.size} selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Selected
          </Button>
        </div>
      )}
      
      {/* Select All Checkbox */}
       {filteredAndSortedFiles.length > 0 && (
        <div className="p-2 border-b flex items-center">
          <Checkbox
            id="selectAll"
            checked={selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
            onCheckedChange={handleSelectAll}
            className="mr-2"
          />
          <Label htmlFor="selectAll" className="text-sm font-medium">
            Select All ({filteredAndSortedFiles.length})
          </Label>
        </div>
      )}


      {/* File List Area */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 p-2 overflow-y-auto" // Removed space-y-0
      >
        {filteredAndSortedFiles.length === 0 ? (
             <div className="p-4 text-center text-muted-foreground text-sm">
                No books match your current filters.
            </div>
        ) : (
          <div style={{ height: `${filteredAndSortedFiles.length * ITEM_HEIGHT}px`, position: 'relative' }}>
            {visibleListItems.map((file, index) => {
              const actualIndex = visibleStartIndex + index;
              const progress = getProgress(file.id);
              const annotations = getAnnotationsForFile(file.id);
              const isSelected = selectedFiles.has(file.id);
              
              return (
                <div
                  key={file.id}
                  className={`p-3 rounded-md border cursor-pointer transition-colors absolute w-[calc(100%-1rem)] flex items-center gap-3 mb-1
                    ${currentFile?.id === file.id ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                      : isSelected ? 'bg-accent/70 dark:bg-accent/40 border-primary/50' 
                      : 'hover:bg-accent/50 dark:hover:bg-slate-800/50'
                    }`}
                  style={{ 
                    top: `${actualIndex * ITEM_HEIGHT}px`, 
                    height: `${ITEM_HEIGHT - 4}px`, // -4 for mb-1
                    left: '0.5rem', 
                    right: '0.5rem',
                  }}
                  onClick={() => setCurrentFile(file)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleSelectFile(file.id)}
                    onClick={(e) => e.stopPropagation()} // Prevent item click
                    aria-label={`Select ${file.title || file.name}`}
                  />
                  <div className="flex items-start justify-between gap-2 h-full flex-1 min-w-0">
                    <div className="flex items-start gap-2 min-w-0 flex-1 h-full">
                      {file.coverImageUrl ? (
                        <img src={file.coverImageUrl} alt={file.title || file.name} className="w-10 h-14 object-cover rounded flex-shrink-0 mt-0.5" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      ) : (
                        <Book className="w-5 h-5 mt-1 flex-shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5 flex flex-col justify-center h-full">
                        <p className="text-sm font-semibold truncate" title={file.title || file.name}>{file.title || file.name}</p>
                        {file.author && <p className="text-xs text-muted-foreground truncate" title={file.author}>{file.author}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs opacity-70 uppercase bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {file.type}
                          </span>
                          {file.genre && file.genre !== "Unknown Genre" && (
                            <span className="text-xs opacity-70 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded truncate" title={file.genre}>
                              {file.genre}
                            </span>
                          )}
                          {annotations.length > 0 && (
                            <div className="flex items-center gap-1 text-xs opacity-70" title={`${annotations.length} annotations`}>
                              <Bookmark className="w-3 h-3" />
                              <span>{annotations.length}</span>
                            </div>
                          )}
                        </div>
                        {progress && progress.currentPosition.percentage > 0 && (
                          <div className="space-y-1 mt-1">
                            <Progress 
                              value={progress.currentPosition.percentage} 
                              className="h-1.5"
                            />
                            <div className="text-xs opacity-70">
                              {Math.round(progress.currentPosition.percentage)}%
                              {progress.isFinished && <CheckCircle className="w-3 h-3 inline-block ml-1 text-green-500" />}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1 ml-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                            onClick={(e) => openEditModal(file, e)}
                            title="Edit Metadata"
                        >
                            <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                            toast({ title: "File Deleted", description: `"${file.title || file.name}" has been removed.` });
                            }}
                            title="Delete File"
                        >
                            <FileX className="w-4 h-4" />
                        </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {fileToEdit && (
        <EditMetadataModal
          file={fileToEdit}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setFileToEdit(null);
          }}
        />
      )}
    </div>
  );
};

