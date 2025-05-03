import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/linear.shared';

export const getLabel = createAction({
  id: 'linear_action_get-label',
  name: 'Get Label',
  description: 'Get details about a specific Linear label',
  aiSchema: z.object({
    labelGroupId: z.string().describe('The ID of the label group'),
    labelId: z.string().describe('The ID of the label to get details for'),
  }),
  inputConfig: [
    shared.fields.dynamicSelectLabelGroup,
    shared.fields.dynamicSelectLabel,
  ],
  run: async ({ configValue, connection, workspaceId, http }) => {
    const { labelId } = configValue;

    const url = 'https://api.linear.app/graphql';
    const query = `
      query($labelId: String!) {
        issueLabel(id: $labelId) {
          id
          name
          color
          description
          parent {
            id
            name
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
        variables: {
          labelId,
        },
      },
      workspaceId,
    });

    if (result.status === 200 && result.data?.data?.issueLabel) {
      return {
        status: 'success',
        data: result.data.data.issueLabel,
      };
    } else {
      const errorMessage =
        result.data?.errors?.[0]?.message ||
        `Failed to get label: ${result.status}`;
      throw new Error(errorMessage);
    }
  },
  mockRun: async () => {
    return {
      status: 'success',
      data: {
        id: 'label-123',
        name: 'Bug',
        color: '#FF0000',
        description: 'Issues that are bugs',
        parent: {
          id: 'label-group-123',
          name: 'Issue Type',
          color: '#000000',
        },
      },
    };
  },
});