import { createApp } from '@lecca-io/toolkit';

import { customPrompt } from './actions/custom-prompt.action';
import { decideWithAi } from './actions/decide-with-ai.action';
import { extractWithAi } from './actions/extract-with-ai.action';
import { listAgents } from './actions/list-agents.action';
import { messageAgent } from './actions/message-agent.action';
import { summarizeText } from './actions/summarize-text.action';
import { translateText } from './actions/translate-text.action';

export const ai = createApp({
  id: 'ai',
  name: 'AI',
  description: `Pre-configured AI actions`,
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/ai.svg',
  actions: [
    messageAgent,
    extractWithAi,
    decideWithAi,
    customPrompt,
    translateText,
    summarizeText,
    listAgents,
  ],
  triggers: [],
  connections: [],
});
