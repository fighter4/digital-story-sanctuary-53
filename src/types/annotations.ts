
export interface Annotation {
  id: string;
  fileId: string;
  type: 'highlight' | 'note' | 'bookmark';
  content: string;
  note?: string;
  position: {
    cfi?: string; // for EPUB
    page?: number; // for PDF
    line?: number; // for TXT
    offset?: number; // character offset for TXT
  };
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadingProgress {
  fileId: string;
  currentPosition: {
    cfi?: string;
    page?: number;
    line?: number;
    percentage: number;
  };
  totalReadingTime: number; // in minutes
  lastReadAt: Date;
  isFinished: boolean;
}

export interface ReadingSession {
  id: string;
  fileId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  pagesRead?: number;
  wordsRead?: number;
}
