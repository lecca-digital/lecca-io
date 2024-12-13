import { createOAuth2Connection } from '@lecca-io/toolkit';

export const googleDocsOAuth2 = createOAuth2Connection({
  id: 'google-docs_connection_oauth2',
  name: 'OAuth2',
  description: 'Connect using OAuth2',
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  clientId: process.env.INTEGRATION_GOOGLE_DOCS_CLIENT_ID,
  clientSecret: process.env.INTEGRATION_GOOGLE_DOCS_CLIENT_SECRET,
  scopes: [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
  scopeDelimiter: ' ',
  extraAuthParams: {
    access_type: 'offline',
    prompt: 'consent',
  },
});