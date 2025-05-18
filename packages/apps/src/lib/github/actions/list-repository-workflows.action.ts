import {
  createAction,
  createNumberInputField,
} from '@lecca-io/toolkit';
import { z } from 'zod';
import { shared } from '../shared/github.shared';

export const listRepositoryWorkflows = createAction({
  id: 'github_action_list-repository-workflows',
  name: 'List repository workflows',
  description: 'Lists the workflows in a GitHub repository.',
  aiSchema: z.object({
    owner: z.string().describe('The GitHub repository owner (e.g., "octocat")'),
    repo: z
      .string()
      .describe('The GitHub repository name (e.g., "hello-world")'),
    perPage: z
      .number()
      .optional()
      .describe('The number of results per page (max 100). Default: 30'),
    page: z
      .number()
      .optional()
      .describe('The page number of the results to fetch. Default: 1'),
  }),
  inputConfig: [
    shared.fields.dynamicSelectOwner,
    shared.fields.dynamicSelectRepo,
    createNumberInputField({
      id: 'perPage',
      label: 'Results Per Page',
      description: 'Number of results per page (max 100).',
      placeholder: '30',
    }),
    createNumberInputField({
      id: 'page',
      label: 'Page Number',
      description: 'Page number of the results to fetch.',
      placeholder: '1',
    }),
  ],
  run: async ({ configValue, connection, workspaceId, http }) => {
    const { owner, repo, perPage, page } = configValue;

    let url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows`;

    // Add query parameters if provided
    const params = new URLSearchParams();
    if (perPage) params.append('per_page', perPage.toString());
    if (page) params.append('page', page.toString());

    const queryString = params.toString();
    if (queryString) {
      url = `${url}?${queryString}`;
    }

    const result = await http.request({
      method: 'GET',
      url,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      workspaceId,
    });

    if (result.status === 200) {
      return {
        status: 'success',
        data: result.data,
      };
    } else {
      throw new Error(`Failed to list workflows: ${result.status}`);
    }
  },
  mockRun: async () => {
    return {
      status: 'success',
      data: {
        total_count: 2,
        workflows: [
          {
            id: 161335,
            node_id: 'MDg6V29ya2Zsb3cxNjEzMzU=',
            name: 'CI',
            path: '.github/workflows/blank.yaml',
            state: 'active',
            created_at: '2020-01-08T23:48:37.000-08:00',
            updated_at: '2020-01-08T23:50:21.000-08:00',
            url: 'https://api.github.com/repos/octo-org/octo-repo/actions/workflows/161335',
            html_url:
              'https://github.com/octo-org/octo-repo/blob/master/.github/workflows/161335',
            badge_url:
              'https://github.com/octo-org/octo-repo/workflows/CI/badge.svg',
          },
          {
            id: 161336,
            node_id: 'MDg6V29ya2Zsb3cxNjEzMzY=',
            name: 'Deploy',
            path: '.github/workflows/deploy.yaml',
            state: 'active',
            created_at: '2020-01-09T10:30:00.000-08:00',
            updated_at: '2020-01-09T11:45:00.000-08:00',
            url: 'https://api.github.com/repos/octo-org/octo-repo/actions/workflows/161336',
            html_url:
              'https://github.com/octo-org/octo-repo/blob/master/.github/workflows/161336',
            badge_url:
              'https://github.com/octo-org/octo-repo/workflows/Deploy/badge.svg',
          },
        ],
      },
    };
  },
});
