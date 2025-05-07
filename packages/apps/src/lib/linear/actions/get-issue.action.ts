import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/linear.shared';

export const getIssue = createAction({
  id: 'linear_action_get-issue',
  name: 'Get Issue',
  description: 'Get details about a specific Linear issue',
  aiSchema: z.object({
    teamId: z.string().describe('The ID of the team'),
    issueId: z.string().describe('The ID of the issue to get details for'),
  }),
  inputConfig: [
    shared.fields.dynamicSelectTeam,
    shared.fields.dynamicSelectIssue,
  ],
  run: async ({ configValue, connection, workspaceId, http }) => {
    const { issueId } = configValue;

    const url = 'https://api.linear.app/graphql';
    const query = `
      query($issueId: String!) {
        issue(id: $issueId) {
          id
          identifier
          title
          description
          priority
          estimate
          state {
            id
            name
            color
            type
          }
          assignee {
            id
            name
            email
            displayName
          }
          team {
            id
            name
            key
          }
          labels {
            nodes {
              id
              name
              color
            }
          }
          createdAt
          updatedAt
          dueDate
          url
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
        variables: {
          issueId,
        },
      },
      workspaceId,
    });

    if (result.status === 200 && result.data?.data?.issue) {
      return {
        status: 'success',
        data: result.data.data.issue,
      };
    } else {
      const errorMessage =
        result.data?.errors?.[0]?.message ||
        `Failed to get issue: ${result.status}`;
      throw new Error(errorMessage);
    }
  },
  mockRun: async () => {
    return {
      status: 'success',
      data: {
        id: 'issue-123',
        identifier: 'TEAM-123',
        title: 'Implement new feature',
        description: 'This is a description of the issue',
        priority: 2,
        estimate: 3,
        state: {
          id: 'state-123',
          name: 'In Progress',
          color: '#FFA500',
          type: 'started'
        },
        assignee: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          displayName: 'John Doe'
        },
        team: {
          id: 'team-123',
          name: 'Engineering',
          key: 'ENG'
        },
        labels: {
          nodes: [
            {
              id: 'label-123',
              name: 'Feature',
              color: '#00FF00'
            }
          ]
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
        dueDate: '2023-01-15',
        url: 'https://linear.app/company/issue/TEAM-123'
      },
    };
  },
});