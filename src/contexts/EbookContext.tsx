
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface EbookFile {
  id: string;
  name: string;
  type: 'epub' | 'pdf' | 'txt';
  file: File;
  addedAt: Date;
}

export interface ReadingPreferences {
  fontSize: number;
  theme: 'light' | 'dark' | 'sepia';
  fontFamily: string;
}

interface EbookContextType {
  files: EbookFile[];
  currentFile: EbookFile | null;
  preferences: ReadingPreferences;
  addFile: (file: File) => void;
  removeFile: (id: string) => void;
  setCurrentFile: (file: EbookFile | null) => void;
  updatePreferences: (prefs: Partial<ReadingPreferences>) => void;
}

const EbookContext = createContext<EbookContextType | undefined>(undefined);

export const useEbook = () => {
  const context = useContext(EbookContext);
  if (!context) {
    throw new Error('useEbook must be used within an EbookProvider');
  }
  return context;
};

export const EbookProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<EbookFile[]>([]);
  const [currentFile, setCurrentFile] = useState<EbookFile | null>(null);
  const [preferences, setPreferences] = useState<ReadingPreferences>({
    fontSize: 16,
    theme: 'light',
    fontFamily: 'serif'
  });

  const addFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let type: 'epub' | 'pdf' | 'txt';
    
    if (extension === 'epub') type = 'epub';
    else if (extension === 'pdf') type = 'pdf';
    else if (extension === 'txt') type = 'txt';
    else return; // Unsupported format

    const newFile: EbookFile = {
      id: Date.now().toString(),
      name: file.name,
      type,
      file,
      addedAt: new Date()
    };

    setFiles(prev => [...prev, newFile]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
    if (currentFile?.id === id) {
      setCurrentFile(null);
    }
  };

  const updatePreferences = (prefs: Partial<ReadingPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
  };

  return (
    <EbookContext.Provider value={{
      files,
      currentFile,
      preferences,
      addFile,
      removeFile,
      setCurrentFile,
      updatePreferences
    }}>
      {children}
    </EbookContext.Provider>
  );
};
