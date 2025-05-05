import { createApp } from '@lecca-io/toolkit';

import { textBuilder, generateTextTemplates } from './actions/text-builder.action';
import { abandonmentMessagesApiKey } from './connections/abandonment-messages.api-key';

export const abandonmentMessages = createApp({
  id: 'abandonment-messages',
  name: 'Abandonment Messages',
  description: 'Create and send personalized abandonment messages with A/B testing',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/abandonment-messages.svg',
  actions: [
    textBuilder,
    generateTextTemplates,
    // Other actions will be added as implemented
  ],
  triggers: [
    // Triggers will be added as implemented
  ],
  connections: [
    abandonmentMessagesApiKey,
  ],
});