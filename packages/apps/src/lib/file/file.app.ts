import { createApp } from '@lecca-io/toolkit';

import { readTextFileFromUrl } from './actions/read-text-file-from-url';

export const file = createApp({
  id: 'file',
  name: 'File Tools',
  description: `File tools to manage file data`,
  logoUrl: 'https://lecca-io.s3.us-east-2.amazonaws.com/assets/apps/file.svg',
  actions: [readTextFileFromUrl],
  triggers: [],
  connections: [],
});
