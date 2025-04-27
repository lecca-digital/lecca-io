import {
  createAction,
  createJsonInputField,
  createNumberInputField,
  createSwitchInputField,
  createTextInputField,
} from '@lecca-io/toolkit';
import { z } from 'zod';

export const queryVectors = createAction({
  id: 'qdrant_action_query-vectors',
  name: 'Query Vectors',
  description: 'Query vectors in a Qdrant collection',
  inputConfig: [
    createJsonInputField({
      id: 'vector',
      label: 'Vector',
      description:
        'The query vector. Should be the same length of the dimension of the index being queried.',
      required: {
        missingMessage: 'Vectors are required',
        missingStatus: 'warning',
      },
      placeholder: 'Enter vector embeddings',
    }),
    createNumberInputField({
      id: 'limit',
      label: 'Limit',
      description: 'The number of results to return for each query',
      required: {
        missingMessage: 'Limit is required',
        missingStatus: 'warning',
      },
      placeholder: 'Add search limit',
    }),
    createJsonInputField({
      id: 'filter',
      label: 'Filter',
      description: 'Filter to apply to the query',
      placeholder: 'Add optional filter',
    }),
    createSwitchInputField({
      id: 'withVectors',
      label: 'With Vectors',
      description: 'Whether to return vectors with the results',
      switchOptions: {
        checked: 'true',
        unchecked: 'false',
        defaultChecked: false,
      },
    }),
    createSwitchInputField({
      id: 'withPayload',
      label: 'With Payload',
      description: 'Whether to return payload with the results',
      switchOptions: {
        checked: 'true',
        unchecked: 'false',
        defaultChecked: true,
      },
    }),
    createTextInputField({
      id: 'collectionName',
      label: 'Collection Name',
      description: 'Name of the collection to query',
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
    indexHost: z.string(),
    vector: z.string().describe('The query vector'),
    limit: z
      .number()
      .min(1)
      .max(10000)
      .describe('The number of results to return for each query'),
    filter: z
      .any()
      .describe('Filter to apply to the query')
      .nullable()
      .optional(),
    withVectors: z
      .enum(['true', 'false'])
      .describe('Whether to return vectors in the results'),
    withPayload: z
      .enum(['true', 'false'])
      .describe('Whether to return payload in the results'),
    collectionName: z.string().describe('Name of the collection to query').nullable().optional(),
    url: z.string().describe('URL of the Qdrant instance').url(),
  }),
  run: async ({ connection, configValue, workspaceId, http }) => {
    const { apiKey } = connection;

    const data = {
      query: JSON.parse(configValue.vector),
      limit: configValue.limit,
      filter: configValue.filter ? JSON.parse(configValue.filter) : {},
      with_payload: configValue.withVectors === 'true',
      with_vector: configValue.withPayload === 'true',
    };

    const url = new URL(configValue.url);
    url.pathname += `collections/${configValue.collectionName}/points/query`;

    const response = await http.request({
      method: 'POST',
      url: url.toString(),
      data,
      headers: {
        'api-Key': apiKey,
      },
      workspaceId,
    });

    return response.data;
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
        "points": [
          {
            "id": 42,
            "version": 3,
            "score": 0.75,
            "payload": {
              "city": "London",
              "color": "green"
            },
            "vector": [
              0.875,
              0.140625,
              0.897599995136261
            ],
            "shard_key": "region_1",
            "order_value": 42
          }
        ]
      }
    };
  },
});
