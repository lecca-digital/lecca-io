import { createApp } from '@lecca-io/toolkit';
import crypto from 'crypto';

import { createChannel } from './actions/create-channel.action';
import { getThreadMessages } from './actions/get-thread-messages.action';
import { listChannels } from './actions/list-channels.action';
import { listUsers } from './actions/list-users.action';
import { replyToMessage } from './actions/reply-to-message.action';
import { searchMessages } from './actions/search-messages.action';
import { sendMessageToChannel } from './actions/send-message-to-channel.action';
import { sendMessageToUser } from './actions/send-message-to-user.action';
import { slackOAuth2 } from './connections/slack.oauth2';
import { newMessage } from './triggers/new-message.trigger';

export const slack = createApp({
  id: 'slack',
  name: 'Slack',
  description:
    'Slack is a messaging app for business that connects people to the information they need.',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/slack.svg',
  actions: [
    sendMessageToUser,
    sendMessageToChannel,
    replyToMessage,
    getThreadMessages,
    searchMessages,
    createChannel,
    listChannels,
    listUsers,
  ],
  triggers: [newMessage],
  connections: [slackOAuth2],
  verifyWebhookRequest: ({ webhookBody, webhookHeaders }) => {
    if (!process.env.INTEGRATION_SLACK_SIGNING_SECRET) {
      throw new Error('Slack signing secret is not set');
    }

    // Construct the signature base string
    const timestamp = webhookHeaders['x-slack-request-timestamp'];
    const signature = webhookHeaders['x-slack-signature'];
    const signatureBaseString = `v0:${timestamp}:${webhookBody}`;
    const hmac = crypto.createHmac(
      'sha256',
      process.env.INTEGRATION_SLACK_SIGNING_SECRET,
    );
    hmac.update(signatureBaseString);
    const computedSignature = `v0=${hmac.digest('hex')}`;
    return signature === computedSignature;
  },
  parseWebhookEventType: (args) => {
    const webhookBody = args.webhookBody as { event?: { type?: string } };

    return {
      event: webhookBody?.event?.type ?? '',
    };
  },
});
