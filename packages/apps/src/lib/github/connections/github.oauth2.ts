import { createOAuth2Connection } from '@lecca-io/toolkit';

export const githubOAuth2 = createOAuth2Connection({
  id: 'github_connection_oauth2',
  name: 'OAuth2',
  description: 'Connect using OAuth2',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  getClientId: () => process.env.INTEGRATION_GITHUB_CLIENT_ID,
  getClientSecret: () => process.env.INTEGRATION_GITHUB_CLIENT_SECRET,
  scopes: ['repo', 'workflow'],
  scopeDelimiter: ' ',
  extraAuthParams: {},
});
