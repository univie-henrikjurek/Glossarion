export interface Translation {
  id: string;
  entry_id: string;
  language_code: string;
  text: string;
  status: 'auto' | 'verified';
  word_type?: string;
  gender?: string;
  article?: string;
  grammar_details?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: string;
  context?: string;
  tags: string[];
  translations: Translation[];
  created_at: string;
  updated_at: string;
}

export interface Language {
  code: string;
  name: string;
}
