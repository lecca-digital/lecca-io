import { LanguageModelUsage, generateText } from 'ai';
import { z } from 'zod';

import { Action, RunActionArgs } from '@/apps/lib/action';
import { InputConfig } from '@/apps/lib/input-config';

import { OpenAI } from '../openai.app';

export class ChatFromText extends Action {
  app: OpenAI;
  id = 'openai_action_chat-from-text';
  name = 'Chat from Text';
  description = 'Chat with an AI model using text input';
  aiSchema = z.object({
    model: z.string().min(1).describe('The ID of the model to use'),
    messages: z.array(
      z.object({
        role: z
          .enum(['user', 'system', 'assistant'])
          .describe('Role of the message sender'),
        content: z.string().min(1).describe('The content of the message'),
      }),
    ),
    maxTokens: z
      .number()
      .int()
      .positive()
      .describe('The maximum tokens')
      .nullable()
      .optional(),
  });
  inputConfig: InputConfig[] = [
    this.app.dynamicSelectModel(),
    {
      id: 'messages',
      occurenceType: 'multiple',
      label: 'Messages',
      description: 'One or more messages and roles sent to generate a response',
      inputConfig: [
        {
          id: 'role',
          label: 'Role',
          inputType: 'select',
          description:
            'Role of the message sender. The model will use this information when generating a response.',
          hideCustomTab: true,
          selectOptions: [
            {
              value: 'user',
              label: 'User',
            },
            {
              value: 'system',
              label: 'System',
            },
            {
              value: 'assistant',
              label: 'Assistant',
            },
          ],
          required: {
            missingMessage: 'Role is required',
            missingStatus: 'warning',
          },
        },
        {
          id: 'content',
          label: 'Content',
          inputType: 'text',
          description: 'One or more messages sent to generate a response',
          required: {
            missingMessage: 'Content is required',
            missingStatus: 'warning',
          },
        },
      ],
    },
  ];

  async run({
    configValue,
    connection,
  }: RunActionArgs<ConfigValue>): Promise<Response> {
    const openai = this.app.openai({
      apiKey: connection.apiKey,
    });

    const { model, messages, maxTokens } = configValue;

    const run = await generateText({
      model: openai.languageModel(model),
      messages: messages as any,
      maxTokens,
    });

    return {
      response: run.text,
      usage: run.usage,
    };
  }

  async mockRun(): Promise<Response> {
    return {
      response: 'This is a mock response',
      usage: {
        completionTokens: 100,
        promptTokens: 100,
        totalTokens: 200,
      },
    };
  }
}

type ConfigValue = z.infer<ChatFromText['aiSchema']>;

type Response = {
  response: string;
  usage: LanguageModelUsage;
};
