
import { useState } from 'react';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';

interface SearchResult {
  id: string;
  text: string;
  context: string;
  position: {
    cfi?: string;
    page?: number;
    line?: number;
  };
}

export const SearchPanel = () => {
  const { currentFile } = useEbook();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentFile) return;

    setIsSearching(true);
    try {
      // For now, we'll implement a basic search simulation
      // In a real implementation, this would search through the actual book content
      const mockResults: SearchResult[] = [
        {
          id: '1',
          text: searchQuery,
          context: `This is a sample context containing ${searchQuery} for demonstration purposes.`,
          position: { page: 1 }
        }
      ];
      
      setSearchResults(mockResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4" />
          <h3 className="font-semibold">Search</h3>
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Search in book..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            size="sm"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {searchResults.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              {searchQuery ? 'No results found' : 'Enter a search term to find content in your book'}
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((result) => (
                <div key={result.id} className="border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <div className="font-medium text-sm mb-1">"{result.text}"</div>
                  <div className="text-sm text-muted-foreground mb-2">{result.context}</div>
                  <div className="text-xs text-muted-foreground">
                    {result.position.page && `Page ${result.position.page}`}
                    {result.position.line && `Line ${result.position.line}`}
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
