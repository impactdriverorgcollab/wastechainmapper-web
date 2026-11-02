import { ApiError, submitFieldReport, uploadPhoto } from './api';
import { deleteRecord, listRecords, saveRecord, type QueuedRecord } from './offline';

export interface SyncOutcome {
  sent: number;
  waiting: number;
  /** Records the server refused. They stay on the phone until the person fixes or deletes them. */
  rejected: { clientRef: string; message: string }[];
  offline: boolean;
  sessionEnded: boolean;
}

let running: Promise<SyncOutcome> | null = null;

/**
 * Sends every saved record. Each record goes in two steps (the report, then its photos), and what
 * has already been sent is remembered, so a dropped connection halfway never creates copies and
 * never loses a photo. Only one run happens at a time.
 */
export function syncAll(token: string): Promise<SyncOutcome> {
  if (!running) running = run(token).finally(() => { running = null; });
  return running;
}

async function run(token: string): Promise<SyncOutcome> {
  const out: SyncOutcome = { sent: 0, waiting: 0, rejected: [], offline: false, sessionEnded: false };
  const records = (await listRecords()).sort((a, b) => a.savedAt.localeCompare(b.savedAt));

  for (const rec of records) {
    try {
      await sendOne(rec, token);
      await deleteRecord(rec.clientRef);
      out.sent++;
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      if (status === 0 || status >= 500 || status === 429) {
        // No signal, or the server is struggling. Keep this one and everything after it for later.
        out.offline = true;
        out.waiting = records.length - out.sent - out.rejected.length;
        return out;
      }
      if (status === 401) {
        out.sessionEnded = true;
        out.waiting = records.length - out.sent - out.rejected.length;
        return out;
      }
      const message = e instanceof Error ? e.message : 'The server did not accept this record.';
      await saveRecord({ ...rec, lastError: message });
      out.rejected.push({ clientRef: rec.clientRef, message });
    }
  }
  out.waiting = out.rejected.length;
  return out;
}

async function sendOne(rec: QueuedRecord, token: string) {
  let { reportId, uploadToken } = rec;
  if (!reportId || !uploadToken) {
    const saved = await submitFieldReport({ ...rec.input, clientRef: rec.clientRef }, token);
    reportId = saved.id;
    uploadToken = saved.uploadToken;
    await saveRecord({ ...rec, reportId, uploadToken, lastError: undefined });
  }
  let sent = rec.photosSent;
  while (sent < rec.photos.length) {
    const p = rec.photos[sent];
    await uploadPhoto(reportId, uploadToken, p.dataUrl, p.capturedAt);
    sent++;
    await saveRecord({ ...rec, reportId, uploadToken, photosSent: sent });
  }
}
