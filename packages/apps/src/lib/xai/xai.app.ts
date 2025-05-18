import { createApp } from '@lecca-io/toolkit';

import { chatFromText } from './actions/chat-from-text.action';
import { xAiApiKey } from './connections/xai.api-key';

export const xai = createApp({
  id: 'xai',
  name: 'xAI',
  description: 'Grok language models provided by xAI',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/xai.svg',
  actions: [chatFromText],
  triggers: [],
  connections: [xAiApiKey],
});
