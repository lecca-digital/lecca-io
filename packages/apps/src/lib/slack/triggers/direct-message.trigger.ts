import { createAppWebhookTrigger } from '@lecca-io/toolkit';

import { shared } from '../shared/slack.shared';

export const directMessage = createAppWebhookTrigger<
  {
    userId: string;
  },
  any,
  any
>({
  id: 'slack_trigger_direct-message',
  name: 'Direct Message',
  eventType: 'message',
  description: 'Triggered when a direct message is sent to the bot.',
  inputConfig: [
    {
      ...shared.fields.dynamicSelectUser,
      description: 'Filter by user that sent the direct message.',
      selectOptions: [
        {
          label: 'Anyone',
          value: 'any',
        },
      ],
      defaultValue: 'any',
      label: 'Filter by User',
    },
  ],
  webhookPayloadMatchesIdentifier: ({ webhookBody, connectionMetadata }) => {
    if (webhookBody.team_id !== connectionMetadata.team?.id) {
      return false;
    } else {
      return true;
    }
  },
  run: async ({ inputData, configValue }) => {
    // Check if this is a direct message (channel_type: 'im')
    if (inputData?.body?.event?.channel_type !== 'im') {
      return [];
    }

    // Apply user filter if specified
    if (
      configValue.userId !== 'any' &&
      inputData?.body?.event?.user !== configValue.userId
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
    team_id: 'team-id',
    context_team_id: 'context-team-id',
    context_enterprise_id: 'context-enterprise-id',
    api_app_id: 'api-app-id',
    event: {
      user: 'user-id',
      type: 'message',
      ts: '0000000000.000000',
      client_msg_id: 'client-msg-id',
      text: 'Direct Message Text',
      team: 'team-id',
      blocks: [] as any,
      channel: 'DM-channel-id', 
      event_ts: '0000000000.000000',
      channel_type: 'im',
    },
    type: 'event_callback',
    event_id: 'event-id',
    event_time: 1718777323,
    authorizations: [
      {
        enterprise_id: 'enterprise-id',
        team_id: 'team-id',
        user_id: 'user-id',
        is_bot: false,
        is_enterprise_install: false,
      },
    ],
    is_ext_shared_channel: false,
    event_context: 'event-context',
  },
};