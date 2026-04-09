import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Entry } from '../types';

interface GlossarionDB extends DBSchema {
  entries: {
    key: string;
    value: Entry;
    indexes: { 'by-updated': string };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      data: unknown;
      timestamp: number;
    };
  };
}

let db: IDBPDatabase<GlossarionDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<GlossarionDB>> {
  if (db) return db;
  
  db = await openDB<GlossarionDB>('glossarion', 1, {
    upgrade(database) {
      const entryStore = database.createObjectStore('entries', { keyPath: 'id' });
      entryStore.createIndex('by-updated', 'updated_at');
      database.createObjectStore('syncQueue', { keyPath: 'id' });
    },
  });
  
  return db;
}

export const syncService = {
  async saveEntriesLocally(entries: Entry[]): Promise<void> {
    const database = await getDB();
    const tx = database.transaction('entries', 'readwrite');
    await Promise.all([
      ...entries.map(entry => tx.store.put(entry)),
      tx.done,
    ]);
  },

  async getLocalEntries(): Promise<Entry[]> {
    const database = await getDB();
    return database.getAll('entries');
  },

  async getLocalEntry(id: string): Promise<Entry | undefined> {
    const database = await getDB();
    return database.get('entries', id);
  },

  async updateLocalEntry(entry: Entry): Promise<void> {
    const database = await getDB();
    await database.put('entries', entry);
  },

  async deleteLocalEntry(id: string): Promise<void> {
    const database = await getDB();
    await database.delete('entries', id);
  },

  async addToSyncQueue(
    type: 'create' | 'update' | 'delete',
    data: unknown
  ): Promise<void> {
    const database = await getDB();
    await database.add('syncQueue', {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
    });
  },

  async getSyncQueue(): Promise<Array<{ id: string; type: string; data: unknown; timestamp: number }>> {
    const database = await getDB();
    return database.getAll('syncQueue');
  },

  async clearSyncQueue(): Promise<void> {
    const database = await getDB();
    await database.clear('syncQueue');
  },

  async clearAllData(): Promise<void> {
    const database = await getDB();
    await database.clear('entries');
    await database.clear('syncQueue');
  },
};
