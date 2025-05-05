import { createApiKeyConnection } from '@lecca-io/toolkit';

export const abandonmentMessagesApiKey = createApiKeyConnection({
  id: 'abandonment-messages_connection_api-key',
  name: 'SMS Provider API Key',
  description: 'API key for sending SMS messages',
});