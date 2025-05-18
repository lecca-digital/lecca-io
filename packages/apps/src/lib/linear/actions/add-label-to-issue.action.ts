import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/linear.shared';

export const addLabelToIssue = createAction({
  id: 'linear_action_add-label-to-issue',
  name: 'Add Label to Issue',
  description: 'Add a label to an issue in Linear',
  aiSchema: z.object({
    teamId: z.string().describe('The ID of the team the issue belongs to'),
    issueId: z.string().describe('The ID of the issue to label'),
    labelGroupId: z.string().describe('The ID of the label group').optional(),
    labelId: z.string().describe('The ID of the label to add to the issue'),
  }),
  inputConfig: [
    shared.fields.dynamicSelectTeam,
    shared.fields.dynamicSelectIssue,
    shared.fields.dynamicSelectLabelGroup,
    shared.fields.dynamicSelectLabel,
  ],
  run: async ({ configValue, connection, workspaceId, http }) => {
    const { issueId, labelId } = configValue;

    const url = 'https://api.linear.app/graphql';
    const mutation = `
      mutation($issueId: String!, $labelId: String!) {
        issueAddLabel(
          id: $issueId,
          labelId: $labelId
        ) {
          success
          issue {
            id
            identifier
            title
            labels {
              nodes {
                id
                name
                color
              }
            }
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
        query: mutation,
        variables: {
          issueId,
          labelId,
        },
      },
      workspaceId,
    });

    if (result.status === 200 && result.data?.data?.issueAddLabel?.success) {
      return {
        status: 'success',
      };
    } else {
      const errorMessage =
        result.data?.errors?.[0]?.message ||
        `Failed to add label to issue: ${result.status}`;
      throw new Error(errorMessage);
    }
  },
  mockRun: async () => {
    return {
      status: 'success',
    };
  },
});
