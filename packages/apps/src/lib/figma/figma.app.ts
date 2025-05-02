import { createApp } from '@lecca-io/toolkit';

import { figmaOAuth2 } from './connections/figma.oauth2';

export const figma = createApp({
  id: 'figma',
  name: 'Figma',
  description:
    'Figma is a collaborative interface design tool that enables teams to create, test, and ship better designs from start to finish.',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/figma.svg',
  actions: [],
  triggers: [],
  connections: [figmaOAuth2],
});
