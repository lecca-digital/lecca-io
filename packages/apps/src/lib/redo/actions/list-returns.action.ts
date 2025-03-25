import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

export const listReturns = createAction({
  id: 'redo_action_list-returns',
  name: 'List Returns',
  description: 'List returns, sorted by most recent to least recent',
  inputConfig: [
    {
      id: 'storeId',
      label: 'Store ID',
      description: 'Store ID',
      inputType: 'text',
      required: {
        missingMessage: 'Store ID is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'updatedAtMax',
      label: 'Updated At Max',
      description:
        'Maximum updated time, exclusive (e.g., 2000-02-01T00:00:00Z)',
      placeholder: 'Select a date',
      inputType: 'date',
    },
    {
      id: 'updatedAtMin',
      label: 'Updated At Min',
      description:
        'Minimum updated time, inclusive (e.g., 2000-01-01T00:00:00Z)',
      placeholder: 'Select a date',
      inputType: 'date',
    },
    {
      id: 'pageMarker',
      label: 'Page Marker',
      description: 'Page marker, from X-Page-Next header',
      placeholder: '',
      inputType: 'text',
    },
    {
      id: 'pageSize',
      label: 'Page Size',
      description: 'Page size, defaults to 20',
      inputType: 'text',
    },
  ],
  aiSchema: z.object({
    storeId: z.string().describe('Store ID'),
    updatedAtMax: z
      .string()
      .optional()
      .nullable()
      .describe('Maximum updated time, exclusive'),
    updatedAtMin: z
      .string()
      .optional()
      .nullable()
      .describe('Minimum updated time, inclusive'),
    pageMarker: z
      .string()
      .optional()
      .nullable()
      .describe('Page marker, from X-Page-Next header'),
    pageSize: z.number().optional().describe('Page size, defaults to 20'),
  }),
  run: async ({ connection, http, configValue, workspaceId }) => {
    const { apiKey } = connection;
    const { storeId, updatedAtMax, updatedAtMin, pageMarker, pageSize } =
      configValue;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };

    if (pageMarker) {
      headers['X-Page-Continue'] = pageMarker;
    }

    if (pageSize) {
      headers['X-Page-Size'] = pageSize.toString();
    }

    // Construct URL with query parameters
    let url = `https://api.getredo.com/v2.2/stores/${storeId}/returns`;
    const queryParams = new URLSearchParams();

    if (updatedAtMax) {
      queryParams.append('updated_at_max', updatedAtMax);
    }

    if (updatedAtMin) {
      queryParams.append('updated_at_min', updatedAtMin);
    }

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }

    const response = await http.request({
      method: 'GET',
      url,
      workspaceId,
      headers,
    });

    // Extract and return the next page marker from headers if present
    const nextPageMarker = response.headers?.['x-page-next'];

    return {
      ...response.data,
      nextPageMarker,
    };
  },
  mockRun: async () => {
    return {
      orders: [
        {
          customer: {
            emailAddress: 'user@example.com',
            name: {
              given: 'John',
              surname: 'Smith',
            },
            phoneNumber: '+15555555555',
          },
          externalId: '1073459971',
          id: '64e4da943dd822979a70bd12',
          items: [
            {
              externalId: '123',
              fulfillmentLocationId: '123',
              id: 'string',
              price: {
                amount: '50.2',
                currency: 'USD',
              },
              product: {
                externalId: 'string',
                name: 'string',
              },
              quantity: 1,
              variant: {
                externalId: 'string',
                name: 'string',
                sku: 'string',
                weight: {
                  kg: 0.021,
                },
              },
            },
          ],
          name: '#123',
        },
      ],
      returns: [
        {
          createdAt: '2019-08-24T14:15:22Z',
          destination: {
            mailingAddress: {
              city: 'Anytown',
              country: 'US',
              line1: '123 Main St',
              line2: '',
              postalCode: '12345',
              state: 'WA',
            },
            phoneNumber: '+15555555555',
          },
          id: '64df65d4c5a4ca3eff4b4e43',
          items: [
            {
              id: 'string',
              orderItem: {
                id: 'string',
              },
              quantity: 1,
              reason: 'Too big',
              refund: {
                amount: {
                  amount: '50.2',
                  currency: 'USD',
                },
              },
            },
          ],
          order: {
            id: 'abc123',
          },
          status: 'open',
          updatedAt: '2019-08-24T14:15:22Z',
        },
      ],
      nextPageMarker: '64df700931a04885276c3364',
    };
  },
});
