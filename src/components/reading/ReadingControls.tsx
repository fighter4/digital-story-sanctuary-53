
import { useEbook } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Search, Settings } from 'lucide-react';

interface ReadingControlsProps {
  onToggleAnnotations: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  showAnnotations: boolean;
  showSearch: boolean;
  showSettings: boolean;
}

export const ReadingControls = ({
  onToggleAnnotations,
  onToggleSearch,
  onToggleSettings,
  showAnnotations,
  showSearch,
  showSettings
}: ReadingControlsProps) => {
  const { currentFile } = useEbook();
  const { getProgress, getAnnotationsForFile } = useAnnotations();

  if (!currentFile) return null;

  const progress = getProgress(currentFile.id);
  const annotations = getAnnotationsForFile(currentFile.id);

  return (
    <div className="flex items-center justify-between p-3 border-b bg-background">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium">{currentFile.name}</div>
        <Badge variant="secondary" className="text-xs">
          {currentFile.type.toUpperCase()}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {progress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{Math.round(progress.currentPosition.percentage)}%</span>
            <Progress 
              value={progress.currentPosition.percentage} 
              className="w-20 h-2"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant={showSearch ? 'default' : 'ghost'}
            size="sm"
            onClick={onToggleSearch}
          >
            <Search className="w-4 h-4" />
          </Button>

          <Button
            variant={showAnnotations ? 'default' : 'ghost'}
            size="sm"
            onClick={onToggleAnnotations}
            className="relative"
          >
            <Bookmark className="w-4 h-4" />
            {annotations.length > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs"
              >
                {annotations.length}
              </Badge>
            )}
          </Button>

          <Button
            variant={showSettings ? 'default' : 'ghost'}
            size="sm"
            onClick={onToggleSettings}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
