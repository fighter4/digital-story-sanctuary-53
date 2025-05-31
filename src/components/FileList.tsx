
import { useEbook } from "@/contexts/EbookContext";
import { useAnnotations } from "@/contexts/AnnotationContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Book, FileX, Bookmark } from "lucide-react";

export const FileList = () => {
  const { files, currentFile, setCurrentFile, removeFile } = useEbook();
  const { getProgress, getAnnotationsForFile } = useAnnotations();

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No books yet. Upload some files to get started!
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {files.map((file) => {
        const progress = getProgress(file.id);
        const annotations = getAnnotationsForFile(file.id);
        
        return (
          <div
            key={file.id}
            className={`p-3 rounded-md border cursor-pointer transition-colors ${
              currentFile?.id === file.id 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent'
            }`}
            onClick={() => setCurrentFile(file)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <Book className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
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
                  {progress && progress.currentPosition.percentage > 0 && (
                    <div className="space-y-1">
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
  );
};
