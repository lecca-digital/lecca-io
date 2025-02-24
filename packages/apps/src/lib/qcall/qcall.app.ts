import { createApp } from '@lecca-io/toolkit';

import { createSegmentContact } from './actions/create-segment-contact.action';
import { qCallAIKey } from './connection/qcall.api-key';

export const qcall = createApp({
  id: 'qcall',
  name: 'QCall - Phone',
  description: `Make phone calls through campaign`,
  logoUrl: 'https://precallai.s3.ap-south-1.amazonaws.com/qcall.svg',
  actions: [createSegmentContact],
  triggers: [],
  connections: [qCallAIKey],
});
