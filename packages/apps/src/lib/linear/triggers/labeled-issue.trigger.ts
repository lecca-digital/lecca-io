import { createAppWebhookTrigger } from '@lecca-io/toolkit';

import { shared } from '../shared/linear.shared';

export const labeledIssue = createAppWebhookTrigger<
  {
    teamId: string;
    labelGroupId: string;
    labelId: string;
  },
  any,
  any
>({
  id: 'linear_trigger_labeled-issue',
  name: 'Issue Labeled',
  eventType: 'Issue.update',
  description: 'Triggered when a label is added to an issue in Linear.',
  inputConfig: [
    shared.fields.dynamicSelectTeam,
    shared.fields.dynamicSelectLabelGroup,
    shared.fields.dynamicSelectLabel,
  ],
  webhookPayloadMatchesIdentifier: ({ webhookBody, connectionMetadata }) => {
    // Check if the organizationId from the webhook matches the one in connection metadata
    const webhookOrgId = webhookBody.organizationId;
    const connectionOrgId = connectionMetadata?.organization?.id;

    return webhookOrgId === connectionOrgId;
  },
  run: async ({ inputData, configValue }) => {
    // Check if there are labelIds in the data
    if (!inputData?.body?.data?.labelIds) {
      return [];
    }

    // Check if there were labels before (in updatedFrom)
    const currentLabelIds = inputData?.body?.data?.labelIds || [];
    const previousLabelIds = inputData?.body?.updatedFrom?.labelIds || [];

    // Detect new labels (labels that are in current but not in previous)
    const newLabelIds = currentLabelIds.filter(
      (currentId) => !previousLabelIds.includes(currentId),
    );

    // If no new labels were added, don't trigger
    if (newLabelIds.length === 0) {
      return [];
    }

    // If teamId is specified, filter by team
    if (
      configValue.teamId &&
      inputData?.body?.data?.team?.id !== configValue.teamId
    ) {
      return [];
    }

    // If labelId is specified, check if it's among the new labels
    if (configValue.labelId && !newLabelIds.includes(configValue.labelId)) {
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
      id: 'abc123de-f456-4b38-gh78-d3649255ijkl',
      title: 'Fix authentication flow in mobile app',
      priority: 2,
      priorityLabel: 'High',
      state: {
        id: '123abc45-6def-49e9-78gh-db5a0acij901',
        color: '#e2e2e2',
        name: 'Todo',
        type: 'unstarted',
      },
      team: {
        id: '234bcd56-7efg-47de-89hi-fb3813cdjk012',
        key: 'MOBILE',
        name: 'Mobile Team',
      },
      labelIds: [
        'abc12345-6789-4def-abcd-1234567890ab',
        'bcd23456-7890-5efg-bcde-2345678901bc',
        'cde34567-8901-6fgh-cdef-3456789012cd',
      ],
      labels: [
        {
          id: 'abc12345-6789-4def-abcd-1234567890ab',
          color: '#EB5757',
          name: 'Bug',
          parentId: 'def45678-9012-5ghi-defg-4567890123de',
        },
        {
          id: 'bcd23456-7890-5efg-bcde-2345678901bc',
          color: '#95a2b3',
          name: 'Frontend',
        },
        {
          id: 'cde34567-8901-6fgh-cdef-3456789012cd',
          color: '#26b5ce',
          name: 'Priority',
          parentId: 'efg56789-0123-6hij-efgh-5678901234ef',
        },
      ],
      identifier: 'MOBILE-123',
    },
    updatedFrom: {
      updatedAt: '2025-01-15T14:30:22.123Z',
      labelIds: [
        'abc12345-6789-4def-abcd-1234567890ab',
        'bcd23456-7890-5efg-bcde-2345678901bc',
        'fgh67890-1234-7ijk-fghi-6789012345fg',
      ],
    },
    url: 'https://linear.app/example/issue/MOBILE-123/fix-authentication-flow-in-mobile-app',
  },
};
