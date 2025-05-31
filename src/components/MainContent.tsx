
import { useState } from 'react';
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useEbook } from "@/contexts/EbookContext";
import { EpubReader } from "@/components/readers/EpubReader";
import { PdfReader } from "@/components/readers/PdfReader";
import { TxtReader } from "@/components/readers/TxtReader";
import { ReadingControls } from "@/components/reading/ReadingControls";
import { AnnotationPanel } from "@/components/annotations/AnnotationPanel";
import { SearchPanel } from "@/components/search/SearchPanel";
import { SettingsPanel } from "@/components/SettingsPanel";

export const MainContent = () => {
  const { currentFile } = useEbook();
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  const renderSidePanel = () => {
    if (showAnnotations) return <AnnotationPanel />;
    if (showSearch) return <SearchPanel />;
    if (showSettings) return <SettingsPanel />;
    return null;
  };

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex-1">
          <ReadingControls
            onToggleAnnotations={() => {
              setShowAnnotations(!showAnnotations);
              setShowSearch(false);
              setShowSettings(false);
            }}
            onToggleSearch={() => {
              setShowSearch(!showSearch);
              setShowAnnotations(false);
              setShowSettings(false);
            }}
            onToggleSettings={() => {
              setShowSettings(!showSettings);
              setShowAnnotations(false);
              setShowSearch(false);
            }}
            showAnnotations={showAnnotations}
            showSearch={showSearch}
            showSettings={showSettings}
          />
        </div>
      </header>
      
      <div className="flex flex-1">
        <div className="flex-1 flex flex-col">
          {renderReader()}
        </div>
        
        {(showAnnotations || showSearch || showSettings) && (
          <div className="w-80 border-l bg-background">
            {renderSidePanel()}
          </div>
        )}
      </div>
    </SidebarInset>
  );
};
