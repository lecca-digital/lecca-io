import { createAction, createTextInputField } from '@lecca-io/toolkit';
import { z } from 'zod';

export const listIndexes = createAction({
  id: 'qdrant_action_list-collections',
  name: 'List Collections',
  description: 'List all existing collections in Qdrant',
  inputConfig: [
    createTextInputField({
      id: 'url',
      label: 'URL',
      description: 'URL of the Qdrant instance. Eg: http://localhost:6333/',
      required: {
        missingMessage: 'The Qdrant URL is required',
        missingStatus: 'error',
      },
    }),
  ],
  aiSchema: z.object({
    url: z.string().describe('URL of the Qdrant instance').url(),
  }),
  run: async ({ connection, configValue, workspaceId, http }) => {
    const url = new URL(configValue.url);
    url.pathname += `collections`;

    const response = await http.request({
      method: 'GET',
      url: url.toString(),
      headers: {
        'api-Key': connection.apiKey,
      },
      workspaceId,
    });

    return response.data;
  },
  mockRun: async () => {
    return {
      usage: {
        cpu: 1,
        payload_io_read: 1,
        payload_io_write: 1,
        payload_index_io_read: 1,
        payload_index_io_write: 1,
        vector_io_read: 1,
        vector_io_write: 1,
      },
      time: 0.002,
      status: 'ok',
      result: {
        collections: [
          {
            name: 'arivx-title',
          },
          {
            name: 'arivx-abstract',
          },
          {
            name: 'medium-title',
          },
          {
            name: 'medium-text',
          },
        ],
      },
    };
  },
});
