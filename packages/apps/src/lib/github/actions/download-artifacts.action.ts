import {
  createAction,
  createMarkdownField,
  createNumberInputField,
  createTextInputField,
} from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/github.shared';

export const downloadArtifacts = createAction({
  id: 'github_action_download-artifacts',
  name: 'Download Workflow Artifacts',
  description: 'Downloads artifacts from a GitHub Actions workflow run.',
  aiSchema: z.object({
    owner: z.string().describe('The GitHub repository owner (e.g., "octocat")'),
    repo: z
      .string()
      .describe('The GitHub repository name (e.g., "hello-world")'),
    runId: z
      .number()
      .or(z.string().transform(Number))
      .describe('The ID of the workflow run'),
    artifactId: z
      .number()
      .or(z.string().transform(Number))
      .optional()
      .describe(
        'The ID of the specific artifact to download. If not provided, all artifacts will be downloaded.',
      ),
  }),
  inputConfig: [
    shared.fields.dynamicSelectOwner,
    shared.fields.dynamicSelectRepo,
    createNumberInputField({
      id: 'runId',
      label: 'Workflow Run ID',
      description: 'The ID of the workflow run containing the artifacts.',
      placeholder: '1234567890',
      required: {
        missingMessage: 'Workflow Run ID is required.',
        missingStatus: 'warning',
      },
    }),
    createTextInputField({
      id: 'artifactId',
      label: 'Artifact',
      description:
        'Select a specific artifact to download (optional) or leave empty to download all for the run.',
      placeholder: 'Add artifact ID (optional)',
    }),
    createMarkdownField({
      id: 'markdown',
      markdown:
        'Downloaded artifacts will generate a link to retrieve the file. This link will only be available for 24 hours.',
    }),
  ],
  run: async ({ configValue, connection, workspaceId, http, s3 }) => {
    const { owner, repo, runId, artifactId } = configValue;

    // If artifactId is provided, download specific artifact
    if (artifactId) {
      const artifactUrl = `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`;

      const downloadResult = await http.request({
        method: 'GET',
        url: artifactUrl,
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        workspaceId,
        responseType: 'arraybuffer',
      });

      if (downloadResult.status !== 200) {
        throw new Error(
          `Failed to download artifact: ${downloadResult.status}`,
        );
      }

      // Get artifact info to get the name
      const artifactInfoUrl = `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifactId}`;

      const artifactInfoResult = await http.request({
        method: 'GET',
        url: artifactInfoUrl,
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        workspaceId,
      });

      if (artifactInfoResult.status !== 200) {
        throw new Error(
          `Failed to get artifact info: ${artifactInfoResult.status}`,
        );
      }

      const artifactName =
        artifactInfoResult.data.name || `artifact-${artifactId}`;
      const fileName = `${artifactName}.zip`;
      const filePath = `temp/workspaces/${workspaceId}/github/artifacts/${runId}/${fileName}`;

      await s3.uploadBufferFile({
        buffer: downloadResult.data,
        fileName,
        filePath,
      });

      const url = await s3.getSignedRetrievalUrl(filePath, {
        expiresInMinutes: 1440, // 24 hours
      });

      return {
        artifactUrl: url,
        artifactName: fileName,
        downloadTime: new Date().toISOString(),
      };
    } else {
      // Download list of artifacts first
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

      if (artifactsResult.status !== 200) {
        throw new Error(`Failed to fetch artifacts: ${artifactsResult.status}`);
      }

      if (
        !artifactsResult.data.artifacts ||
        artifactsResult.data.artifacts.length === 0
      ) {
        return {
          message: 'No artifacts found for this workflow run',
          artifacts: [],
        };
      }

      // Download all artifacts
      const artifacts = [];

      for (const artifact of artifactsResult.data.artifacts) {
        const artifactUrl = `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifact.id}/zip`;

        const downloadResult = await http.request({
          method: 'GET',
          url: artifactUrl,
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          workspaceId,
          responseType: 'arraybuffer',
        });

        if (downloadResult.status !== 200) {
          console.error(
            `Failed to download artifact ${artifact.id}: ${downloadResult.status}`,
          );
          continue;
        }

        const fileName = `${artifact.name}.zip`;
        const filePath = `temp/workspaces/${workspaceId}/github/artifacts/${runId}/${fileName}`;

        await s3.uploadBufferFile({
          buffer: downloadResult.data,
          fileName,
          filePath,
        });

        const url = await s3.getSignedRetrievalUrl(filePath, {
          expiresInMinutes: 1440, // 24 hours
        });

        artifacts.push({
          artifactId: artifact.id,
          artifactName: fileName,
          artifactUrl: url,
          size: artifact.size_in_bytes,
          created_at: artifact.created_at,
        });
      }

      return {
        artifacts,
        total: artifacts.length,
        downloadTime: new Date().toISOString(),
      };
    }
  },
  mockRun: async ({ configValue }) => {
    const { artifactId } = configValue || {};

    if (artifactId) {
      return {
        artifactUrl: 'https://example.com/mock-artifact-url',
        artifactName: 'mock-artifact.zip',
        downloadTime: new Date().toISOString(),
      };
    } else {
      return {
        artifacts: [
          {
            artifactId: 12345,
            artifactName: 'artifact-1.zip',
            artifactUrl: 'https://example.com/mock-artifact-1-url',
            size: 1024,
            created_at: new Date().toISOString(),
          },
          {
            artifactId: 67890,
            artifactName: 'artifact-2.zip',
            artifactUrl: 'https://example.com/mock-artifact-2-url',
            size: 2048,
            created_at: new Date().toISOString(),
          },
        ],
        total: 2,
        downloadTime: new Date().toISOString(),
      };
    }
  },
});
