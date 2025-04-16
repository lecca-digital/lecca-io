import { createAction, createTextInputField } from '@lecca-io/toolkit';
import { z } from 'zod';

export const think = createAction({
  id: 'ai_action_think',
  name: 'Think',
  description:
    'Use the tool to think about something. It will not obtain new information, but just append the thought to the log.',
  iconUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/ai.svg',
  inputConfig: [
    createTextInputField({
      id: 'thought',
      label: 'Thought',
      description: 'The reasoning or thought to log',
      required: {
        missingMessage: 'Thought is required',
        missingStatus: 'warning',
      },
      placeholder: 'Enter your thought process here',
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
