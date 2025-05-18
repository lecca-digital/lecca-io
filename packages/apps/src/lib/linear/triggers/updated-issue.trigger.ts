import { createAppWebhookTrigger } from '@lecca-io/toolkit';

import { shared } from '../shared/linear.shared';

export const updatedIssue = createAppWebhookTrigger<
  {
    teamId: string;
  },
  any,
  any
>({
  id: 'linear_trigger_updated-issue',
  name: 'Updated Issue',
  eventType: 'Issue.update',
  description: 'Triggered when an issue is updated in Linear.',
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
    action: 'update',
    type: 'Issue',
    data: {
      id: 'issue-id',
      identifier: 'PROJ-123',
      title: 'Updated Example Issue',
      description: 'This is an updated example issue description',
      priority: 3,
      priorityLabel: 'Urgent',
      state: 'state-id-2',
      stateLabel: 'Done',
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
        id: 'user-id-2',
        name: 'Alex Jones',
        email: 'alex@example.com',
      },
      labels: [
        {
          id: 'label-id',
          name: 'Bug',
          color: '#ff0000',
        },
        {
          id: 'label-id-2',
          name: 'Priority',
          color: '#00ff00',
        },
      ],
      createdAt: '2023-09-05T12:00:00.000Z',
      updatedAt: '2023-09-06T14:30:00.000Z',
    },
    url: 'https://linear.app/organization/issue/PROJ-123',
    updatedFrom: {
      title: 'Example Issue',
      description: 'This is an example issue description',
      priority: 2,
      priorityLabel: 'High',
      state: 'state-id',
      stateLabel: 'In Progress',
      assignee: {
        id: 'user-id',
        name: 'John Smith',
        email: 'john@example.com',
      },
    },
  },
};
