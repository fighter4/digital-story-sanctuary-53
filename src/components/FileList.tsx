
import { useEbook } from "@/contexts/EbookContext";
import { Button } from "@/components/ui/button";
import { Book, FileX } from "lucide-react";

export const FileList = () => {
  const { files, currentFile, setCurrentFile, removeFile } = useEbook();

  if (files.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No books yet. Upload some files to get started!
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {files.map((file) => (
        <div
          key={file.id}
          className={`p-2 rounded-md border cursor-pointer transition-colors ${
            currentFile?.id === file.id 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-accent'
          }`}
          onClick={() => setCurrentFile(file)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <Book className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs opacity-70 uppercase">{file.type}</p>
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
      ))}
    </div>
  );
};
