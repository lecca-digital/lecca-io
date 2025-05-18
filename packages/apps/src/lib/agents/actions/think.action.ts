import { createAction, createMarkdownField } from '@lecca-io/toolkit';
import { z } from 'zod';

export const think = createAction({
  id: 'agent_action_think',
  name: 'Think',
  description:
    'Use the tool to think about something. It will not obtain new information, but just append the thought to the log.',
  iconUrl:
    'https://lecca-io.s3.us-east-2.amazonaws.com/assets/actions/agent_action_think.svg',
  inputConfig: [
    createMarkdownField({
      id: 'markdown',
      markdown:
        'This action will allow an AI Agent to log out their thoughts which helps with LLM performance.',
    }),
  ],

  aiSchema: z.object({
    thought: z.string().describe('The reasoning or thought to log'),
  }),

  run: async ({ configValue }) => {
    if (!configValue.thought) {
      throw new Error(`No thought provided to log`);
    }

    return {
      thought: configValue.thought,
    };
  },

  mockRun: async ({ configValue }) => {
    return {
      thought: configValue.thought || 'Sample thought for testing',
    };
  },
});
