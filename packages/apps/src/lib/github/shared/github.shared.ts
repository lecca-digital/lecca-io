import { createDynamicSelectInputField } from '@lecca-io/toolkit';

export const shared = {
  fields: {
    dynamicSelectOwner: createDynamicSelectInputField({
      id: 'owner',
      label: 'Owner',
      description: 'Select a GitHub organization or username',
      placeholder: 'Select owner',
      _getDynamicValues: async ({ connection, workspaceId, http }) => {
        // First, get the authenticated user
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
        const owners = [
          {
            label: `${user.login} (Personal)`,
            value: user.login,
          },
        ];

        // Then get the user's organizations
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

        if (orgsResult.status === 200 && Array.isArray(orgsResult.data)) {
          const orgs = orgsResult.data.map((org) => ({
            label: `${org.login} (Organization)`,
            value: org.login,
          }));
          owners.push(...orgs);
        }

        return owners;
      },
      required: {
        missingMessage: 'Owner is required',
        missingStatus: 'warning',
      },
    }),
    dynamicSelectRepo: createDynamicSelectInputField({
      id: 'repo',
      label: 'Repository',
      description: 'Select a GitHub repository',
      placeholder: 'Select repository',
      _getDynamicValues: async ({
        connection,
        workspaceId,
        http,
        extraOptions,
      }) => {
        const { owner } = extraOptions;

        if (!owner?.trim?.()) {
          return [];
        }

        // Get repositories for the selected owner
        const reposUrl = `https://api.github.com/users/${owner}/repos?sort=updated&per_page=100`;
        const reposResult = await http.request({
          method: 'GET',
          url: reposUrl,
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          workspaceId,
        });

        if (reposResult.status !== 200) {
          throw new Error(
            `Failed to fetch repositories: ${reposResult.status}`,
          );
        }

        const repos = reposResult.data.map((repo) => ({
          label: repo.name,
          value: repo.name,
        }));

        return repos;
      },
      required: {
        missingMessage: 'Repository is required',
        missingStatus: 'warning',
      },
      loadOptions: {
        forceRefresh: true,
        dependsOn: ['owner'],
      },
    }),

    dynamicSelectRepositoryWorkflows: createDynamicSelectInputField({
      id: 'workflowId',
      label: 'Workflow',
      description: 'Select a GitHub Actions workflow',
      placeholder: 'Select workflow',
      _getDynamicValues: async ({
        connection,
        workspaceId,
        http,
        extraOptions,
      }) => {
        const { owner, repo } = extraOptions;

        if (!owner?.trim?.() || !repo?.trim?.()) {
          return [];
        }

        const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows`;

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

        if (result.status !== 200) {
          throw new Error(`Failed to fetch workflows: ${result.status}`);
        }

        return result.data.workflows.map((workflow) => ({
          label: workflow.name,
          value: workflow.path.split('/').pop() || String(workflow.id),
        }));
      },
      required: {
        missingMessage: 'Workflow is required',
        missingStatus: 'warning',
      },
      loadOptions: {
        forceRefresh: true,
        dependsOn: ['owner', 'repo'],
      },
    }),
  },
};
