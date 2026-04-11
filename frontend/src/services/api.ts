import axios from 'axios';
import type { Entry, Translation } from '../types';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
});

export const apiService = {
  async getEntries(): Promise<Entry[]> {
    const response = await api.get<Entry[]>('/entries');
    return response.data;
  },

  async getEntry(id: string): Promise<Entry> {
    const response = await api.get<Entry>(`/entries/${id}`);
    return response.data;
  },

  async createEntry(data: { context?: string; tags: string[] }): Promise<Entry> {
    const response = await api.post<Entry>('/entries', data);
    return response.data;
  },

  async updateEntry(id: string, data: { context?: string; tags?: string[] }): Promise<Entry> {
    const response = await api.put<Entry>(`/entries/${id}`, data);
    return response.data;
  },

  async deleteEntry(id: string): Promise<void> {
    await api.delete(`/entries/${id}`);
  },

  async addTranslation(
    entryId: string,
    languageCode: string,
    text: string,
    status: string = 'auto'
  ): Promise<Translation> {
    const response = await api.post<Translation>(
      `/entries/${entryId}/translations`,
      { language_code: languageCode, text, status }
    );
    return response.data;
  },

  async updateTranslation(
    id: string,
    data: { text?: string; status?: string; word_type?: string; gender?: string; article?: string }
  ): Promise<Translation> {
    const response = await api.put<Translation>(`/translations/${id}`, data);
    return response.data;
  },

  async deleteTranslation(id: string): Promise<void> {
    await api.delete(`/translations/${id}`);
  },

  async autoTranslate(entryId: string, targetLangs?: string[]): Promise<{ translations: Array<{ language_code: string; text: string }> }> {
    const url = targetLangs && targetLangs.length > 0
      ? `/entries/${entryId}/translate?${targetLangs.map(l => `target_langs=${l}`).join('&')}`
      : `/entries/${entryId}/translate`;
    const response = await api.post<{ translations: Array<{ language_code: string; text: string }> }>(url);
    return response.data;
  },

  async getSyncData(): Promise<{ entries: Entry[]; sync_timestamp: string }> {
    const response = await api.get('/sync');
    return response.data;
  },

  async getLanguages(): Promise<{ source: string; targets: string[]; available: Array<{ code: string; name: string }> }> {
    const response = await api.get('/languages');
    return response.data;
  },

  async healthCheck(): Promise<{ status: string; libretranslate: string }> {
    const response = await api.get('/health');
    return response.data;
  },
};
