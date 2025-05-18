import { createApp } from '@lecca-io/toolkit';

import { createSegmentContact } from './actions/create-segment-contact.action';
import { qCallAIKey } from './connection/qcall.api-key';

export const qcall = createApp({
  id: 'qcall',
  name: 'QCall - Phone',
  description: `Make phone calls through campaign`,
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/qcall.png',
  actions: [createSegmentContact],
  triggers: [],
  connections: [qCallAIKey],
});
