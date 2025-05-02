import { createApp } from '@lecca-io/toolkit';

import { createComment } from './actions/create-comment.action';
import { linearOAuth2 } from './connections/linear.oauth2';

export const linear = createApp({
  id: 'linear',
  name: 'Linear',
  description:
    'Linear is an issue tracking tool built for high-performance teams. It streamlines software development with a better user experience.',
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/linear.svg',
  actions: [
    createComment,
  ],
  triggers: [],
  connections: [linearOAuth2],
});