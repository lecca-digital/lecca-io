import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/linear.shared';

export const listLabels = createAction({
  id: 'linear_action_list-labels',
  name: 'List Labels',
  description: 'List labels in Linear, optionally filtered by a group',
  aiSchema: z.object({
    labelGroupId: z
      .string()
      .optional()
      .describe('The ID of the label group to filter by (optional)'),
  }),
  inputConfig: [shared.fields.dynamicSelectLabelGroup],
  run: async ({ configValue, connection, workspaceId, http }) => {
    const { labelGroupId } = configValue;

    const url = 'https://api.linear.app/graphql';
    const query = `
      query {
        issueLabels(first: 250) {
          nodes {
            id
            name
            color
            description
            parent {
              id
              name
            }
            isGroup
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

    if (result.status === 200 && result.data?.data?.issueLabels?.nodes) {
      const allLabels = result.data.data.issueLabels.nodes;

      // Filter out actual group labels
      let filteredLabels = allLabels.filter((label) => !label.isGroup);

      // If a group ID is provided, filter by that group
      if (labelGroupId) {
        // Check if we have the "ungrouped" pseudo-group
        if (labelGroupId === 'ungrouped') {
          filteredLabels = filteredLabels.filter((label) => !label.parent);
        } else {
          // For a regular group, filter by parent ID
          filteredLabels = filteredLabels.filter(
            (label) => label.parent && label.parent.id === labelGroupId,
          );
        }
      }

      // Sort alphabetically
      return {
        status: 'success',
        data: filteredLabels.sort((a, b) => a.name.localeCompare(b.name)),
      };
    } else {
      const errorMessage =
        result.data?.errors?.[0]?.message ||
        `Failed to list labels: ${result.status}`;
      throw new Error(errorMessage);
    }
  },
  mockRun: async () => {
    // Base sample data
    const mockLabels = [
      {
        id: 'label-123',
        name: 'Bug',
        color: '#FF0000',
        description: 'Issues that are bugs',
        parent: {
          id: 'group-123',
          name: 'Issue Type',
        },
      },
      {
        id: 'label-456',
        name: 'Feature',
        color: '#00FF00',
        description: 'New features',
        parent: {
          id: 'group-123',
          name: 'Issue Type',
        },
      },
      {
        id: 'label-789',
        name: 'High',
        color: '#FF0000',
        description: 'High priority',
        parent: {
          id: 'group-456',
          name: 'Priority',
        },
      },
      {
        id: 'label-101',
        name: 'Documentation',
        color: '#0000FF',
        description: 'Documentation updates',
        parent: null,
      },
    ];

    return {
      status: 'success',
      data: mockLabels,
    };
  },
});
