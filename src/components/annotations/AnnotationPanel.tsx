
import { useState } from 'react';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { useEbook } from '@/contexts/EbookContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Search } from 'lucide-react';
import { Annotation } from '@/types/annotations';

export const AnnotationPanel = () => {
  const { currentFile } = useEbook();
  const { getAnnotationsForFile, deleteAnnotation } = useAnnotations();
  const [filter, setFilter] = useState<'all' | 'highlight' | 'note' | 'bookmark'>('all');

  if (!currentFile) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Open a book to view annotations
      </div>
    );
  }

  const annotations = getAnnotationsForFile(currentFile.id);
  const filteredAnnotations = filter === 'all' 
    ? annotations 
    : annotations.filter(a => a.type === filter);

  const getTypeColor = (type: Annotation['type']) => {
    switch (type) {
      case 'highlight': return 'bg-yellow-100 text-yellow-800';
      case 'note': return 'bg-blue-100 text-blue-800';
      case 'bookmark': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Bookmark className="w-4 h-4" />
          <h3 className="font-semibold">Annotations</h3>
        </div>
        
        <div className="flex gap-1">
          {['all', 'highlight', 'note', 'bookmark'].map((type) => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(type as any)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredAnnotations.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No {filter === 'all' ? '' : filter} annotations yet
            </div>
          ) : (
            filteredAnnotations.map((annotation) => (
              <div key={annotation.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <Badge className={getTypeColor(annotation.type)}>
                    {annotation.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAnnotation(annotation.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
                
                <div className="text-sm">
                  <div className="font-medium mb-1">{annotation.content}</div>
                  {annotation.note && (
                    <div className="text-muted-foreground italic">{annotation.note}</div>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {annotation.createdAt.toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
