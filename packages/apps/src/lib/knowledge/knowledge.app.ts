import { createApp } from '@lecca-io/toolkit';

import { clearKnowledge } from './actions/clear-knowledge.action';
import { createKnowledge } from './actions/create-knowledge.action';
import { listKnowledge } from './actions/list-knowledge.action';
import { saveToKnowledge } from './actions/save-to-knowledge.action';
import { searchKnowledge } from './actions/search-knowledge.action';

export const knowledge = createApp({
  id: 'knowledge',
  name: 'Knowledge',
  description: 'Utilize knowledge notebooks to store and retrieve information.',
  logoUrl:
    'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/knowledge.svg',
  actions: [searchKnowledge, saveToKnowledge, listKnowledge, createKnowledge, clearKnowledge],
  triggers: [],
  connections: [],
});
