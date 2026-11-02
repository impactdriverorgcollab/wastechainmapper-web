// Field records are kept on the phone until they are sent. Signal in the field is unreliable, so a
// record is saved here first and sent when a connection is available. The photos are stored with it.
// IndexedDB is used because localStorage is too small to hold photos.

import type { SubmissionInput } from './types';

const DB_NAME = 'wcm-field';
const STORE = 'queue';

export interface QueuedRecord {
  /** Also sent to the server as clientRef, so a record sent twice is saved once. */
  clientRef: string;
  savedAt: string;
  input: SubmissionInput;
  photos: { dataUrl: string; capturedAt?: string }[];
  /** Set after the report itself is saved, so a retry sends only the photos that are left. */
  reportId?: string;
  uploadToken?: string;
  photosSent: number;
  lastError?: string;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'clientRef' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Storage is not available.'));
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => { db.close(); resolve(req.result); };
        tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Storage failed.')); };
        tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Storage is full.')); };
      }),
  );
}

export const newClientRef = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const saveRecord = (r: QueuedRecord) => run('readwrite', (s) => s.put(r));
export const deleteRecord = (clientRef: string) => run('readwrite', (s) => s.delete(clientRef));
export const listRecords = () => run<QueuedRecord[]>('readonly', (s) => s.getAll());
