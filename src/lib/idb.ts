// src/lib/idb.ts

import { EbookFile } from '@/contexts/EbookContext'; // Assuming EbookFile is exported
import { Annotation, ReadingProgress, ReadingSession } from '@/types/annotations';

const DB_NAME = 'EbookReaderDB';
const DB_VERSION = 1;

// Store names
const EBOOKS_STORE_NAME = 'ebooks';
const ANNOTATIONS_STORE_NAME = 'annotations';
const PROGRESS_STORE_NAME = 'readingProgress';
const SESSIONS_STORE_NAME = 'readingSessions';

interface StorableEbookFile extends Omit<EbookFile, 'file'> {
  fileBlob: Blob; // Store the file content as a Blob
}

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(EBOOKS_STORE_NAME)) {
        db.createObjectStore(EBOOKS_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ANNOTATIONS_STORE_NAME)) {
        const annotationsStore = db.createObjectStore(ANNOTATIONS_STORE_NAME, { keyPath: 'id' });
        annotationsStore.createIndex('fileId', 'fileId', { unique: false });
      }
      if (!db.objectStoreNames.contains(PROGRESS_STORE_NAME)) {
        db.createObjectStore(PROGRESS_STORE_NAME, { keyPath: 'fileId' });
      }
      if (!db.objectStoreNames.contains(SESSIONS_STORE_NAME)) {
        const sessionsStore = db.createObjectStore(SESSIONS_STORE_NAME, { keyPath: 'id' });
        sessionsStore.createIndex('fileId', 'fileId', { unique: false });
      }
      console.log('IndexedDB upgrade needed and completed.');
    };

    request.onsuccess = (event) => {
      console.log('IndexedDB opened successfully.');
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      dbPromise = null; // Reset promise on error
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
  return dbPromise;
};

// --- EbookFile Operations ---

export const addEbookToDB = async (ebookFile: EbookFile): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EBOOKS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(EBOOKS_STORE_NAME);
    
    // Convert File to Blob for storage
    const fileBlob = new Blob([ebookFile.file], { type: ebookFile.file.type });
    const storableEbook: StorableEbookFile = {
      ...ebookFile,
      fileBlob,
    };
    // Remove the 'file' property as we are storing 'fileBlob'
    delete (storableEbook as any).file;


    const request = store.put(storableEbook);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const getEbooksFromDB = async (): Promise<EbookFile[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EBOOKS_STORE_NAME, 'readonly');
    const store = transaction.objectStore(EBOOKS_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = (event) => {
      const storableFiles = (event.target as IDBRequest).result as StorableEbookFile[];
      const ebookFiles: EbookFile[] = storableFiles.map(sf => {
        // Reconstruct the File object from the Blob
        const file = new File([sf.fileBlob], sf.name, { type: sf.fileBlob.type, lastModified: sf.addedAt.getTime() });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fileBlob, ...rest } = sf; // Exclude fileBlob from the final object
        return { ...rest, file } as EbookFile;
      });
      resolve(ebookFiles);
    };
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const deleteEbookFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EBOOKS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(EBOOKS_STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const updateEbookMetadataInDB = async (id: string, metadata: Partial<Omit<EbookFile, 'file' | 'fileBlob'>>): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(EBOOKS_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(EBOOKS_STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = (event) => {
      const storableFile = (event.target as IDBRequest).result as StorableEbookFile;
      if (storableFile) {
        const updatedFile = { ...storableFile, ...metadata };
        const putRequest = store.put(updatedFile);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = (putEvent) => reject((putEvent.target as IDBRequest).error);
      } else {
        reject(new Error(`Ebook with id ${id} not found in DB.`));
      }
    };
    getRequest.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};


// --- Annotation Operations ---

export const addAnnotationToDB = async (annotation: Annotation): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(ANNOTATIONS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(ANNOTATIONS_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.put(annotation);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const getAnnotationsFromDB = async (): Promise<Annotation[]> => {
  const db = await openDB();
  const transaction = db.transaction(ANNOTATIONS_STORE_NAME, 'readonly');
  const store = transaction.objectStore(ANNOTATIONS_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = (event) => resolve((event.target as IDBRequest).result as Annotation[]);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const updateAnnotationInDB = async (annotation: Annotation): Promise<void> => {
  return addAnnotationToDB(annotation); // put will update if key exists
};

export const deleteAnnotationFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(ANNOTATIONS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(ANNOTATIONS_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

// --- ReadingProgress Operations ---

export const saveReadingProgressToDB = async (progress: ReadingProgress): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(PROGRESS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(PROGRESS_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.put(progress); // `put` will add or update
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const getReadingProgressFromDB = async (): Promise<Record<string, ReadingProgress>> => {
  const db = await openDB();
  const transaction = db.transaction(PROGRESS_STORE_NAME, 'readonly');
  const store = transaction.objectStore(PROGRESS_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = (event) => {
      const progressArray = (event.target as IDBRequest).result as ReadingProgress[];
      const progressRecord: Record<string, ReadingProgress> = {};
      progressArray.forEach(p => {
        progressRecord[p.fileId] = p;
      });
      resolve(progressRecord);
    };
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};


// --- ReadingSession Operations ---

export const addReadingSessionToDB = async (session: ReadingSession): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(SESSIONS_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SESSIONS_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

export const getReadingSessionsFromDB = async (): Promise<ReadingSession[]> => {
  const db = await openDB();
  const transaction = db.transaction(SESSIONS_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SESSIONS_STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = (event) => resolve((event.target as IDBRequest).result as ReadingSession[]);
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
};

// Clear all data (for development/reset purposes)
export const clearAllDataFromDB = async (): Promise<void> => {
    const db = await openDB();
    const storeNames = [EBOOKS_STORE_NAME, ANNOTATIONS_STORE_NAME, PROGRESS_STORE_NAME, SESSIONS_STORE_NAME];
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeNames, 'readwrite');
        let clearedCount = 0;
        storeNames.forEach(storeName => {
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => {
                clearedCount++;
                if (clearedCount === storeNames.length) {
                    console.log('All data cleared from IndexedDB.');
                    resolve();
                }
            };
            request.onerror = (event) => {
                console.error(`Error clearing store ${storeName}:`, (event.target as IDBRequest).error);
                // Don't reject immediately, try to clear other stores
            };
        });
        transaction.oncomplete = () => {
            if (clearedCount === storeNames.length) resolve();
            else reject(new Error('Failed to clear all stores.'));
        };
        transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
};
