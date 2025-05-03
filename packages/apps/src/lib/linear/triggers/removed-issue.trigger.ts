import { createAppWebhookTrigger } from '@lecca-io/toolkit';

import { shared } from '../shared/linear.shared';

export const removedIssue = createAppWebhookTrigger<
  {
    teamId: string;
  },
  any,
  any
>({
  id: 'linear_trigger_removed-issue',
  name: 'Removed Issue',
  eventType: 'Issue.remove',
  description: 'Triggered when an issue is removed in Linear.',
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
    action: 'remove',
    type: 'Issue',
    data: {
      id: 'issue-id',
      identifier: 'PROJ-123',
      title: 'Removed Example Issue',
      description: 'This is a removed example issue description',
      priority: 2,
      priorityLabel: 'High',
      state: 'state-id',
      stateLabel: 'Canceled',
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
      assignee: null,
      labels: [],
      createdAt: '2023-09-05T12:00:00.000Z',
      updatedAt: '2023-09-07T10:15:00.000Z',
      removedAt: '2023-09-07T10:15:00.000Z',
    },
    url: 'https://linear.app/organization/issue/PROJ-123',
    updatedFrom: {},
  },
};
