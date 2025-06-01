// src/components/reading/ReadingControls.tsx
import { useEbook } from '@/contexts/EbookContext';
import { useAnnotations } from '@/contexts/AnnotationContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Search, Settings, Volume2, PenTool, BarChart3, Highlighter, ListTree } from 'lucide-react'; // Added ListTree for TOC

interface ReadingControlsProps {
  onToggleAnnotations: () => void;
  onToggleSearch: () => void;
  onToggleSettings: () => void;
  onToggleSpeech: () => void;
  onToggleNotes: () => void;
  onToggleStats: () => void;
  onToggleToc: () => void; // Added for TOC
  onToggleHighlights?: () => void;
  showAnnotations: boolean;
  showSearch: boolean;
  showSettings: boolean;
  showSpeech: boolean;
  showNotes: boolean;
  showStats: boolean;
  showToc: boolean; // Added for TOC
  showHighlights?: boolean;
}

export const ReadingControls = ({
  onToggleAnnotations,
  onToggleSearch,
  onToggleSettings,
  onToggleSpeech,
  onToggleNotes,
  onToggleStats,
  onToggleToc, // Added for TOC
  onToggleHighlights,
  showAnnotations,
  showSearch,
  showSettings,
  showSpeech,
  showNotes,
  showStats,
  showToc, // Added for TOC
  showHighlights
}: ReadingControlsProps) => {
  const { currentFile, preferences } = useEbook();
  const { getProgress, getAnnotationsForFile } = useAnnotations();

  if (!currentFile) return null;

  const progress = getProgress(currentFile.id);
  const annotations = getAnnotationsForFile(currentFile.id);

  const getThemeClasses = () => {
    switch (preferences.theme) {
      case 'dark': return 'bg-gray-800 border-gray-700 text-white';
      case 'sepia': return 'bg-amber-100 border-amber-200 text-amber-900';
      default: return 'bg-background border-border text-foreground';
    }
  };

  return (
    <div className={`flex items-center justify-between p-2 md:p-3 border-b ${getThemeClasses()}`}>
      <div className="flex items-center gap-2 overflow-hidden flex-shrink min-w-0">
        <div className="text-sm font-medium truncate" title={currentFile.title || currentFile.name}>
          {currentFile.title || currentFile.name}
        </div>
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          {currentFile.type.toUpperCase()}
        </Badge>
      </div>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        {progress && (
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span>{Math.round(progress.currentPosition.percentage)}%</span>
            <Progress 
              value={progress.currentPosition.percentage} 
              className="w-20 h-2"
            />
          </div>
        )}

        <div className="flex items-center gap-0.5 md:gap-1">
          <Button variant={showToc ? 'default' : 'ghost'} size="sm" onClick={onToggleToc} title="Table of Contents">
            <ListTree className="w-4 h-4" />
          </Button>
          <Button variant={showSearch ? 'default' : 'ghost'} size="sm" onClick={onToggleSearch} title="Search">
            <Search className="w-4 h-4" />
          </Button>
          {onToggleHighlights && (
            <Button variant={showHighlights ? 'default' : 'ghost'} size="sm" onClick={onToggleHighlights} title="Highlights">
              <Highlighter className="w-4 h-4" />
            </Button>
          )}
          <Button variant={showAnnotations ? 'default' : 'ghost'} size="sm" onClick={onToggleAnnotations} className="relative" title="Annotations">
            <Bookmark className="w-4 h-4" />
            {annotations.length > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs justify-center">
                {annotations.length}
              </Badge>
            )}
          </Button>
          <Button variant={showNotes ? 'default' : 'ghost'} size="sm" onClick={onToggleNotes} title="Take Note">
            <PenTool className="w-4 h-4" />
          </Button>
          <Button variant={showSpeech ? 'default' : 'ghost'} size="sm" onClick={onToggleSpeech} title="Text-to-Speech">
            <Volume2 className="w-4 h-4" />
          </Button>
          <Button variant={showStats ? 'default' : 'ghost'} size="sm" onClick={onToggleStats} title="Reading Stats">
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button variant={showSettings ? 'default' : 'ghost'} size="sm" onClick={onToggleSettings} title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

