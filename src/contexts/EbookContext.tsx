import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ReadingProgress } from '@/types/annotations'; // Assuming ReadingProgress might be used for lastReadAt

// --- Enhanced EbookFile Interface ---
export interface EbookFile {
  id: string;
  name: string; // Original filename, can be used as default title
  type: 'epub' | 'pdf' | 'txt';
  file: File; // The actual file object
  addedAt: Date;
  // --- New metadata fields ---
  title?: string; // Editable title
  author?: string;
  genre?: string;
  coverImageUrl?: string; // URL for a cover image
  lastReadAt?: Date; // For "sort by recently read"
  // --- Fields for collections (deferred for now, but good to keep in mind) ---
  // collectionIds?: string[]; 
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
  removeFile: (ids: string | string[]) => void; // Modified to accept array for bulk delete
  setCurrentFile: (file: EbookFile | null) => void;
  updatePreferences: (prefs: Partial<ReadingPreferences>) => void;
  updateFileMetadata: (id: string, metadata: Partial<Omit<EbookFile, 'id' | 'file' | 'type'>>) => void;
  // --- Future collection methods (deferred) ---
  // createCollection: (name: string) => string;
  // deleteCollection: (id: string) => void;
  // addBookToCollection: (fileId: string, collectionId: string) => void;
  // removeBookFromCollection: (fileId: string, collectionId: string) => void;
  // getCollections: () => Collection[]; // Define Collection interface if needed
}

const EbookContext = createContext<EbookContextType | undefined>(undefined);

export const useEbook = () => {
  const context = useContext(EbookContext);
  if (!context) {
    throw new Error('useEbook must be used within an EbookProvider');
  }
  return context;
};

// Helper to attempt to extract initial metadata (very basic)
const extractInitialMetadata = async (file: File): Promise<Partial<EbookFile>> => {
    const metadata: Partial<EbookFile> = {
        title: file.name.replace(/\.[^/.]+$/, "") // Default title from filename
    };
    // Basic author extraction from filename (e.g., "Author - Title.epub")
    const nameParts = file.name.split(' - ');
    if (nameParts.length > 1) {
        metadata.author = nameParts[0].trim();
        metadata.title = nameParts.slice(1).join(' - ').replace(/\.[^/.]+$/, "").trim();
    }
    // For EPUB, more advanced parsing could be done here if epubjs is used during addFile
    // For PDF, pdfjs-dist could be used similarly.
    // This is kept simple for now.
    return metadata;
};


export const EbookProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<EbookFile[]>(() => {
    // Load files from localStorage if available
    const savedFiles = localStorage.getItem('ebookFiles');
    if (savedFiles) {
      const parsedFiles = JSON.parse(savedFiles) as Array<Omit<EbookFile, 'file' | 'addedAt' | 'lastReadAt'> & { addedAt: string, lastReadAt?: string, fileDataUrl?: string }>;
      return parsedFiles.map(f => ({
        ...f,
        // Reconstruct File object if needed (complex, placeholder for now)
        // For simplicity, we'll assume File objects are not persisted directly in localStorage
        // and would need to be re-selected or handled via a persistent storage solution like IndexedDB.
        // This example will lose the actual `File` object on reload if not handled.
        // A common pattern is to store file metadata and a reference (e.g., IndexedDB key) to the actual file blob.
        file: new File([], f.name, { type: `application/${f.type}` }), // Placeholder File
        addedAt: new Date(f.addedAt),
        lastReadAt: f.lastReadAt ? new Date(f.lastReadAt) : undefined,
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

  // Save files and preferences to localStorage
  useEffect(() => {
    // For localStorage, we can't store the File object directly.
    // A more robust solution would use IndexedDB for file storage.
    // This is a simplified version that stores metadata.
    const storableFiles = files.map(f => {
        const { file, ...meta } = f; // Exclude 'file' object
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
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2,9), // More unique ID
      name: file.name, // Original filename
      type,
      file, // Store the actual File object
      addedAt: new Date(),
      lastReadAt: new Date(), // Set lastReadAt to addedAt initially
      title: initialMeta.title || file.name.replace(/\.[^/.]+$/, ""),
      author: initialMeta.author || "Unknown Author",
      genre: "Unknown Genre",
      // coverImageUrl: initialMeta.coverImageUrl // If you implement cover extraction
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

  const updateFileMetadata = (id: string, metadata: Partial<Omit<EbookFile, 'id' | 'file' | 'type'>>) => {
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === id ? { ...file, ...metadata, name: metadata.title || file.name } : file
      )
    );
    // If the current file is being updated, update its state too
    if (currentFile?.id === id) {
        setCurrentFile(prevCurrent => prevCurrent ? { ...prevCurrent, ...metadata, name: metadata.title || prevCurrent.name } : null);
    }
  };
  
  // Function to update lastReadAt (example, call this from AnnotationContext or reader components)
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
      updateFileMetadata
    }}>
      {children}
    </EbookContext.Provider>
  );
};
