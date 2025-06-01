// src/contexts/EbookContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { TocItem } from '@/types/toc'; // Import the new TocItem interface

// --- Enhanced EbookFile Interface ---
export interface EbookFile {
  id: string;
  name: string; 
  type: 'epub' | 'pdf' | 'txt';
  file: File; 
  addedAt: Date;
  title?: string; 
  author?: string;
  genre?: string;
  coverImageUrl?: string; 
  lastReadAt?: Date; 
  toc?: TocItem[]; // Added Table of Contents
}

export interface ReadingPreferences {
  fontSize: number;
  theme: 'light' | 'dark' | 'sepia';
  fontFamily: string;
  highlightColor: string;
}

interface EbookContextType {
  files: EbookFile[];
  currentFile: EbookFile | null;
  preferences: ReadingPreferences;
  addFile: (file: File) => void;
  removeFile: (ids: string | string[]) => void;
  setCurrentFile: (file: EbookFile | null) => void;
  updatePreferences: (prefs: Partial<ReadingPreferences>) => void;
  updateFileMetadata: (id: string, metadata: Partial<Omit<EbookFile, 'id' | 'file' | 'type' | 'toc'>>) => void;
  updateCurrentFileToc: (toc: TocItem[]) => void; // New function to update TOC for current file
  updateLastReadTimestamp: (fileId: string) => void; // Added for completeness from previous plan
}

const EbookContext = createContext<EbookContextType | undefined>(undefined);

export const useEbook = () => {
  const context = useContext(EbookContext);
  if (!context) {
    throw new Error('useEbook must be used within an EbookProvider');
  }
  return context;
};

const extractInitialMetadata = async (file: File): Promise<Partial<EbookFile>> => {
    const metadata: Partial<EbookFile> = {
        title: file.name.replace(/\.[^/.]+$/, "") 
    };
    const nameParts = file.name.split(' - ');
    if (nameParts.length > 1) {
        metadata.author = nameParts[0].trim();
        metadata.title = nameParts.slice(1).join(' - ').replace(/\.[^/.]+$/, "").trim();
    }
    return metadata;
};


export const EbookProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<EbookFile[]>(() => {
    const savedFiles = localStorage.getItem('ebookFiles');
    if (savedFiles) {
      const parsedFiles = JSON.parse(savedFiles) as Array<Omit<EbookFile, 'file' | 'addedAt' | 'lastReadAt' | 'toc'> & { addedAt: string, lastReadAt?: string, toc?: TocItem[] }>;
      return parsedFiles.map(f => ({
        ...f,
        file: new File([], f.name, { type: `application/${f.type}` }), 
        addedAt: new Date(f.addedAt),
        lastReadAt: f.lastReadAt ? new Date(f.lastReadAt) : undefined,
        toc: f.toc || [], // Initialize toc
      }));
    }
    return [];
  });

  const [currentFile, setCurrentFile] = useState<EbookFile | null>(null);
  const [preferences, setPreferences] = useState<ReadingPreferences>(() => {
    const savedPrefs = localStorage.getItem('ebookPreferences');
    return savedPrefs ? JSON.parse(savedPrefs) : {
      fontSize: 16,
      theme: 'light',
      fontFamily: 'serif',
      highlightColor: '#ffeb3b'
    };
  });

  useEffect(() => {
    const storableFiles = files.map(f => {
        const { file, ...meta } = f; 
        return meta;
    });
    localStorage.setItem('ebookFiles', JSON.stringify(storableFiles));
  }, [files]);

  useEffect(() => {
    localStorage.setItem('ebookPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const addFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let type: EbookFile['type'];
    
    if (extension === 'epub') type = 'epub';
    else if (extension === 'pdf') type = 'pdf';
    else if (extension === 'txt') type = 'txt';
    else {
      alert(`Unsupported file format: ${extension}`);
      return; 
    }

    const initialMeta = await extractInitialMetadata(file);

    const newFile: EbookFile = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2,9),
      name: file.name,
      type,
      file, 
      addedAt: new Date(),
      lastReadAt: new Date(),
      title: initialMeta.title || file.name.replace(/\.[^/.]+$/, ""),
      author: initialMeta.author || "Unknown Author",
      genre: "Unknown Genre",
      toc: [], // Initialize with empty TOC
    };

    setFiles(prev => [...prev, newFile]);
  };

  const removeFile = (idsToRemove: string | string[]) => {
    const idsArray = Array.isArray(idsToRemove) ? idsToRemove : [idsToRemove];
    setFiles(prev => prev.filter(file => !idsArray.includes(file.id)));
    if (currentFile && idsArray.includes(currentFile.id)) {
      setCurrentFile(null);
    }
  };

  const updatePreferences = (prefs: Partial<ReadingPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  const updateFileMetadata = (id: string, metadata: Partial<Omit<EbookFile, 'id' | 'file' | 'type' | 'toc'>>) => {
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === id ? { ...file, ...metadata, name: metadata.title || file.name } : file
      )
    );
    if (currentFile?.id === id) {
        setCurrentFile(prevCurrent => prevCurrent ? { ...prevCurrent, ...metadata, name: metadata.title || prevCurrent.name } : null);
    }
  };
  
  const updateCurrentFileToc = (toc: TocItem[]) => {
    if (currentFile) {
      const updatedFile = { ...currentFile, toc };
      setCurrentFile(updatedFile);
      setFiles(prevFiles => 
        prevFiles.map(f => f.id === currentFile.id ? updatedFile : f)
      );
    }
  };

  const updateLastReadTimestamp = (fileId: string) => {
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === fileId ? { ...file, lastReadAt: new Date() } : file
      )
    );
     if (currentFile?.id === fileId) {
        setCurrentFile(prevCurrent => prevCurrent ? { ...prevCurrent, lastReadAt: new Date() } : null);
    }
  };


  return (
    <EbookContext.Provider value={{
      files,
      currentFile,
      preferences,
      addFile,
      removeFile,
      setCurrentFile,
      updatePreferences,
      updateFileMetadata,
      updateCurrentFileToc, // Provide the new function
      updateLastReadTimestamp,
    }}>
      {children}
    </EbookContext.Provider>
  );
};

