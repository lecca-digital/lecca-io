import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

export const listInvoices = createAction({
  id: 'redo_action_list-invoices',
  name: 'List Invoices',
  description: 'Get a list of invoices',
  inputConfig: [
    {
      id: 'storeId',
      label: 'Store ID',
      description: 'Store ID',
      placeholder: 'Enter your Redo store ID',
      inputType: 'text',
      required: {
        missingMessage: 'Store ID is required',
        missingStatus: 'warning',
      },
    },
  ],
  aiSchema: z.object({
    storeId: z.string().describe('Store ID'),
  }),
  run: async ({ connection, http, configValue, workspaceId }) => {
    const { apiKey } = connection;
    const { storeId } = configValue;

    const url = `https://api.getredo.com/v2.2/stores/${storeId}/invoices`;

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await http.request({
      method: 'GET',
      url,
      workspaceId,
      headers,
    });

    return response.data;
  },
  mockRun: async () => {
    return {
      invoices: [
        {
          charge: {
            amount: "50.20",
            currency: "USD"
          },
          createdAt: "2019-08-24T14:15:22Z",
          id: "inv_12345",
          status: "paid",
          store: {
            id: "store_6789"
          },
          updatedAt: "2019-08-24T14:15:22Z"
        },
        {
          charge: {
            amount: "125.75",
            currency: "USD"
          },
          createdAt: "2019-08-22T10:45:12Z",
          id: "inv_67890",
          status: "pending",
          store: {
            id: "store_6789"
          },
          updatedAt: "2019-08-22T10:45:12Z"
        }
      ]
    };
  },
});