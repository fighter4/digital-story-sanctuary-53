// src/components/reading/TocPanel.tsx
import React from 'react';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListTree, ChevronDown, ChevronRight } from 'lucide-react';
import { TocItem } from '@/types/toc';
import { cn } from '@/lib/utils';

interface TocPanelProps {
  onNavigate: (location: string | number) => void; // Generic navigation handler
}

const TocListItem: React.FC<{ item: TocItem; onNavigate: (location: string | number) => void; level: number }> = ({ item, onNavigate, level }) => {
  const [isOpen, setIsOpen] = React.useState(true); // Keep sub-items open by default or manage as needed

  const handleItemClick = () => {
    if (item.href) {
      onNavigate(item.href);
    } else if (item.pageNumber !== undefined) {
      onNavigate(item.pageNumber);
    } else if (item.lineNumber !== undefined) {
      onNavigate(item.lineNumber);
    }
  };

  const hasSubitems = item.subitems && item.subitems.length > 0;

  return (
    <li style={{ paddingLeft: `${level * 1}rem` }}>
      <div className="flex items-center justify-between group hover:bg-accent dark:hover:bg-slate-800 rounded-md">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-left h-auto py-1.5 px-2"
          onClick={handleItemClick}
          title={item.label}
        >
          <span className="truncate">{item.label}</span>
        </Button>
        {hasSubitems && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0 mr-1 flex-shrink-0"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Collapse section" : "Expand section"}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>
      {hasSubitems && isOpen && (
        <ul className="mt-1">
          {item.subitems?.map((subItem) => (
            <TocListItem key={subItem.id} item={subItem} onNavigate={onNavigate} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

export const TocPanel: React.FC<TocPanelProps> = ({ onNavigate }) => {
  const { currentFile } = useEbook();

  if (!currentFile) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Open a book to view its Table of Contents.
      </div>
    );
  }

  const tocItems = currentFile.toc || [];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <ListTree className="w-5 h-5" />
          <h3 className="font-semibold text-lg">Table of Contents</h3>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {tocItems.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No Table of Contents available for this book.
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {tocItems.map((item) => (
              <TocListItem key={item.id} item={item} onNavigate={onNavigate} level={0} />
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
};
