import { z } from 'zod';

import { Action, RunActionArgs } from '@/apps/lib/action';
import { InputConfig } from '@/apps/lib/input-config';

import { Apify } from '../apify.app';

export class ListTasks extends Action {
  app: Apify;
  id = 'apify_action_list-tasks';
  name = 'List Tasks';
  description = 'Lists all tasks in the Apify account';
  aiSchema = z.object({});
  inputConfig: InputConfig[] = [];

  async run({
    connection,
    workspaceId,
  }: RunActionArgs<ConfigValue>): Promise<Response> {
    const url = `https://api.apify.com/v2/actor-tasks`;

    const result = await this.app.http.loggedRequest({
      method: 'GET',
      url,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${connection.apiKey}`,
      },
      workspaceId,
    });

    return { tasks: result.data?.data?.items ?? [] };
  }

  async mockRun(): Promise<Response> {
    return {
      tasks: [
        {
          id: 'task1',
          name: 'Sample Task 1',
          actId: 'actId1',
          actName: 'Sample Actor 1',
          actUsername: 'actor1',
          createdAt: '2021-08-01T12:00:00Z',
          modifiedAt: '2021-08-01T12:00:00Z',
          stats: { totalRuns: 10 },
          title: 'Sample Task 1',
          userId: 'user1',
          username: 'user1',
        },
      ],
    };
  }
}

type ConfigValue = z.infer<ListTasks['aiSchema']>;

type Response = {
  tasks: Array<{
    id: string;
    name: string;
    actId: string;
    actName: string;
    actUsername: string;
    createdAt: string;
    modifiedAt: string;
    stats: { totalRuns: number };
    title: string;
    userId: string;
    username: string;
  }>;
};
