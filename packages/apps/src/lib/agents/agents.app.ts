import { createApp } from '@lecca-io/toolkit';

import { listAgents } from './actions/list-agents.action';
import { manageSubtasks } from './actions/manage-subtasks.action';
import { messageAgent } from './actions/message-agent.action';
import { think } from './actions/think.action';

export const agents = createApp({
  id: 'agents',
  name: 'Agents',
  description: `Message and manage your AI agents.`,
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/agents.svg',
  actions: [messageAgent, listAgents, think, manageSubtasks],
  triggers: [],
  connections: [],
});
