import axios from 'axios';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.API_URL || 'http://localhost:8000';
const entries = JSON.parse(readFileSync(join(__dirname, '../data/sample_entries.json'), 'utf-8'));

async function seed() {
  console.log('Seeding database...');
  
  for (const entry of entries) {
    try {
      const response = await axios.post(`${API_URL}/api/entries`, {
        context: entry.context,
        tags: entry.tags
      });
      
      const entryId = response.data.id;
      console.log(`Created entry: ${entry.context.substring(0, 30)}...`);
      
      for (const [lang, text] of Object.entries(entry.translations)) {
        await axios.post(
          `${API_URL}/api/entries/${entryId}/translations?language_code=${lang}&text=${encodeURIComponent(text as string)}&status=verified`
        );
      }
    } catch (error) {
      console.error(`Failed to create entry: ${entry.context}`);
    }
  }
  
  console.log('Seeding complete!');
}

seed();
