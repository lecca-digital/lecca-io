import { createAction } from '@lecca-io/toolkit';
import {
  createDynamicSelectInputField,
  createNumberInputField,
  createSwitchInputField,
  createTextInputField,
} from '@lecca-io/toolkit';
import { z } from 'zod';

export const searchKnowledge = createAction({
  id: 'knowledge_action_search-knowledge',
  name: 'Search Knowledge',
  description: 'Search your knowledge notebooks.',
  iconUrl: `https://lecca-io.s3.us-east-2.amazonaws.com/assets/actions/knowledge_action_search-knowledge.svg`,
  inputConfig: [
    createDynamicSelectInputField({
      id: 'knowledgeId',
      label: 'Notebook',
      description: 'The knowledge notebook to query for knowledge.',
      placeholder: 'Select a notebook',
      hideCustomTab: true,
      _getDynamicValues: async ({ workspaceId, projectId, prisma }) => {
        const projectKnowledge = await prisma.knowledge.findMany({
          where: {
            OR: [
              {
                FK_projectId: projectId,
              },
              {
                AND: [
                  {
                    FK_workspaceId: workspaceId,
                  },
                  {
                    FK_projectId: null,
                  },
                ],
              },
            ],
          },
          select: {
            id: true,
            name: true,
          },
        });

        return projectKnowledge.map((knowledge) => ({
          label: knowledge.name,
          value: knowledge.id,
        }));
      },
      required: {
        missingMessage: 'Knowledge notebook is required',
        missingStatus: 'warning',
      },
    }),
    createTextInputField({
      id: 'searchQuery',
      label: 'Search Query',
      description: 'The search query to find information in the notebook.',
      required: {
        missingMessage: 'Search query is required',
        missingStatus: 'warning',
      },
      placeholder: 'Add a search query',
    }),
    createSwitchInputField({
      id: 'shouldLimit',
      label: 'Limit Results? The default limit is 3.',
      description: '',
      switchOptions: {
        checked: 'true',
        unchecked: 'false',
        defaultChecked: false,
      },
    }),
    createNumberInputField({
      id: 'limit',
      label: 'Limit',
      description:
        'The number of maximum results to return. There may be less results returned if there are less results available.',
      placeholder: 'Add a limit',
      loadOptions: {
        dependsOn: [
          {
            id: 'shouldLimit',
            value: 'true',
          },
        ],
      },
    }),
  ],

  aiSchema: z.object({
    knowledgeId: z.string().describe('The knowledge notebook ID to search.'),
    searchQuery: z
      .string()
      .describe('The text to query the knowledge notebook (vector database).'),
    shouldLimit: z
      .enum(['true', 'false'])
      .describe('Whether to limit the number of results returned.'),
    limit: z
      .number()
      .nullable()
      .optional()
      .describe('The number of maximum results to return. Default is 3.'),
  }),

  run: async ({ configValue, projectId, workspaceId, prisma, knowledge }) => {
    if (!configValue.searchQuery) {
      throw new Error(`No search query was provided to search for knowledge.`);
    }

    const knowledgeExistsInProjectOrWorkspace =
      await prisma.knowledge.findFirst({
        where: {
          AND: [
            {
              id: configValue.knowledgeId,
            },
            {
              OR: [
                {
                  FK_projectId: projectId,
                },
                {
                  AND: [
                    {
                      FK_workspaceId: workspaceId,
                    },
                    {
                      FK_projectId: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
        select: {
          id: true,
        },
      });

    if (!knowledgeExistsInProjectOrWorkspace) {
      throw new Error(
        `Knowledge does exist in this project or workspace: ${configValue.knowledgeId}`,
      );
    }

    const contextFromKnowledge = await knowledge.queryKnowledge({
      knowledgeId: configValue.knowledgeId,
      query: configValue.searchQuery,
      limit:
        configValue.shouldLimit === 'true'
          ? configValue.limit != null
            ? Number(configValue.limit)
            : undefined
          : undefined,
      workspaceId,
    });

    return {
      knowledgeId: configValue.knowledgeId,
      results: contextFromKnowledge ?? [],
    };
  },

  mockRun: async () => {
    return {
      knowledgeId: 'knowledgeId',
      results: ['result 1', 'result 2', 'result 3'],
    };
  },
});
