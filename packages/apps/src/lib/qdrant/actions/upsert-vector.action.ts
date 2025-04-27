import {
  createAction,
  createJsonInputField,
  createTextInputField,
  jsonParse,
} from '@lecca-io/toolkit';
import { z } from 'zod';

export const upsertPoint = createAction({
  id: 'qdrant_action_upsert-point',
  name: 'Upsert Point',
  description: 'Add point to a Qdrant collection',
  inputConfig: [
    createTextInputField({
      id: 'id',
      label: 'Point ID',
      description: "ID of the point to add. Duplicate IDs will be overwritten",
    }),
    createJsonInputField({
      id: 'vector',
      label: 'Vector',
      description: 'Vector embeddings to upsert',
      required: {
        missingMessage: 'Vector associated with the point',
        missingStatus: 'warning',
      },
    }),
    createJsonInputField({
      id: 'payload',
      label: 'Payload',
      description: 'Payload associated with the point',
    }),
    createTextInputField({
      id: 'collectionName',
      label: 'Collection Name',
      description: 'Name of the collection to add the point to',
    }),
    createTextInputField({
      id: 'url',
      label: 'URL',
      description: 'URL of the Qdrant instance. Eg: http://localhost:6333/',
      required: {
        "missingMessage": "The Qdrant URL is required",
        "missingStatus": "error"
      }
    }),
  ],
  aiSchema: z.object({
    id: z.string().describe('A unique ID of the vector to upsert'),
    vector: z.array(z.number()).describe('The vector embeddings to upsert'),
    payload: z.any().nullable().optional(),
    collectionName: z.string().describe('Name of the collection to query').nullable().optional(),
    url: z.string().describe('URL of the Qdrant instance').url(),
  }),
  run: async ({ connection, configValue, workspaceId, http }) => {
    const { apiKey } = connection;

    const data = {
      points: [
        {
          id: configValue.id,
          vector: jsonParse(configValue.vector),
          payload: configValue.payload
            ? jsonParse(configValue.payload)
            : {},
        },
      ],
    };

    const url = new URL(configValue.url);
    url.pathname += `collections/${configValue.collectionName}/points`;

    const response = await http.request({
      method: 'PUT',
      url: url.toString(),
      data,
      headers: {
        'api-Key': apiKey,
      },
      workspaceId,
    });

    return { response: response.data };
  },
  mockRun: async () => {
    return {
      "usage": {
        "cpu": 1,
        "payload_io_read": 1,
        "payload_io_write": 1,
        "payload_index_io_read": 1,
        "payload_index_io_write": 1,
        "vector_io_read": 1,
        "vector_io_write": 1
      },
      "time": 0.002,
      "status": "ok",
      "result": {
        "status": "acknowledged",
        "operation_id": 1000000
      }
    };
  },
});
