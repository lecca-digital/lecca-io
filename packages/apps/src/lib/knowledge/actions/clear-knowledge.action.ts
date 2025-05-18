import { createAction } from '@lecca-io/toolkit';
import { createDynamicSelectInputField } from '@lecca-io/toolkit';
import { z } from 'zod';

export const clearKnowledge = createAction({
  id: 'knowledge_action_clear-knowledge',
  name: 'Clear Data',
  description:
    'Removes all knowledge from a notebook while preserving the notebook itself.',
  iconUrl: `https://lecca-io.s3.us-east-2.amazonaws.com/assets/actions/knowledge_action_search-knowledge.svg`,
  inputConfig: [
    createDynamicSelectInputField({
      id: 'knowledgeId',
      label: 'Notebook',
      description: 'The knowledge notebook to clear.',
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
  ],

  aiSchema: z.object({
    knowledgeId: z.string().describe('The knowledge notebook ID to clear.'),
  }),

  run: async ({ configValue, projectId, workspaceId, prisma, knowledge }) => {
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
        `Knowledge does not exist in this project or workspace: ${configValue.knowledgeId}`,
      );
    }

    await knowledge.clearKnowledge({
      knowledgeId: configValue.knowledgeId,
      workspaceId,
    });

    return {
      success: true,
      message: 'Knowledge notebook cleared successfully',
    };
  },

  mockRun: async () => {
    return {
      success: true,
      message: 'Knowledge notebook cleared successfully',
    };
  },
});
