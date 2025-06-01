// src/components/MainContent.tsx
import { useState, useCallback } from 'react';
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useEbook } from "@/contexts/EbookContext";
import { EpubReader } from "@/components/readers/EpubReader";
import { PdfReader } from "@/components/readers/PdfReader";
import { TxtReader } from "@/components/readers/TxtReader";
import { ReadingControls } from "@/components/reading/ReadingControls";
import { AnnotationPanel } from "@/components/annotations/AnnotationPanel";
import { SearchPanel } from "@/components/search/SearchPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SpeechPanel } from "@/components/reading/SpeechPanel";
import { NoteTaking } from "@/components/annotations/NoteTaking";
import { ReadingStats } from "@/components/stats/ReadingStats";
import { TocPanel } from "@/components/reading/TocPanel"; // Import TocPanel
import { toast } from '@/hooks/use-toast';

export const MainContent = () => {
  const { currentFile } = useEbook();
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSpeech, setShowSpeech] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showToc, setShowToc] = useState(false); // State for TOC panel

  const closeAllPanels = () => {
    setShowAnnotations(false);
    setShowSearch(false);
    setShowSettings(false);
    setShowSpeech(false);
    setShowNotes(false);
    setShowStats(false);
    setShowToc(false); // Close TOC panel as well
  };
  
  // Generic navigation handler called by TocPanel
  const handleTocNavigation = useCallback((location: string | number) => {
    if (!currentFile) return;

    let eventName = '';
    if (currentFile.type === 'epub') eventName = 'navigate-to-epub-location';
    else if (currentFile.type === 'pdf') eventName = 'navigate-to-pdf-location';
    else if (currentFile.type === 'txt') eventName = 'navigate-to-txt-location';

    if (eventName) {
      const event = new CustomEvent(eventName, { detail: { location } });
      window.dispatchEvent(event);
      toast({ title: "Navigating", description: `Jumping to section...` });
      // Optionally close TOC panel after navigation
      // setShowToc(false); 
    }
  }, [currentFile]);


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

    // Pass the navigation handler to readers if they need to directly interact with TOC navigation
    // For now, TOC navigation is handled by dispatching events that readers listen to.
    switch (currentFile.type) {
      case 'epub':
        return <EpubReader file={currentFile} requestNavigation={handleTocNavigation} />;
      case 'pdf':
        return <PdfReader file={currentFile} requestNavigation={handleTocNavigation} />;
      case 'txt':
        return <TxtReader file={currentFile} requestNavigation={handleTocNavigation} />;
      default:
        return <div>Unsupported file format</div>;
    }
  };

  const renderSidePanel = () => {
    if (showAnnotations) return <AnnotationPanel />;
    if (showSearch) return <SearchPanel />;
    if (showSettings) return <SettingsPanel />;
    if (showSpeech) return <SpeechPanel />;
    if (showNotes) return <NoteTaking />;
    if (showStats) return <ReadingStats />;
    if (showToc) return <TocPanel onNavigate={handleTocNavigation} />; // Render TocPanel
    return null;
  };


  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex-1">
          <ReadingControls
            onToggleAnnotations={() => { closeAllPanels(); setShowAnnotations(!showAnnotations); }}
            onToggleSearch={() => { closeAllPanels(); setShowSearch(!showSearch); }}
            onToggleSettings={() => { closeAllPanels(); setShowSettings(!showSettings); }}
            onToggleSpeech={() => { closeAllPanels(); setShowSpeech(!showSpeech); }}
            onToggleNotes={() => { closeAllPanels(); setShowNotes(!showNotes); }}
            onToggleStats={() => { closeAllPanels(); setShowStats(!showStats); }}
            onToggleToc={() => { closeAllPanels(); setShowToc(!showToc); }} // Add TOC toggle
            showAnnotations={showAnnotations}
            showSearch={showSearch}
            showSettings={showSettings}
            showSpeech={showSpeech}
            showNotes={showNotes}
            showStats={showStats}
            showToc={showToc} // Pass TOC state
          />
        </div>
      </header>
      
      <div className="flex flex-1 h-[calc(100vh-4rem)]"> {/* Ensure consistent height */}
        <div className="flex-1 flex flex-col overflow-hidden"> {/* Allow reader to scroll */}
          {renderReader()}
        </div>
        
        {(showAnnotations || showSearch || showSettings || showSpeech || showNotes || showStats || showToc) && (
          <div className="w-80 border-l bg-background overflow-y-auto"> {/* Ensure side panel can scroll */}
            {renderSidePanel()}
          </div>
        )}
      </div>
    </SidebarInset>
  );
};

