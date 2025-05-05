import {
  createAction,
  createJsonInputField,
  createSelectInputField,
  createTextInputField,
  jsonParse,
} from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/github.shared';

export const createWorkflowDispatchEvent = createAction({
  id: 'github_action_create-workflow-dispatch-event',
  name: 'Create a workflow dispatch event',
  description:
    'Manually trigger a GitHub Actions workflow run with optional inputs.',
  aiSchema: z.object({
    owner: z.string().describe('The GitHub repository owner (e.g., "octocat")'),
    repo: z
      .string()
      .describe('The GitHub repository name (e.g., "hello-world")'),
    workflowId: z
      .string()
      .describe('The workflow file name (e.g., "main.yml")'),
    ref: z
      .string()
      .describe(
        'The git reference (branch or tag) the workflow will run on (e.g., "main")',
      ),
    inputs: z
      .record(z.any())
      .optional()
      .describe(
        'JSON object containing input parameters for the workflow, if any',
      ),
    waitForWorkflowToFinish: z
      .enum(['true', 'false'])
      .optional()
      .default('false')
      .describe('Whether to wait for the workflow to finish execution'),
  }),
  inputConfig: [
    shared.fields.dynamicSelectOwner,
    shared.fields.dynamicSelectRepo,
    shared.fields.dynamicSelectRepositoryWorkflows,
    createTextInputField({
      id: 'ref',
      label: 'Git Ref (Branch or Tag)',
      description:
        'The git ref the workflow should run against (branch or tag).',
      placeholder: 'main',
      required: {
        missingMessage: 'Git ref is required.',
        missingStatus: 'warning',
      },
    }),
    createJsonInputField({
      id: 'inputs',
      label: 'Inputs (Optional)',
      description: 'Optional JSON inputs for the workflow.',
    }),
    createSelectInputField({
      id: 'waitForWorkflowToFinish',
      label: 'Wait for workflow to finish',
      description:
        'Wait for the workflow to complete before returning. Will wait up to 10 minutes.',
      selectOptions: [
        { value: 'false', label: 'No' },
        { value: 'true', label: 'Yes' },
      ],
      defaultValue: 'false',
    }),
  ],
  run: async ({ configValue, connection, workspaceId, http }) => {
    const {
      owner,
      repo,
      workflowId,
      ref,
      inputs: inputsRaw,
      waitForWorkflowToFinish,
    } = configValue;

    // Record current time before dispatching workflow
    const startTime = new Date();
    // Add a small buffer to ensure we don't miss the run (3 seconds)
    startTime.setSeconds(startTime.getSeconds() - 3);

    // Format the timestamp for GitHub API
    const startTimeFormatted = startTime.toISOString();

    // Parse inputs with fallback to handle text with special characters
    const inputs = jsonParse(inputsRaw);

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

    const body: any = { ref };
    if (inputs) {
      // If inputs is a string (parse failed but returned original), wrap it in an object
      if (typeof inputs === 'string') {
        body.inputs = { prompt: inputs };
      }
      // If inputs is an object (successful parse), use it directly
      else if (
        typeof inputs === 'object' &&
        inputs !== null &&
        Object.keys(inputs).length > 0
      ) {
        body.inputs = inputs;
      }
    }

    const result = await http.request({
      method: 'POST',
      url,
      data: body,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      workspaceId,
    });

    if (result.status !== 204) {
      throw new Error(`Failed to dispatch workflow: ${result.status}`);
    }

    if (waitForWorkflowToFinish === 'true') {
      // Wait for the workflow run to start
      let runId: number | null = null;
      let attempts = 0;
      const maxAttempts = 10;

      // Poll for the new workflow run
      while (!runId && attempts < maxAttempts) {
        attempts++;

        // Wait a bit before polling (GitHub needs time to create the workflow run)
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Get recent workflow runs created after our start timestamp
        const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?event=workflow_dispatch&branch=${encodeURIComponent(ref)}&created=>${startTimeFormatted}&per_page=5`;

        const runsResult = await http.request({
          method: 'GET',
          url: runsUrl,
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          workspaceId,
        });

        if (
          runsResult.status === 200 &&
          runsResult.data.workflow_runs &&
          runsResult.data.workflow_runs.length > 0
        ) {
          // Get the most recent run
          const latestRun = runsResult.data.workflow_runs[0];
          runId = latestRun.id;
        }
      }

      if (!runId) {
        throw new Error(
          'Failed to find newly created workflow run after multiple attempts',
        );
      }

      // Poll for workflow completion
      let isComplete = false;
      attempts = 0;
      const maxCompletionAttempts = 120; //Will wait for 10 minutes max
      let runStatus = '';
      let runConclusion = '';

      while (!isComplete && attempts < maxCompletionAttempts) {
        attempts++;

        // Wait between polls
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Check run status
        const runUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`;

        const runResult = await http.request({
          method: 'GET',
          url: runUrl,
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          workspaceId,
        });

        if (runResult.status === 200) {
          runStatus = runResult.data.status;
          runConclusion = runResult.data.conclusion || '';

          // Check if the workflow has completed
          if (runStatus === 'completed') {
            isComplete = true;

            // Check for artifacts
            const artifactsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`;

            const artifactsResult = await http.request({
              method: 'GET',
              url: artifactsUrl,
              headers: {
                Authorization: `Bearer ${connection.accessToken}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
              },
              workspaceId,
            });

            const hasArtifacts =
              artifactsResult.status === 200 &&
              artifactsResult.data.artifacts &&
              artifactsResult.data.artifacts.length > 0;

            // Get artifact information if available
            const artifacts = hasArtifacts
              ? artifactsResult.data.artifacts.map((artifact) => ({
                  id: artifact.id,
                  name: artifact.name,
                  size: artifact.size_in_bytes,
                  created_at: artifact.created_at,
                  expires_at: artifact.expires_at,
                  download_url: artifact.archive_download_url,
                }))
              : [];

            return {
              dispatched: true,
              data: {
                runId,
                runStatus,
                runConclusion,
                hasArtifacts,
                artifacts,
                runUrl: runResult.data.html_url,
              },
            };
          }
        }
      }

      if (!isComplete) {
        throw new Error('Workflow did not complete within the time limit');
      }
    }

    return {
      status: 'success',
      message: `Workflow "${workflowId}" dispatched successfully on ref "${ref}".`,
    };
  },
  mockRun: async ({ configValue }) => {
    const { waitForWorkflowToFinish } = configValue || {};

    if (waitForWorkflowToFinish === 'true') {
      return {
        dispatched: true,
        data: {
          runId: 123456789,
          runStatus: 'completed',
          runConclusion: 'success',
          runUrl: 'https://github.com/owner/repo/actions/runs/123456789',
          hasArtifacts: true,
          artifacts: [
            {
              id: 987654321,
              name: 'pr-data',
              size: 1024,
              created_at: new Date().toISOString(),
              expires_at: new Date(
                Date.now() + 24 * 60 * 60 * 1000,
              ).toISOString(),
              download_url:
                'https://api.github.com/repos/owner/repo/actions/artifacts/987654321/zip',
            },
          ],
        },
      };
    }

    return {
      status: 'success',
    };
  },
});
