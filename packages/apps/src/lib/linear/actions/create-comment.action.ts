import { createAction, createTextInputField } from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/linear.shared';

export const createComment = createAction({
  id: 'linear_action_create-comment',
  name: 'Create Comment',
  description: 'Add a comment to an issue in Linear',
  aiSchema: z.object({
    teamId: z.string().describe('The ID of the team the issue belongs to'),
    issueId: z.string().describe('The ID of the issue to comment on'),
    body: z.string().describe('The content of the comment in markdown format'),
  }),
  inputConfig: [
    shared.fields.dynamicSelectTeam,
    shared.fields.dynamicSelectIssue,
    createTextInputField({
      id: 'body',
      label: 'Comment',
      description: 'The content of the comment (supports markdown)',
      placeholder: 'Enter your comment here...',
      required: {
        missingMessage: 'Comment body is required',
        missingStatus: 'warning',
      },
    }),
  ],
  run: async ({ configValue, connection, workspaceId, http }) => {
    const { issueId, body } = configValue;

    const url = 'https://api.linear.app/graphql';
    const mutation = `
      mutation($issueId: String!, $body: String!) {
        commentCreate(
          input: {
            issueId: $issueId,
            body: $body
          }
        ) {
          success
          comment {
            id
            body
            createdAt
            user {
              id
              name
              email
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
          body,
        },
      },
      workspaceId,
    });

    if (result.status === 200 && result.data?.data?.commentCreate?.success) {
      return {
        status: 'success',
        data: result.data.data.commentCreate.comment,
      };
    } else {
      const errorMessage =
        result.data?.errors?.[0]?.message ||
        `Failed to create comment: ${result.status}`;
      throw new Error(errorMessage);
    }
  },
  mockRun: async () => {
    return {
      status: 'success',
      data: {
        id: 'comment-123',
        body: 'This is a sample comment',
        createdAt: new Date().toISOString(),
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    };
  },
});
