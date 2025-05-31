
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Annotation, ReadingProgress, ReadingSession } from '@/types/annotations';

interface AnnotationContextType {
  annotations: Annotation[];
  readingProgress: Record<string, ReadingProgress>;
  readingSessions: ReadingSession[];
  currentSession: ReadingSession | null;
  
  // Annotation methods
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  getAnnotationsForFile: (fileId: string) => Annotation[];
  
  // Progress methods
  updateProgress: (fileId: string, position: ReadingProgress['currentPosition']) => void;
  getProgress: (fileId: string) => ReadingProgress | undefined;
  
  // Session methods
  startSession: (fileId: string) => void;
  endSession: () => void;
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

  const addAnnotation = (annotationData: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAnnotation: Annotation = {
      ...annotationData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setAnnotations(prev => [...prev, newAnnotation]);
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(annotation => 
      annotation.id === id 
        ? { ...annotation, ...updates, updatedAt: new Date() }
        : annotation
    ));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
  };

  const getAnnotationsForFile = (fileId: string) => {
    return annotations.filter(annotation => annotation.fileId === fileId);
  };

  const updateProgress = (fileId: string, position: ReadingProgress['currentPosition']) => {
    setReadingProgress(prev => ({
      ...prev,
      [fileId]: {
        fileId,
        currentPosition: position,
        totalReadingTime: prev[fileId]?.totalReadingTime || 0,
        lastReadAt: new Date(),
        isFinished: position.percentage >= 100
      }
    }));
  };

  const getProgress = (fileId: string) => {
    return readingProgress[fileId];
  };

  const startSession = (fileId: string) => {
    const session: ReadingSession = {
      id: Date.now().toString(),
      fileId,
      startTime: new Date(),
      duration: 0
    };
    setCurrentSession(session);
  };

  const endSession = () => {
    if (currentSession) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / 60000);
      
      const completedSession = {
        ...currentSession,
        endTime,
        duration
      };
      
      setReadingSessions(prev => [...prev, completedSession]);
      
      // Update total reading time
      setReadingProgress(prev => ({
        ...prev,
        [currentSession.fileId]: {
          ...prev[currentSession.fileId],
          totalReadingTime: (prev[currentSession.fileId]?.totalReadingTime || 0) + duration
        }
      }));
      
      setCurrentSession(null);
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
