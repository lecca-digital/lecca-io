import { createAppWebhookTrigger } from '@lecca-io/toolkit';

import { shared } from '../shared/slack.shared';

export const newMessage = createAppWebhookTrigger<
  {
    channelId: string;
    userId: string;
  },
  any,
  any
>({
  id: 'slack_trigger_new-message',
  name: 'New Message',
  eventType: 'message',
  description: 'Triggered when a new message is sent in a channel.',
  inputConfig: [
    {
      ...shared.fields.dynamicSelectUser,
      description: 'Filter by user that sent the message.',
      selectOptions: [
        {
          label: 'Anyone',
          value: 'any',
        },
      ],
      defaultValue: 'any',
      label: 'Filter by User',
    },
    {
      ...shared.fields.dynamicSelectChannel,
      description: 'Filter by channel where the message was sent.',
      selectOptions: [
        {
          label: 'Any Channel',
          value: 'any',
        },
      ],
      defaultValue: 'any',
      label: 'Filter by Channel',
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
    // Filter out direct messages - those will be handled by directMessage trigger
    if (inputData?.body?.event?.channel_type === 'im') {
      return [];
    }
    
    if (
      configValue.userId !== 'any' &&
      inputData?.body?.event?.user !== configValue.userId
    ) {
      return [];
    }

    if (
      configValue.channelId !== 'any' &&
      inputData?.body?.event?.channel !== configValue.channelId
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
      text: 'Message Text',
      team: 'team-id',
      blocks: [] as any,
      channel: 'channel-id',
      event_ts: '0000000000.000000',
      channel_type: 'channel',
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
