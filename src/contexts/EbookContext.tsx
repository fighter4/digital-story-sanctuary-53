// src/contexts/EbookContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { TocItem } from '@/types/toc';
import { 
  addEbookToDB, 
  getEbooksFromDB, 
  deleteEbookFromDB,
  updateEbookMetadataInDB
} from '@/lib/idb'; // Import IDB utility

// EbookFile interface remains the same
export interface EbookFile {
  id: string;
  name: string; 
  type: 'epub' | 'pdf' | 'txt';
  file: File; // This will be reconstructed from Blob on load
  addedAt: Date;
  title?: string; 
  author?: string;
  genre?: string;
  coverImageUrl?: string; 
  lastReadAt?: Date; 
  toc?: TocItem[];
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
  isLoadingFiles: boolean; // To indicate when files are being loaded from DB
  addFile: (file: File) => Promise<void>; // Make async
  removeFile: (ids: string | string[]) => Promise<void>; // Make async
  setCurrentFile: (file: EbookFile | null) => void;
  updatePreferences: (prefs: Partial<ReadingPreferences>) => void;
  updateFileMetadata: (id: string, metadata: Partial<Omit<EbookFile, 'id' | 'file' | 'type' | 'toc'>>) => Promise<void>; // Make async
  updateCurrentFileToc: (toc: TocItem[]) => void;
  updateLastReadTimestamp: (fileId: string) => Promise<void>; // Make async
}

const EbookContext = createContext<EbookContextType | undefined>(undefined);

export const useEbook = () => {
  const context = useContext(EbookContext);
  if (!context) {
    throw new Error('useEbook must be used within an EbookProvider');
  }
  return context;
};

// Helper for initial metadata, unchanged
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
  const [files, setFiles] = useState<EbookFile[]>([]);
  const [currentFile, setCurrentFile] = useState<EbookFile | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [preferences, setPreferences] = useState<ReadingPreferences>(() => {
    const savedPrefs = localStorage.getItem('ebookPreferences'); // Preferences can still use localStorage
    return savedPrefs ? JSON.parse(savedPrefs) : {
      fontSize: 16,
      theme: 'light',
      fontFamily: 'serif',
      highlightColor: '#ffeb3b'
    };
  });

  // Load files from IndexedDB on initial mount
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoadingFiles(true);
      try {
        const dbFiles = await getEbooksFromDB();
        // Ensure dates are Date objects
        const processedFiles = dbFiles.map(f => ({
          ...f,
          addedAt: new Date(f.addedAt),
          lastReadAt: f.lastReadAt ? new Date(f.lastReadAt) : undefined,
        }));
        setFiles(processedFiles);
      } catch (error) {
        console.error("Failed to load ebooks from DB:", error);
        // Handle error, maybe show a toast to the user
      } finally {
        setIsLoadingFiles(false);
      }
    };
    loadFiles();
  }, []);

  // Save preferences to localStorage (remains the same)
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
      name: file.name, // Store original file name
      type,
      file, // Keep the File object for immediate use
      addedAt: new Date(),
      lastReadAt: new Date(), // Set lastReadAt to addedAt initially
      title: initialMeta.title || file.name.replace(/\.[^/.]+$/, ""),
      author: initialMeta.author || "Unknown Author",
      genre: "Unknown Genre",
      toc: [],
    };

    try {
      await addEbookToDB(newFile); // Add to IndexedDB
      setFiles(prev => [...prev, newFile]); // Update state
    } catch (error) {
      console.error("Failed to add ebook to DB:", error);
      // Handle error (e.g., show toast)
    }
  };

  const removeFile = async (idsToRemove: string | string[]) => {
    const idsArray = Array.isArray(idsToRemove) ? idsToRemove : [idsToRemove];
    try {
      for (const id of idsArray) {
        await deleteEbookFromDB(id); // Delete from IndexedDB
      }
      setFiles(prev => prev.filter(file => !idsArray.includes(file.id)));
      if (currentFile && idsArray.includes(currentFile.id)) {
        setCurrentFile(null);
      }
    } catch (error) {
      console.error("Failed to remove ebook(s) from DB:", error);
    }
  };

  const updatePreferences = (prefs: Partial<ReadingPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  const updateFileMetadata = async (id: string, metadata: Partial<Omit<EbookFile, 'id' | 'file' | 'type' | 'toc'>>) => {
    try {
      // Prepare metadata for DB (without File object)
      const dbMetadata: Partial<Omit<EbookFile, 'file' | 'fileBlob'>> = { ...metadata };
      if (metadata.name && !metadata.title) { // If name is updated, reflect in title for DB
        dbMetadata.title = metadata.name;
      } else if (metadata.title && !metadata.name) { // If title is updated, reflect in name for DB
         dbMetadata.name = metadata.title;
      }


      await updateEbookMetadataInDB(id, dbMetadata);
      
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === id ? { ...f, ...metadata, name: metadata.title || metadata.name || f.name } : f
        )
      );
      if (currentFile?.id === id) {
          setCurrentFile(prevCurrent => prevCurrent ? { ...prevCurrent, ...metadata, name: metadata.title || metadata.name || prevCurrent.name } : null);
      }
    } catch (error) {
      console.error("Failed to update ebook metadata in DB:", error);
    }
  };
  
  const updateCurrentFileToc = useCallback((toc: TocItem[]) => {
    if (currentFile) {
      const updatedFile = { ...currentFile, toc };
      setCurrentFile(updatedFile); // Update currentFile in context state
      setFiles(prevFiles => 
        prevFiles.map(f => f.id === currentFile.id ? updatedFile : f)
      );
      // TOC is part of EbookFile metadata, so it will be saved with the ebook in IndexedDB
      // when updateFileMetadata or addFile is called.
      // If TOC needs to be saved independently upon generation:
      updateEbookMetadataInDB(currentFile.id, { toc });
    }
  }, [currentFile]);

  const updateLastReadTimestamp = async (fileId: string) => {
    const newLastReadAt = new Date();
    try {
      await updateEbookMetadataInDB(fileId, { lastReadAt: newLastReadAt });
      setFiles(prevFiles =>
        prevFiles.map(file =>
          file.id === fileId ? { ...file, lastReadAt: newLastReadAt } : file
        )
      );
       if (currentFile?.id === fileId) {
          setCurrentFile(prevCurrent => prevCurrent ? { ...prevCurrent, lastReadAt: newLastReadAt } : null);
      }
    } catch (error) {
      console.error("Failed to update last read timestamp in DB:", error);
    }
  };


  return (
    <EbookContext.Provider value={{
      files,
      currentFile,
      preferences,
      isLoadingFiles,
      addFile,
      removeFile,
      setCurrentFile,
      updatePreferences,
      updateFileMetadata,
      updateCurrentFileToc,
      updateLastReadTimestamp,
    }}>
      {children}
    </EbookContext.Provider>
  );
};
