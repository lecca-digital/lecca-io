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
  afterTokenExchange: async ({ accessToken, http, workspaceId }) => {
    // Fetch organization information via GraphQL API
    const response = await http.request({
      method: 'POST',
      url: 'https://api.linear.app/graphql',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        query: `
            query {
              organization {
                id
                name
              }
            }
          `,
      },
      workspaceId,
    });

    if (response.status === 200 && response.data?.data?.organization) {
      const organization = response.data.data.organization;
      // Return organization info to be stored in connection metadata
      return {
        organization: {
          id: organization.id,
          name: organization.name,
        },
      };
    } else {
      throw new Error('Failed to fetch organization information for Linear');
    }
  },
});
