import { createAppWebhookTrigger } from '@lecca-io/toolkit';

import { shared } from '../shared/linear.shared';

export const newIssue = createAppWebhookTrigger<
  {
    teamId: string;
  },
  any,
  any
>({
  id: 'linear_trigger_new-issue',
  name: 'New Issue',
  eventType: 'Issue.create',
  description: 'Triggered when a new issue is created in Linear.',
  inputConfig: [shared.fields.dynamicSelectTeam],
  webhookPayloadMatchesIdentifier: ({ webhookBody, connectionMetadata }) => {
    // Check if the organizationId from the webhook matches the one in connection metadata
    const webhookOrgId = webhookBody.organizationId;
    const connectionOrgId = connectionMetadata?.organization?.id;

    return webhookOrgId === connectionOrgId;
  },
  run: async ({ inputData, configValue }) => {
    // If teamId is specified, filter by team
    if (
      configValue.teamId &&
      inputData?.body?.data?.team?.id !== configValue.teamId
    ) {
      return [];
    }

    return [inputData];
  },
  mockRun: async () => {
    return [mock];
  },
});

const mock = {
  body: {
    action: 'create',
    type: 'Issue',
    data: {
      id: 'issue-id',
      identifier: 'PROJ-123',
      title: 'Example Issue',
      description: 'This is an example issue description',
      priority: 2,
      priorityLabel: 'High',
      state: 'state-id',
      stateLabel: 'In Progress',
      team: {
        id: 'team-id',
        name: 'Engineering',
        key: 'ENG',
      },
      creator: {
        id: 'user-id',
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
      assignee: {
        id: 'user-id',
        name: 'John Smith',
        email: 'john@example.com',
      },
      labels: [
        {
          id: 'label-id',
          name: 'Bug',
          color: '#ff0000',
        },
      ],
      createdAt: '2023-09-05T12:00:00.000Z',
      updatedAt: '2023-09-05T12:00:00.000Z',
    },
    url: 'https://linear.app/organization/issue/PROJ-123',
    updatedFrom: {},
  },
};
