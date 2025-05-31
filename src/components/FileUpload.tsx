
import { useEbook } from "@/contexts/EbookContext";
import { Button } from "@/components/ui/button";
import { FilePlus } from "lucide-react";
import { useRef } from "react";

export const FileUpload = () => {
  const { addFile } = useEbook();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        addFile(file);
      });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,.pdf,.txt"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <Button 
        onClick={triggerFileUpload}
        variant="outline"
        className="w-full"
        size="sm"
      >
        <FilePlus className="w-4 h-4 mr-2" />
        Add Books
      </Button>
    </div>
  );
};
