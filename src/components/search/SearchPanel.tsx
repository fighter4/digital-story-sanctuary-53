
import { useState, useEffect } from 'react';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { extractTextFromFile } from '@/utils/textExtraction';

interface SearchResult {
  id: string;
  text: string;
  context: string;
  position: {
    cfi?: string;
    page?: number;
    line?: number;
    offset?: number;
  };
  matchCount: number;
}

export const SearchPanel = () => {
  const { currentFile } = useEbook();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWords, setWholeWords] = useState(false);
  const [fullText, setFullText] = useState('');
  const [isExtracted, setIsExtracted] = useState(false);

  useEffect(() => {
    if (currentFile && !isExtracted) {
      extractFileText();
    }
  }, [currentFile]);

  const extractFileText = async () => {
    if (!currentFile) return;

    try {
      const result = await extractTextFromFile(currentFile.file, currentFile.type);
      if (result.success) {
        setFullText(result.text);
        setIsExtracted(true);
      } else {
        console.error('Failed to extract text:', result.error);
        toast({
          title: "Text extraction failed",
          description: "Search may be limited",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error extracting text:', error);
    }
  };

  const performSearch = (text: string, query: string): SearchResult[] => {
    if (!query.trim()) return [];

    const flags = caseSensitive ? 'g' : 'gi';
    const searchPattern = wholeWords ? `\\b${query}\\b` : query;
    const regex = new RegExp(searchPattern, flags);
    
    const results: SearchResult[] = [];
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
      const matches = [...line.matchAll(new RegExp(searchPattern, flags))];
      
      matches.forEach((match, matchIndex) => {
        const contextStart = Math.max(0, match.index! - 50);
        const contextEnd = Math.min(line.length, match.index! + match[0].length + 50);
        const context = line.slice(contextStart, contextEnd);
        
        // Calculate approximate page for different file types
        let page = 1;
        if (currentFile?.type === 'txt') {
          page = Math.floor(lineIndex / 30) + 1; // Assuming 30 lines per page
        } else if (currentFile?.type === 'pdf') {
          page = Math.floor(lineIndex / 50) + 1; // Rough estimate for PDF
        }

        results.push({
          id: `${lineIndex}-${matchIndex}`,
          text: match[0],
          context: `...${context}...`,
          position: {
            line: lineIndex + 1,
            page,
            offset: match.index
          },
          matchCount: 1
        });
      });
    });

    return results;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentFile) return;

    setIsSearching(true);
    try {
      // Add to search history
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
      }

      let searchText = fullText;
      
      // If we don't have extracted text, try to get visible text
      if (!searchText) {
        const readerElement = document.querySelector('[data-reader-content]') as HTMLElement || 
                              document.querySelector('.epub-container') as HTMLElement ||
                              document.querySelector('pre') as HTMLElement;
        
        if (readerElement) {
          searchText = readerElement.textContent || '';
        }
      }

      if (!searchText) {
        toast({
          title: "No content to search",
          description: "Could not access book content for searching",
          variant: "destructive"
        });
        return;
      }

      const results = performSearch(searchText, searchQuery);
      setSearchResults(results);
      
      toast({
        title: "Search completed",
        description: `Found ${results.length} results for "${searchQuery}"`
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "An error occurred while searching.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const flags = caseSensitive ? 'g' : 'gi';
    const searchPattern = wholeWords ? `\\b${query}\\b` : query;
    const regex = new RegExp(`(${searchPattern})`, flags);
    
    return text.split(regex).map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleResultClick = (result: SearchResult) => {
    // Try to navigate to the result position
    if (result.position.page && currentFile?.type === 'pdf') {
      // For PDF, we could emit an event or use a callback to navigate
      const event = new CustomEvent('navigate-to-page', { 
        detail: { page: result.position.page } 
      });
      window.dispatchEvent(event);
    } else if (result.position.line && currentFile?.type === 'txt') {
      // For TXT, navigate to line
      const event = new CustomEvent('navigate-to-line', { 
        detail: { line: result.position.line } 
      });
      window.dispatchEvent(event);
    }
    
    toast({
      title: "Navigation",
      description: `Attempting to navigate to ${currentFile?.type === 'pdf' ? 'page' : 'line'} ${result.position.page || result.position.line}`
    });
  };

  if (!currentFile) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Open a book to search
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4" />
          <h3 className="font-semibold">Search</h3>
          {!isExtracted && currentFile.type !== 'txt' && (
            <Badge variant="outline" className="text-xs">
              Extracting...
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Search in book..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0"
                onClick={clearSearch}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Button 
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            size="sm"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Button
            variant={caseSensitive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCaseSensitive(!caseSensitive)}
            className="h-6 text-xs"
          >
            Aa
          </Button>
          <Button
            variant={wholeWords ? 'default' : 'outline'}
            size="sm"
            onClick={() => setWholeWords(!wholeWords)}
            className="h-6 text-xs"
          >
            Whole Words
          </Button>
        </div>

        {searchHistory.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Recent searches:</div>
            <div className="flex flex-wrap gap-1">
              {searchHistory.slice(0, 5).map((term, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer text-xs hover:bg-accent"
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
          {searchResults.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              {searchQuery ? 'No results found' : 'Enter a search term to find content in your book'}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-3">
                Found {searchResults.length} results
              </div>
              {searchResults.map((result) => (
                <div 
                  key={result.id} 
                  className="border rounded-lg p-3 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="font-medium text-sm mb-1">
                    {highlightText(`"${result.text}"`, searchQuery)}
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {highlightText(result.context, searchQuery)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {result.position.page && `Page ${result.position.page}`}
                      {result.position.line && `Line ${result.position.line}`}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Click to navigate
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
