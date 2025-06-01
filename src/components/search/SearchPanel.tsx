import React, { useState, useEffect, useCallback } from 'react';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, X, Loader2 } from 'lucide-react'; // Added Loader2
import { toast } from '@/hooks/use-toast';
import { extractTextFromFile, TextExtractionResult } from '@/utils/textExtraction';

interface SearchResult {
  id: string;
  text: string; // The matched text
  context: string; // Text surrounding the match
  position: {
    cfi?: string; // For EPUB
    page?: number; // For PDF
    line?: number; // For TXT
    offset?: number; // Character offset within the line/page
  };
  matchCount: number; // Could be used if multiple occurrences on the same "item"
}

export const SearchPanel = () => {
  const { currentFile } = useEbook();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  const [fullText, setFullText] = useState<string | null>(null); // Store extracted text
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Custom hook for debouncing
  function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return debouncedValue;
  }


  const extractFileText = useCallback(async () => {
    if (!currentFile || !currentFile.file) {
      setFullText(null);
      setExtractionError("No file selected or file data is missing.");
      return;
    }

    setIsExtractingText(true);
    setExtractionError(null);
    setFullText(null); // Reset previous text

    try {
      const result: TextExtractionResult = await extractTextFromFile(currentFile.file, currentFile.type);
      if (result.success) {
        setFullText(result.text);
        if (result.error) { // Partial success with warning (e.g. basic EPUB extraction)
            toast({ title: "Text Extraction Note", description: result.error, variant: "default" });
        }
      } else {
        setExtractionError(result.error || "Failed to extract text from the file.");
        toast({
          title: "Text Extraction Failed",
          description: result.error || "Could not extract text for searching.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error during text extraction:', error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setExtractionError(`Extraction process failed: ${errorMessage}`);
      toast({
        title: "Text Extraction Error",
        description: `An error occurred: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsExtractingText(false);
    }
  }, [currentFile]);

  useEffect(() => {
    if (currentFile) {
      extractFileText();
    } else {
      setFullText(null);
      setSearchResults([]);
      setSearchQuery('');
      setExtractionError(null);
    }
  }, [currentFile, extractFileText]);


  const performSearch = useCallback((textToSearch: string, query: string): SearchResult[] => {
    if (!query.trim() || !textToSearch) return [];

    const flags = caseSensitive ? 'g' : 'gi';
    // Escape special characters in query for regex, except if it's already a complex regex
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchPattern = wholeWords ? `\\b${escapedQuery}\\b` : escapedQuery;
    
    const results: SearchResult[] = [];
    
    // Simple line-based context for TXT and basic EPUB.
    // For PDF, line numbers are an approximation based on newline characters.
    const lines = textToSearch.split('\n');
    
    lines.forEach((line, lineIndex) => {
      try {
        const regex = new RegExp(searchPattern, flags);
        let match;
        while ((match = regex.exec(line)) !== null) {
          const contextStart = Math.max(0, match.index - 30);
          const contextEnd = Math.min(line.length, match.index + match[0].length + 30);
          const context = line.substring(contextStart, contextEnd);

          results.push({
            id: `${currentFile?.id}-${lineIndex}-${match.index}`,
            text: match[0],
            context: `...${context}...`,
            position: {
              line: lineIndex + 1, // 1-based line number
              page: currentFile?.type === 'pdf' ? Math.floor(lineIndex / 50) + 1 : undefined, // Rough page for PDF
              offset: match.index,
            },
            matchCount: 1, // Simplified for this example
          });
        }
      } catch (e) {
        // Invalid regex, could happen with complex user input if not escaped properly
        console.error("Regex error during search:", e);
        toast({ title: "Search Error", description: "Invalid search pattern.", variant: "destructive"});
        return []; // Stop search on regex error
      }
    });

    return results;
  }, [caseSensitive, wholeWords, currentFile]);

  const handleSearch = useCallback(async () => {
    if (!debouncedSearchQuery.trim() || !currentFile) {
      setSearchResults([]);
      return;
    }
    if (isExtractingText) {
      toast({ title: "Please wait", description: "Text extraction is in progress." });
      return;
    }
    if (extractionError && !fullText) {
      toast({ title: "Cannot Search", description: `Text could not be extracted: ${extractionError}`, variant: "destructive" });
      return;
    }
    if (!fullText) {
         // Attempt to re-extract if fullText is null but no explicit error
        await extractFileText();
        if (!fullText && !isExtractingText) { // Check again after attempt
            toast({ title: "No Content", description: "Book content is not available for searching.", variant: "destructive" });
            return;
        }
    }


    setIsSearching(true);
    // Add to search history
    if (!searchHistory.includes(debouncedSearchQuery)) {
      setSearchHistory(prev => [debouncedSearchQuery, ...prev.slice(0, 9)]);
    }

    const results = performSearch(fullText || "", debouncedSearchQuery);
    setSearchResults(results);
    
    toast({
      title: "Search Completed",
      description: `Found ${results.length} results for "${debouncedSearchQuery}".`,
    });

    setIsSearching(false);
  }, [debouncedSearchQuery, currentFile, fullText, performSearch, searchHistory, isExtractingText, extractionError, extractFileText]);
  
  useEffect(() => {
    handleSearch();
  }, [debouncedSearchQuery, handleSearch]);


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Debounced search will trigger automatically, no need for explicit call here
      // unless immediate search is desired on Enter, bypassing debounce.
      // For now, let debounce handle it.
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const flags = caseSensitive ? 'g' : 'gi';
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchPattern = wholeWords ? `\\b${escapedQuery}\\b` : escapedQuery;
    
    try {
      const regex = new RegExp(`(${searchPattern})`, flags);
      return text.split(regex).map((part, index) => 
        regex.test(part) && part.toLowerCase() === query.toLowerCase() ? ( // Check if the part actually matches the query for highlighting
          <mark key={index} className="bg-yellow-300 dark:bg-yellow-700 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (e) {
      return text; // Return original text if regex is invalid
    }
  };

  const handleResultClick = (result: SearchResult) => {
    const detail: { page?: number; line?: number; cfi?: string } = {};
    if (result.position.page && (currentFile?.type === 'pdf' || currentFile?.type === 'epub')) {
      detail.page = result.position.page;
    }
    if (result.position.line && currentFile?.type === 'txt') {
      detail.line = result.position.line;
    }
    if (result.position.cfi && currentFile?.type === 'epub') {
      detail.cfi = result.position.cfi;
    }

    if (Object.keys(detail).length > 0) {
      const event = new CustomEvent('navigate-to-position', { detail });
      window.dispatchEvent(event);
      toast({
        title: "Navigating...",
        description: `Attempting to go to ${currentFile?.type === 'pdf' ? `page ${detail.page}` : currentFile?.type === 'txt' ? `line ${detail.line}` : 'location'}.`,
      });
    } else {
      toast({ title: "Navigation Info", description: "No specific navigation data for this result type." });
    }
  };

  if (!currentFile) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Open a book to search its content.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-4 h-4" />
          <h3 className="font-semibold">Search Book</h3>
        </div>
        
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <Input
              placeholder="Enter search term..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-8 text-sm"
              disabled={isExtractingText}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={clearSearch}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          {/* Search button removed as search is debounced */}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Button
            variant={caseSensitive ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setCaseSensitive(!caseSensitive)}
            className="h-7 px-2 text-xs"
            disabled={isExtractingText || isSearching}
          >
            Aa Case Sensitive
          </Button>
          <Button
            variant={wholeWords ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setWholeWords(!wholeWords)}
            className="h-7 px-2 text-xs"
            disabled={isExtractingText || isSearching}
          >
            Whole Words
          </Button>
        </div>

        {searchHistory.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Recent:</div>
            <div className="flex flex-wrap gap-1">
              {searchHistory.slice(0, 5).map((term, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer text-xs px-1.5 py-0.5 hover:bg-accent"
                  onClick={() => setSearchQuery(term)}
                >
                  {term}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {isExtractingText ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Preparing book for searching...
            </div>
          ) : extractionError && !fullText ? (
             <div className="text-center text-red-600 dark:text-red-400 text-sm py-8">
              Error extracting text: {extractionError}
            </div>
          ) : isSearching ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              Searching...
            </div>
          ) : searchResults.length === 0 && debouncedSearchQuery ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No results found for "{debouncedSearchQuery}".
            </div>
          ) : searchResults.length === 0 && !debouncedSearchQuery ? (
             <div className="text-center text-muted-foreground text-sm py-8">
              Enter a term above to search within the book.
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.length > 0 && debouncedSearchQuery && (
                 <div className="text-sm text-muted-foreground mb-3">
                  Found {searchResults.length} results for "{debouncedSearchQuery}"
                </div>
              )}
              {searchResults.map((result) => (
                <div 
                  key={result.id} 
                  className="border rounded-lg p-3 hover:bg-accent dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="font-medium text-sm mb-1">
                    "{highlightText(result.text, debouncedSearchQuery)}"
                  </div>
                  <div className="text-xs text-muted-foreground mb-1.5 leading-relaxed">
                    {highlightText(result.context, debouncedSearchQuery)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {result.position.page ? `Approx. Page ${result.position.page}` : result.position.line ? `Line ${result.position.line}` : 'Position N/A'}
                    </span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      Go to
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
