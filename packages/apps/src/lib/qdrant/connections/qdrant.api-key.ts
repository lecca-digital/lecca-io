import { createApiKeyConnection } from '@lecca-io/toolkit';

export const qdrantApiKey = createApiKeyConnection({
  id: 'qdrant_connection_api-key',
  name: 'API Key',
  description: 'Connect using an API Key',
});
