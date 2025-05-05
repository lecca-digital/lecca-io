import { createApp } from '@lecca-io/toolkit';
import crypto from 'crypto';

import { addLabelToIssue } from './actions/add-label-to-issue.action';
import { createComment } from './actions/create-comment.action';
import { getIssue } from './actions/get-issue.action';
import { getLabel } from './actions/get-label.action';
import { listLabelGroups } from './actions/list-label-groups.action';
import { listLabels } from './actions/list-labels.action';
import { listTeams } from './actions/list-teams.action';
import { linearOAuth2 } from './connections/linear.oauth2';
import { labeledIssue } from './triggers/labeled-issue.trigger';
import { newIssue } from './triggers/new-issue.trigger';
import { removedIssue } from './triggers/removed-issue.trigger';
import { updatedIssue } from './triggers/updated-issue.trigger';

export const linear = createApp({
  id: 'linear',
  name: 'Linear',
  description:
    'Linear is an issue tracking tool built for high-performance teams.',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/linear.svg',
  actions: [createComment, getIssue, getLabel, addLabelToIssue, listLabelGroups, listLabels, listTeams],
  triggers: [newIssue, updatedIssue, removedIssue, labeledIssue],
  connections: [linearOAuth2],
  verifyWebhookRequest: ({ webhookBody, webhookHeaders }) => {
    if (!process.env.INTEGRATION_LINEAR_SIGNING_SECRET) {
      throw new Error('Linear signing secret is not set');
    }

    // Get the signature from headers
    const signature = webhookHeaders['linear-signature'];
    if (!signature) {
      return false;
    }

    // Calculate expected signature
    const hmac = crypto.createHmac(
      'sha256',
      process.env.INTEGRATION_LINEAR_SIGNING_SECRET,
    );

    // Ensure webhookBody is a string before updating the HMAC
    const bodyString =
      typeof webhookBody === 'string'
        ? webhookBody
        : JSON.stringify(webhookBody);
    hmac.update(bodyString);
    const computedSignature = hmac.digest('hex');

    return signature === computedSignature;
  },
  parseWebhookEventType: (args) => {
    const webhookBody = args.webhookBody as { type?: string; action?: string };

    // Linear webhook event types are formatted as {type}.{action}
    // For example: Issue.create, Issue.update, etc.
    const event =
      webhookBody?.type && webhookBody?.action
        ? `${webhookBody.type}.${webhookBody.action}`
        : '';

    return {
      event,
    };
  },
});
