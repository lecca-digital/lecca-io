import {
  createAction,
  createNumberInputField,
  createSelectInputField,
} from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/github.shared';

export const listRepositories = createAction({
  id: 'github_action_list-repositories',
  name: 'List repositories',
  description: 'Lists repositories for a user or organization.',
  aiSchema: z.object({
    owner: z
      .string()
      .describe('The GitHub user or organization owner (e.g., "octocat")'),
    type: z
      .enum(['all', 'owner', 'public', 'private', 'member'])
      .optional()
      .describe('The type of repositories to include. Default: all'),
    sort: z
      .enum(['created', 'updated', 'pushed', 'full_name'])
      .optional()
      .describe('The property to sort the results by. Default: updated'),
    direction: z
      .enum(['asc', 'desc'])
      .optional()
      .describe('The direction to sort. Default: desc'),
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
    createSelectInputField({
      id: 'type',
      label: 'Repository Type',
      description: 'The type of repositories to include.',
      placeholder: 'Select type',
      selectOptions: [
        { label: 'All', value: 'all' },
        { label: 'Owner', value: 'owner' },
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
        { label: 'Member', value: 'member' },
      ],
    }),
    createSelectInputField({
      id: 'sort',
      label: 'Sort By',
      description: 'The property to sort the results by.',
      placeholder: 'Select sort',
      selectOptions: [
        { label: 'Created', value: 'created' },
        { label: 'Updated', value: 'updated' },
        { label: 'Pushed', value: 'pushed' },
        { label: 'Full Name', value: 'full_name' },
      ],
    }),
    createSelectInputField({
      id: 'direction',
      label: 'Sort Direction',
      description: 'The direction to sort.',
      placeholder: 'Select direction',
      selectOptions: [
        { label: 'Ascending', value: 'asc' },
        { label: 'Descending', value: 'desc' },
      ],
    }),
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
    const { owner, type, sort, direction, perPage, page } = configValue;

    // First, get the authenticated user to check if we're working with the user's own repos
    const userUrl = 'https://api.github.com/user';
    const userResult = await http.request({
      method: 'GET',
      url: userUrl,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      workspaceId,
    });

    if (userResult.status !== 200) {
      throw new Error(`Failed to fetch user data: ${userResult.status}`);
    }

    const user = userResult.data;
    let url;

    // Use different endpoints based on whether we're listing for the authenticated user or not
    if (user.login === owner) {
      // For the authenticated user, use /user/repos to get all repositories including private ones
      url = 'https://api.github.com/user/repos';
    } else {
      // Check if owner is an organization by making a request to the orgs endpoint
      const orgsUrl = 'https://api.github.com/user/orgs';
      const orgsResult = await http.request({
        method: 'GET',
        url: orgsUrl,
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        workspaceId,
      });

      if (orgsResult.status !== 200) {
        throw new Error(`Failed to fetch user organizations: ${orgsResult.status}`);
      }

      // Check if the owner is one of the user's organizations
      const isOrg = orgsResult.data.some(org => org.login === owner);
      
      if (isOrg) {
        // For organizations, use /orgs/{org}/repos to get all accessible repositories
        url = `https://api.github.com/orgs/${owner}/repos`;
      } else {
        // For other users, use /users/{username}/repos (this will only return public repos)
        url = `https://api.github.com/users/${owner}/repos`;
      }
    }

    // Add query parameters if provided
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (sort) params.append('sort', sort);
    if (direction) params.append('direction', direction);
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
      throw new Error(`Failed to list repositories: ${result.status}`);
    }
  },
  mockRun: async () => {
    return {
      status: 'success',
      data: [
        {
          id: 123456,
          node_id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY=',
          name: 'sample-repo',
          full_name: 'octocat/sample-repo',
          private: false,
          owner: {
            login: 'octocat',
            id: 1,
            node_id: 'MDQ6VXNlcjE=',
            avatar_url: 'https://github.com/images/error/octocat_happy.gif',
            gravatar_id: '',
            url: 'https://api.github.com/users/octocat',
            html_url: 'https://github.com/octocat',
            type: 'User',
          },
          html_url: 'https://github.com/octocat/sample-repo',
          description: 'This is a sample repository',
          fork: false,
          url: 'https://api.github.com/repos/octocat/sample-repo',
          created_at: '2021-01-01T00:00:00Z',
          updated_at: '2021-01-02T00:00:00Z',
          pushed_at: '2021-01-03T00:00:00Z',
          homepage: 'https://github.com',
          size: 100,
          stargazers_count: 10,
          watchers_count: 10,
          language: 'JavaScript',
          forks_count: 5,
          open_issues_count: 2,
          license: {
            key: 'mit',
            name: 'MIT License',
            url: 'https://api.github.com/licenses/mit',
          },
          default_branch: 'main',
        },
        {
          id: 654321,
          node_id: 'MDEwOlJlcG9zaXRvcnk2NTQzMjE=',
          name: 'another-repo',
          full_name: 'octocat/another-repo',
          private: true,
          owner: {
            login: 'octocat',
            id: 1,
            node_id: 'MDQ6VXNlcjE=',
            avatar_url: 'https://github.com/images/error/octocat_happy.gif',
            gravatar_id: '',
            url: 'https://api.github.com/users/octocat',
            html_url: 'https://github.com/octocat',
            type: 'User',
          },
          html_url: 'https://github.com/octocat/another-repo',
          description: 'This is another repository',
          fork: false,
          url: 'https://api.github.com/repos/octocat/another-repo',
          created_at: '2021-02-01T00:00:00Z',
          updated_at: '2021-02-02T00:00:00Z',
          pushed_at: '2021-02-03T00:00:00Z',
          homepage: null,
          size: 200,
          stargazers_count: 20,
          watchers_count: 20,
          language: 'TypeScript',
          forks_count: 10,
          open_issues_count: 5,
          license: null,
          default_branch: 'main',
        },
      ],
    };
  },
});
