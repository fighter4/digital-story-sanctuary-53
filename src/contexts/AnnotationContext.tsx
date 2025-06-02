// src/contexts/AnnotationContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Annotation, ReadingProgress, ReadingSession } from '@/types/annotations';
import {
  addAnnotationToDB,
  getAnnotationsFromDB,
  updateAnnotationInDB,
  deleteAnnotationFromDB,
  saveReadingProgressToDB,
  getReadingProgressFromDB,
  addReadingSessionToDB,
  getReadingSessionsFromDB,
} from '@/lib/idb'; // Import IDB utility

interface AnnotationContextType {
  annotations: Annotation[];
  readingProgress: Record<string, ReadingProgress>;
  readingSessions: ReadingSession[];
  currentSession: ReadingSession | null;
  isLoadingAnnotations: boolean;
  
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
  deleteAnnotation: (id: string) => Promise<void>;
  getAnnotationsForFile: (fileId: string) => Annotation[];
  
  updateProgress: (fileId: string, position: ReadingProgress['currentPosition']) => Promise<void>;
  getProgress: (fileId: string) => ReadingProgress | undefined;
  
  startSession: (fileId: string) => void;
  endSession: () => Promise<void>;
  getSessionsForFile: (fileId: string) => ReadingSession[];
}

const AnnotationContext = createContext<AnnotationContextType | undefined>(undefined);

export const useAnnotations = () => {
  const context = useContext(AnnotationContext);
  if (!context) {
    throw new Error('useAnnotations must be used within an AnnotationProvider');
  }
  return context;
};

export const AnnotationProvider = ({ children }: { children: ReactNode }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(true);

  // Load all annotation data from IndexedDB on initial mount
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoadingAnnotations(true);
      try {
        const [dbAnnotations, dbProgress, dbSessions] = await Promise.all([
          getAnnotationsFromDB(),
          getReadingProgressFromDB(),
          getReadingSessionsFromDB(),
        ]);
        // Ensure dates are Date objects
        setAnnotations(dbAnnotations.map(a => ({...a, createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt)})));
        setReadingProgress(Object.fromEntries(Object.entries(dbProgress).map(([key, value]) => [key, {...value, lastReadAt: new Date(value.lastReadAt)}])));
        setReadingSessions(dbSessions.map(s => ({...s, startTime: new Date(s.startTime), endTime: s.endTime ? new Date(s.endTime) : undefined })));

      } catch (error) {
        console.error("Failed to load annotation data from DB:", error);
      } finally {
        setIsLoadingAnnotations(false);
      }
    };
    loadAllData();
  }, []);

  const addAnnotation = async (annotationData: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAnnotation: Annotation = {
      ...annotationData,
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2,9), // More unique ID
      createdAt: new Date(),
      updatedAt: new Date()
    };
    try {
      await addAnnotationToDB(newAnnotation);
      setAnnotations(prev => [...prev, newAnnotation]);
    } catch (error) {
      console.error("Failed to add annotation to DB:", error);
    }
  };

  const updateAnnotation = async (id: string, updates: Partial<Annotation>) => {
    const updatedAnnotationFields = { ...updates, updatedAt: new Date() };
    let fullUpdatedAnnotation: Annotation | undefined;

    setAnnotations(prev => prev.map(annotation => {
      if (annotation.id === id) {
        fullUpdatedAnnotation = { ...annotation, ...updatedAnnotationFields };
        return fullUpdatedAnnotation;
      }
      return annotation;
    }));

    if (fullUpdatedAnnotation) {
      try {
        await updateAnnotationInDB(fullUpdatedAnnotation);
      } catch (error) {
        console.error("Failed to update annotation in DB:", error);
        // Optionally revert state update here or show error
      }
    }
  };

  const deleteAnnotation = async (id: string) => {
    try {
      await deleteAnnotationFromDB(id);
      setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
    } catch (error) {
      console.error("Failed to delete annotation from DB:", error);
    }
  };

  const getAnnotationsForFile = (fileId: string) => {
    return annotations.filter(annotation => annotation.fileId === fileId);
  };

  const updateProgress = async (fileId: string, position: ReadingProgress['currentPosition']) => {
    const newProgressEntry: ReadingProgress = {
      fileId,
      currentPosition: position,
      totalReadingTime: readingProgress[fileId]?.totalReadingTime || 0,
      lastReadAt: new Date(),
      isFinished: position.percentage >= 100
    };
    try {
      await saveReadingProgressToDB(newProgressEntry);
      setReadingProgress(prev => ({
        ...prev,
        [fileId]: newProgressEntry
      }));
    } catch (error) {
      console.error("Failed to save reading progress to DB:", error);
    }
  };

  const getProgress = (fileId: string) => {
    return readingProgress[fileId];
  };

  const startSession = (fileId: string) => {
    // currentSession is ephemeral and doesn't need to be saved until ended
    const session: ReadingSession = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substring(2,9), // More unique ID
      fileId,
      startTime: new Date(),
      duration: 0 // Duration calculated on end
    };
    setCurrentSession(session);
  };

  const endSession = async () => {
    if (currentSession) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / 60000); // Duration in minutes
      
      const completedSession: ReadingSession = {
        ...currentSession,
        endTime,
        duration
      };
      
      try {
        await addReadingSessionToDB(completedSession);
        setReadingSessions(prev => [...prev, completedSession]);
        
        // Update total reading time in the progress store
        const currentProgress = readingProgress[currentSession.fileId] || {
          fileId: currentSession.fileId,
          currentPosition: { percentage: 0 }, // Default if no progress yet
          totalReadingTime: 0,
          lastReadAt: new Date(),
          isFinished: false,
        };
        
        const updatedProgressForFile: ReadingProgress = {
          ...currentProgress,
          totalReadingTime: (currentProgress.totalReadingTime || 0) + duration,
          lastReadAt: new Date(), // Also update lastReadAt on session end
        };

        await saveReadingProgressToDB(updatedProgressForFile);
        setReadingProgress(prev => ({
          ...prev,
          [currentSession.fileId]: updatedProgressForFile
        }));
        
      } catch (error) {
        console.error("Failed to save session or update progress in DB:", error);
      } finally {
        setCurrentSession(null);
      }
    }
  };

  const getSessionsForFile = (fileId: string) => {
    return readingSessions.filter(session => session.fileId === fileId);
  };

  return (
    <AnnotationContext.Provider value={{
      annotations,
      readingProgress,
      readingSessions,
      currentSession,
      isLoadingAnnotations,
      addAnnotation,
      updateAnnotation,
      deleteAnnotation,
      getAnnotationsForFile,
      updateProgress,
      getProgress,
      startSession,
      endSession,
      getSessionsForFile
    }}>
      {children}
    </AnnotationContext.Provider>
  );
};
