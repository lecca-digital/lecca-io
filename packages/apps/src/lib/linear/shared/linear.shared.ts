import { createDynamicSelectInputField } from '@lecca-io/toolkit';

export const shared = {
  fields: {
    dynamicSelectTeam: createDynamicSelectInputField({
      id: 'teamId',
      label: 'Team',
      description: 'Select a Linear team',
      placeholder: 'Select team',
      _getDynamicValues: async ({ connection, workspaceId, http }) => {
        const url = 'https://api.linear.app/graphql';
        const query = `
          query {
            teams {
              nodes {
                id
                name
              }
            }
          }
        `;

        const response = await http.request({
          method: 'POST',
          url,
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
          },
          data: {
            query,
          },
          workspaceId,
        });

        if (response.status !== 200 || !response.data?.data?.teams?.nodes) {
          throw new Error(`Failed to fetch teams: ${response.status}`);
        }

        const teams = response.data.data.teams.nodes;
        return teams.map((team) => ({
          label: team.name,
          value: team.id,
        }));
      },
      required: {
        missingMessage: 'Team is required',
        missingStatus: 'warning',
      },
    }),
    dynamicSelectIssue: createDynamicSelectInputField({
      id: 'issueId',
      label: 'Issue',
      description: 'Select a Linear issue',
      placeholder: 'Select issue',
      _getDynamicValues: async ({
        connection,
        workspaceId,
        http,
        extraOptions,
      }) => {
        const { teamId } = extraOptions;

        if (!teamId?.trim?.()) {
          return [];
        }

        const url = 'https://api.linear.app/graphql';
        const query = `
          query($teamId: ID!, $first: Int!) {
            issues(
              filter: { team: { id: { eq: $teamId } } }
              first: $first
              orderBy: updatedAt
            ) {
              nodes {
                id
                title
                identifier
              }
            }
          }
        `;

        const response = await http.request({
          method: 'POST',
          url,
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
          },
          data: {
            query,
            variables: {
              teamId,
              first: 100,
            },
          },
          workspaceId,
        });

        if (response.status !== 200 || !response.data?.data?.issues?.nodes) {
          throw new Error(`Failed to fetch issues: ${response.status}`);
        }

        const issues = response.data.data.issues.nodes;
        return issues.map((issue) => ({
          label: `${issue.identifier} - ${issue.title}`,
          value: issue.id,
        }));
      },
      required: {
        missingMessage: 'Issue is required',
        missingStatus: 'warning',
      },
      loadOptions: {
        forceRefresh: true,
        dependsOn: ['teamId'],
      },
    }),
  },
};
