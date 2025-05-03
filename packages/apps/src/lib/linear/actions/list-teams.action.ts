import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

export const listTeams = createAction({
  id: 'linear_action_list-teams',
  name: 'List Teams',
  description: 'List teams in Linear',
  aiSchema: z.object({}),
  inputConfig: [],
  run: async ({ connection, workspaceId, http }) => {
    const url = 'https://api.linear.app/graphql';
    const query = `
      query {
        teams {
          nodes {
            id
            name
            key
            description
            color
          }
        }
      }
    `;

    const result = await http.request({
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

    if (result.status === 200 && result.data?.data?.teams?.nodes) {
      const teams = result.data.data.teams.nodes;

      // Sort alphabetically
      return {
        status: 'success',
        data: teams.sort((a, b) => a.name.localeCompare(b.name)),
      };
    } else {
      const errorMessage =
        result.data?.errors?.[0]?.message ||
        `Failed to list teams: ${result.status}`;
      throw new Error(errorMessage);
    }
  },
  mockRun: async () => {
    // Sample mock data
    const mockTeams = [
      {
        id: 'team-123',
        name: 'Engineering',
        key: 'ENG',
        description: 'Engineering team',
        color: '#0000FF',
      },
      {
        id: 'team-456',
        name: 'Design',
        key: 'DSG',
        description: 'Design team',
        color: '#00FF00',
      },
      {
        id: 'team-789',
        name: 'Marketing',
        key: 'MKT',
        description: 'Marketing team',
        color: '#FF0000',
      },
    ];

    return {
      status: 'success',
      data: mockTeams,
    };
  },
});