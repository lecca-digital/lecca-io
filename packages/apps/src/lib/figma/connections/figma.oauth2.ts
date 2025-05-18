import { createOAuth2Connection } from '@lecca-io/toolkit';

export const figmaOAuth2 = createOAuth2Connection({
  id: 'figma_connection_oauth2',
  name: 'OAuth2',
  description: 'Connect using OAuth2',
  authorizeUrl: 'https://www.figma.com/oauth',
  tokenUrl: 'https://api.figma.com/v1/oauth/token',
  getClientId: () => process.env.INTEGRATION_FIGMA_CLIENT_ID,
  getClientSecret: () => process.env.INTEGRATION_FIGMA_CLIENT_SECRET,
  scopes: [
    'file_content:read',
    'file_comments:read',
    'file_dev_resources:read',
    'file_versions:read',
    'library_content:read',
    'library_assets:read',
    'projects:read',
    'team_library_content:read',
    'webhooks:read',
  ],
  scopeDelimiter: ' ',
  extraAuthParams: {},
});
