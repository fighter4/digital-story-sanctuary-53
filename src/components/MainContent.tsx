
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useEbook } from "@/contexts/EbookContext";
import { EpubReader } from "@/components/readers/EpubReader";
import { PdfReader } from "@/components/readers/PdfReader";
import { TxtReader } from "@/components/readers/TxtReader";

export const MainContent = () => {
  const { currentFile } = useEbook();

  const renderReader = () => {
    if (!currentFile) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-semibold mb-4">Welcome to Ebook Reader</h2>
            <p className="text-muted-foreground mb-6">
              Select a book from your library or add new books to start reading.
            </p>
            <p className="text-sm text-muted-foreground">
              Supported formats: EPUB, PDF, TXT
            </p>
          </div>
        </div>
      );
    }

    switch (currentFile.type) {
      case 'epub':
        return <EpubReader file={currentFile} />;
      case 'pdf':
        return <PdfReader file={currentFile} />;
      case 'txt':
        return <TxtReader file={currentFile} />;
      default:
        return <div>Unsupported file format</div>;
    }
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        {currentFile && (
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{currentFile.name}</h1>
            <span className="text-sm text-muted-foreground uppercase">
              {currentFile.type}
            </span>
          </div>
        )}
      </header>
      <div className="flex flex-1 flex-col">
        {renderReader()}
      </div>
    </SidebarInset>
  );
};
