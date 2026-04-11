import axios from 'axios';
import type { Entry, Translation } from '../types';
import { useAuthStore } from '../stores/authStore';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
}

export interface Dictionary {
  id: string;
  name: string;
  owner_id: string;
  source_language: string;
  created_at: string;
  role: string;
  member_count: number;
  entry_count: number;
}

export interface DictionaryMember {
  user_id: string;
  username: string;
  email: string;
  role: string;
  invited_at: string;
}

export interface DictionaryDetail extends Dictionary {
  updated_at: string;
  members: DictionaryMember[];
}

export interface Invitation {
  id: string;
  dictionary_id: string;
  dictionary_name: string;
  token: string;
  role: string;
  expires_at: string;
  created_at: string;
  accepted: string;
}

export interface InvitationInfo {
  dictionary_name: string;
  dictionary_id: string;
  role: string;
  invited_by: string;
  expires_at: string;
  already_member: boolean;
}

export const apiService = {
  auth: {
    async login(username: string, password: string): Promise<{ access_token: string; token_type: string; user: User }> {
      const response = await api.post('/auth/login', { username, password });
      return response.data;
    },

    async register(username: string, email: string, password: string): Promise<{ access_token: string; token_type: string; user: User }> {
      const response = await api.post('/auth/register', { username, email, password });
      return response.data;
    },

    async me(): Promise<User> {
      const response = await api.get('/auth/me');
      return response.data;
    },

    async logout(): Promise<void> {
      await api.post('/auth/logout');
    },
  },

  dictionaries: {
    async list(): Promise<Dictionary[]> {
      const response = await api.get('/dictionaries');
      return response.data;
    },

    async get(id: string): Promise<DictionaryDetail> {
      const response = await api.get(`/dictionaries/${id}`);
      return response.data;
    },

    async create(name: string, sourceLanguage: string = 'de'): Promise<Dictionary> {
      const response = await api.post('/dictionaries', { name, source_language: sourceLanguage });
      return response.data;
    },

    async update(id: string, data: { name?: string; source_language?: string }): Promise<Dictionary> {
      const response = await api.put(`/dictionaries/${id}`, data);
      return response.data;
    },

    async delete(id: string): Promise<void> {
      await api.delete(`/dictionaries/${id}`);
    },

    async members(id: string): Promise<DictionaryMember[]> {
      const response = await api.get(`/dictionaries/${id}/members`);
      return response.data;
    },

    async updateMemberRole(dictionaryId: string, userId: string, role: string): Promise<void> {
      await api.put(`/dictionaries/${dictionaryId}/members/${userId}`, { role });
    },

    async removeMember(dictionaryId: string, userId: string): Promise<void> {
      await api.delete(`/dictionaries/${dictionaryId}/members/${userId}`);
    },
  },

  invitations: {
    async create(dictionaryId: string, role: string = 'editor', expiresDays: number = 7): Promise<Invitation> {
      const response = await api.post(`/invitations/dictionaries/${dictionaryId}/invite`, { role, expires_days: expiresDays });
      return response.data;
    },

    async get(token: string): Promise<InvitationInfo> {
      const response = await api.get(`/invitations/${token}`);
      return response.data;
    },

    async accept(token: string): Promise<{ message: string; dictionary_id: string }> {
      const response = await api.post(`/invitations/${token}/accept`);
      return response.data;
    },

    async decline(token: string): Promise<{ message: string }> {
      const response = await api.post(`/invitations/${token}/decline`);
      return response.data;
    },
  },

  async getEntries(dictionaryId?: string): Promise<Entry[]> {
    const params = dictionaryId ? { dictionary_id: dictionaryId } : {};
    const response = await api.get<Entry[]>('/entries', { params });
    return response.data;
  },

  async getEntry(id: string): Promise<Entry> {
    const response = await api.get<Entry>(`/entries/${id}`);
    return response.data;
  },

  async createEntry(data: { context?: string; tags: string[]; source_language?: string; dictionary_id?: string }): Promise<Entry> {
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
