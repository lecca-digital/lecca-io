import { createApiKeyConnection } from '@lecca-io/toolkit';

export const qCallAIKey = createApiKeyConnection({
  id: 'qcall_connection_api-key',
  name: 'API Key',
  description: 'Connect using an API Key',
});
