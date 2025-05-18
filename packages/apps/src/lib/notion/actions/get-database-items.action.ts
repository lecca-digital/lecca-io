import { createAction, createTextInputField } from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/notion.shared';

export const getDatabaseItems = createAction({
  id: 'notion_action_get-database-items',
  name: 'Get Database Pages',
  description: 'Retrieves all items from a Notion database',
  aiSchema: z.object({
    databaseId: z.string(),
    filter: z.string().optional(),
    sorts: z.string().optional(),
  }),
  inputConfig: [
    shared.fields.dynamicSelectDatabase,
    createTextInputField({
      id: 'filter',
      label: 'Filter (JSON)',
      description: 'Optional JSON filter object',
      placeholder: '{"property":"Status","status":{"equals":"Done"}}',
    }),
    createTextInputField({
      id: 'sorts',
      label: 'Sorts (JSON)',
      description: 'Optional JSON sort object',
      placeholder: '[{"timestamp":"created_time","direction":"descending"}]',
    }),
  ],
  run: async ({ connection, configValue }) => {
    const notionLib = shared.notionLib({
      accessToken: connection.accessToken,
    });

    let cursor;
    let hasMore = true;
    const results = [];

    do {
      const queryParams = {
        start_cursor: cursor,
        database_id: configValue.databaseId,
      };

      if (configValue.filter) {
        try {
          const parsedFilter = JSON.parse(configValue.filter);
          Object.assign(queryParams, { filter: parsedFilter });
        } catch (error) {
          // If filter is invalid JSON, ignore it
          console.error('Invalid filter JSON:', error);
        }
      }

      if (configValue.sorts) {
        try {
          const parsedSorts = JSON.parse(configValue.sorts);
          Object.assign(queryParams, { sorts: parsedSorts });
        } catch (error) {
          // If sorts is invalid JSON, ignore it
          console.error('Invalid sorts JSON:', error);
        }
      }

      const response = await notionLib.databases.query(queryParams);

      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
      results.push(...response.results);
    } while (hasMore);

    return {
      items: results,
    };
  },
  mockRun: async () => {
    return {
      items: [
        {
          id: 'sample-page-id-1',
          object: 'page',
          created_time: '2023-10-01T00:00:00.000Z',
          last_edited_time: '2023-10-02T00:00:00.000Z',
          properties: {
            Name: {
              id: 'title',
              type: 'title',
              title: [
                {
                  type: 'text',
                  text: {
                    content: 'Sample Document 1',
                  },
                  plain_text: 'Sample Document 1',
                },
              ],
            },
          },
        },
        {
          id: 'sample-page-id-2',
          object: 'page',
          created_time: '2023-09-28T00:00:00.000Z',
          last_edited_time: '2023-09-30T00:00:00.000Z',
          properties: {
            Name: {
              id: 'title',
              type: 'title',
              title: [
                {
                  type: 'text',
                  text: {
                    content: 'Sample Document 2',
                  },
                  plain_text: 'Sample Document 2',
                },
              ],
            },
          },
        },
      ],
    };
  },
});
