import { createApiKeyConnection } from '@lecca-io/toolkit';

export const redoApiKey = createApiKeyConnection({
  id: 'redo_connection_api-key',
  name: 'API Key',
  description: 'Connect using an API key',
});
