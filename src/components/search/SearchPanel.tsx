
import { useState } from 'react';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  text: string;
  context: string;
  position: {
    cfi?: string;
    page?: number;
    line?: number;
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

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentFile) return;

    setIsSearching(true);
    try {
      // Add to search history
      if (!searchHistory.includes(searchQuery)) {
        setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]);
      }

      // Simulate enhanced search with multiple results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          text: searchQuery,
          context: `This is an enhanced search result containing "${searchQuery}" with better context and highlighting capabilities.`,
          position: { page: 1 },
          matchCount: 3
        },
        {
          id: '2',
          text: searchQuery,
          context: `Another occurrence of "${searchQuery}" found in a different section of the book with more detailed context.`,
          position: { page: 5 },
          matchCount: 2
        }
      ];
      
      setSearchResults(mockResults);
      
      toast({
        title: "Search completed",
        description: `Found ${mockResults.length} results for "${searchQuery}"`
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
    
    const regex = new RegExp(
      `(${query})`, 
      caseSensitive ? 'g' : 'gi'
    );
    
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
                <div key={result.id} className="border rounded-lg p-3 hover:bg-accent cursor-pointer">
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
                      {result.matchCount} matches
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
