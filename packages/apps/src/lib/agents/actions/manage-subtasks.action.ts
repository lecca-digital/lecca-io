import { createAction, createMarkdownField } from '@lecca-io/toolkit';
import { z } from 'zod';

export const manageSubtasks = createAction({
  id: 'agent_action_manage-subtasks',
  name: 'Manage Subtasks',
  description:
    'Analyze the current conversation and manage subtasks (create, update, complete, delete) for the task.',
  iconUrl:
    'https://lecca-io.s3.us-east-2.amazonaws.com/assets/actions/agent_action_manage-subtasks.svg',
  inputConfig: [
    createMarkdownField({
      id: 'markdown',
      markdown:
        'This action will allow an AI Agent to update their subtasks as they are working on a task.',
    }),
  ],

  aiSchema: z.object({
    newSubTasks: z
      .array(z.string().describe('Name of the new subtask'))
      .optional()
      .describe('New subtasks to be created'),
    completedSubTasks: z
      .array(z.string().describe('Completed subtask IDs'))
      .optional()
      .describe('Subtask IDs to mark as completed'),
    blockedSubTasks: z
      .array(z.string().describe('Blocked subtask IDs'))
      .optional()
      .describe('Subtask IDs to mark as blocked'),
    pendingSubTasks: z
      .array(z.string().describe('Pending subtask IDs'))
      .optional()
      .describe('Subtask IDs to mark as pending'),
    deletedSubTasks: z
      .array(z.string().describe('Deleted subtask IDs'))
      .optional()
      .describe('Subtask IDs to delete'),
  }),

  run: async ({ configValue, agentId, taskId, task }) => {
    if (!taskId || !agentId) {
      throw new Error(
        `No task ID provided, this tool can only be used by an agent`,
      );
    }

    const updatedSubtasks = await task.manageSubTasks({
      taskId: taskId,
      newSubTasks: configValue.newSubTasks?.map((name) => name) || [],
      completedSubTasks:
        configValue.completedSubTasks?.map((name) => name) || [],
      blockedSubTasks: configValue.blockedSubTasks?.map((name) => name) || [],
      pendingSubTasks: configValue.pendingSubTasks?.map((name) => name) || [],
      deletedSubTasks: configValue.deletedSubTasks?.map((name) => name) || [],
    });

    return {
      subtasks: updatedSubtasks,
    };
  },

  mockRun: async () => {
    return {
      subtasks: [
        {
          id: 'sub1',
          name: 'Research requirements',
          status: 'complete',
          description: 'Gather information about project requirements',
        },
        {
          id: 'sub2',
          name: 'Create initial design',
          status: 'pending',
          description: 'Design the architecture based on requirements',
        },
        {
          id: 'sub3',
          name: 'Implement core features',
          status: 'pending',
          description: null,
        },
      ],
    };
  },
});
