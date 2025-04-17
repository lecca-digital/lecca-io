import { createAction } from '@lecca-io/toolkit';
import { z } from 'zod';

import { shared } from '../shared/notion.shared';

export const getPageContents = createAction({
  id: 'notion_action_get-page',
  name: 'Get Page Contents',
  description: "Fetches a page's contents",
  inputConfig: [shared.fields.dynamicSelectPage],
  aiSchema: z.object({
    page: z.string().describe('The ID of the page to retrieve.'),
  }),
  run: async ({ connection, configValue }): Promise<any> => {
    const { page } = configValue;

    const notionLib = shared.notionLib({
      accessToken: connection.accessToken,
    });

    // Fetch page metadata
    const pageResponse = await notionLib.pages.retrieve({ page_id: page });

    // Fetch page content (blocks)
    const blockChildren = await notionLib.blocks.children.list({
      block_id: page,
    });

    return {
      page: pageResponse,
      content: blockChildren.results,
    };
  },
  mockRun: async (): Promise<any> => {
    return {
      page: {
        object: 'page',
        id: 'mock-page-id',
        created_time: '2023-08-01T00:00:00.000Z',
        last_edited_time: '2023-08-01T12:34:56.000Z',
        parent: {
          type: 'database_id',
          database_id: 'mock-database-id',
        },
        archived: false,
        properties: {},
      },
      content: [
        {
          object: 'block',
          id: 'mock-block-id',
          type: 'paragraph',
          paragraph: {
            text: [
              {
                type: 'text',
                text: {
                  content: 'This is a mock paragraph block.',
                },
              },
            ],
          },
        },
      ],
    };
  },
});
