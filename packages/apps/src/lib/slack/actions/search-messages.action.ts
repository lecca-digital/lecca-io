import {
  createAction,
  createNumberInputField,
  createSelectInputField,
  createTextInputField,
} from '@lecca-io/toolkit';
import { z } from 'zod';

export const searchMessages = createAction({
  id: 'slack_action_search-messages',
  name: 'Search Messages',
  description: 'Search for messages in Slack workspace',
  iconUrl: `https://lecca-io.s3.us-east-2.amazonaws.com/assets/actions/slack_action_search-messages.svg`,
  aiSchema: z.object({
    query: z.string().describe('The search query'),
    count: z
      .number()
      .optional()
      .describe('Number of items to return per page (default: 20)'),
    page: z
      .number()
      .optional()
      .describe('Page number of results to return (default: 1)'),
    highlight: z
      .enum(['true', 'false'])
      .optional()
      .describe(
        'Whether to enable query highlight markers ("true" or "false")',
      ),
    sort: z
      .enum(['score', 'timestamp'])
      .optional()
      .describe('Sort results by either score or timestamp (default: score)'),
    sort_dir: z
      .enum(['asc', 'desc'])
      .optional()
      .describe('Sort direction - ascending or descending (default: desc)'),
  }),
  inputConfig: [
    createTextInputField({
      id: 'query',
      label: 'Search Query',
      description:
        'Search query to find messages. You can use filters like "in:channel_name" or "from:username"',
      placeholder: 'Enter search query',
      required: {
        missingMessage: 'Search query is required',
        missingStatus: 'warning',
      },
    }),
    createNumberInputField({
      id: 'count',
      label: 'Results Per Page',
      description: 'Number of items to return per page (max: 100)',
      placeholder: '20',
      numberOptions: {
        min: 1,
        max: 100,
      },
    }),
    createNumberInputField({
      id: 'page',
      label: 'Page Number',
      description: 'Page number of results to return (max: 100)',
      placeholder: '1',
      numberOptions: {
        min: 1,
        max: 100,
      },
    }),
    createSelectInputField({
      id: 'highlight',
      label: 'Highlight Results',
      description: 'Enable query highlight markers in search results',
      selectOptions: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
      defaultValue: 'false',
    }),
    createSelectInputField({
      id: 'sort',
      label: 'Sort By',
      description: 'Sort results by relevance score or timestamp',
      selectOptions: [
        { label: 'Relevance Score', value: 'score' },
        { label: 'Timestamp', value: 'timestamp' },
      ],
      defaultValue: 'score',
    }),
    createSelectInputField({
      id: 'sort_dir',
      label: 'Sort Direction',
      description: 'Sort direction - ascending or descending',
      selectOptions: [
        { label: 'Ascending', value: 'asc' },
        { label: 'Descending', value: 'desc' },
      ],
      defaultValue: 'desc',
    }),
  ],
  run: async ({ configValue, connection, workspaceId, http }) => {
    const url = 'https://slack.com/api/search.messages';

    // Build the parameters
    const params = new URLSearchParams({
      query: configValue.query,
    });

    // Add optional parameters if they're provided
    if (configValue.count) params.append('count', configValue.count.toString());
    if (configValue.page) params.append('page', configValue.page.toString());
    if (configValue.highlight)
      params.append(
        'highlight',
        configValue.highlight === 'true' ? 'true' : 'false',
      );
    if (configValue.sort) params.append('sort', configValue.sort);
    if (configValue.sort_dir) params.append('sort_dir', configValue.sort_dir);

    const result = await http.request({
      method: 'GET',
      url: `${url}?${params.toString()}`,
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      workspaceId,
    });

    if (result?.data?.ok) {
      return result.data;
    } else {
      throw new Error(`Failed to search messages: ${result.data?.error}`);
    }
  },
  mockRun: async ({ configValue }) => ({
    ok: true,
    query: configValue.query || 'example query',
    messages: {
      matches: [
        {
          channel: {
            id: 'C12345678',
            is_ext_shared: false,
            is_mpim: false,
            is_org_shared: false,
            is_pending_ext_shared: false,
            is_private: false,
            is_shared: false,
            name: 'general',
            pending_shared: [],
          },
          iid: 'cb64bdaa-c1e8-4631-8a91-0f78080113e9',
          permalink:
            'https://example.slack.com/archives/C12345678/p1508284197000015',
          team: 'T12345678',
          text: 'Example message matching search query.',
          ts: '1508284197.000015',
          type: 'message',
          user: 'U2U85N1RV',
          username: 'user1',
        },
        {
          channel: {
            id: 'C87654321',
            is_ext_shared: false,
            is_mpim: false,
            is_org_shared: false,
            is_pending_ext_shared: false,
            is_private: false,
            is_shared: false,
            name: 'random',
            pending_shared: [],
          },
          iid: '9a00d3c9-bd2d-45b0-988b-6cff99ae2a90',
          permalink:
            'https://example.slack.com/archives/C87654321/p1508795665000236',
          team: 'T12345678',
          text: 'Another example message that matches the search.',
          ts: '1508795665.000236',
          type: 'message',
          user: 'U1A2B3C4D',
          username: 'user2',
        },
      ],
      pagination: {
        first: 1,
        last: 2,
        page: 1,
        page_count: 1,
        per_page: 20,
        total_count: 2,
      },
      paging: {
        count: 20,
        page: 1,
        pages: 1,
        total: 2,
      },
      total: 2,
    },
  }),
});
