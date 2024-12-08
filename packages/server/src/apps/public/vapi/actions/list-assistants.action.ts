import { z } from 'zod';

import { Action, RunActionArgs } from '@/apps/lib/action';
import { InputConfig } from '@/apps/lib/input-config';

import { Vapi } from '../vapi.app';

export class ListAssistants extends Action {
  app: Vapi;
  id = 'vapi_action_list-assistants';
  name = 'List Assistants';
  description = 'Retrieve the list of VAPI assistants';
  aiSchema = z.object({});
  inputConfig: InputConfig[] = [];

  async run({
    connection,
    workspaceId,
  }: RunActionArgs<ConfigValue>): Promise<Response> {
    const url = 'https://api.vapi.ai/assistant';

    const result = await this.app.http.loggedRequest({
      method: 'GET',
      url,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${connection.apiKey}`,
      },
      workspaceId,
    });

    return {
      assistants: result.data,
    } as any;
  }

  async mockRun(): Promise<Response> {
    return mock;
  }
}

const mock = {
  assistants: [
    {
      id: 'assistant_1',
      name: 'Assistant 1',
      createdAt: '2023-11-07T05:31:56Z',
      voicemailMessage: '<string>',
      recordingEnabled: true,
      model: {
        emotionRecognitionEnabled: false,
        messages: [
          {
            content: 'Hello World',
            role: 'system',
          },
        ],
        model: 'gpt-3.5-turbo',
        provider: 'openai',
      },
    },
  ],
};

type ConfigValue = z.infer<ListAssistants['aiSchema']>;

type Response = typeof mock;
