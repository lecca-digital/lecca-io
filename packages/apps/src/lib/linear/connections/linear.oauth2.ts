import { createOAuth2Connection } from '@lecca-io/toolkit';

export const linearOAuth2 = createOAuth2Connection({
  id: 'linear_connection_oauth2',
  name: 'OAuth2',
  description: 'Connect using OAuth2',
  authorizeUrl: 'https://linear.app/oauth/authorize',
  tokenUrl: 'https://api.linear.app/oauth/token',
  getClientId: () => process.env.INTEGRATION_LINEAR_CLIENT_ID,
  getClientSecret: () => process.env.INTEGRATION_LINEAR_CLIENT_SECRET,
  scopes: ['read', 'write', 'issues:create', 'comments:create'],
  scopeDelimiter: ' ',
  extraAuthParams: {},
});