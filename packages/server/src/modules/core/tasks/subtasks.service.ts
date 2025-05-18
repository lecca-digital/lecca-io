import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SubTask, SubTaskStatus, TaskMessage } from '@prisma/client';
import { LanguageModelV1, generateObject } from 'ai';
import { z } from 'zod';

import { PrismaService } from '../../global/prisma/prisma.service';

import { CreateSubTaskDto } from './dto/create-sub-task.dto';
import { UpdateSubTaskDto } from './dto/update-sub-task.dto';

@Injectable()
export class SubTasksService {
  constructor(private prisma: PrismaService) {}

  create = async ({ data }: { data: CreateSubTaskDto }) => {
    const subTask = await this.prisma.subTask.create({
      data: {
        name: data.name,
        FK_taskId: data.taskId,
        description: data.description,
        status: data.status,
      },
    });

    return subTask;
  };

  createMany = async ({ data }: { data: CreateSubTaskDto[] }) => {
    const subTask = await this.prisma.subTask.createMany({
      data: data.map((subTask) => ({
        name: subTask.name,
        FK_taskId: subTask.taskId,
        description: subTask.description,
        status: subTask.status,
      })),
    });

    return subTask;
  };

  findAllForTask = async ({ taskId }: { taskId: string }) => {
    try {
      const subTasks = await this.prisma.subTask.findMany({
        where: {
          FK_taskId: taskId,
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
        },
      });

      return subTasks;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  };

  findOne = async ({
    subTaskId,
    throwNotFoundException,
  }: {
    subTaskId: string;
    throwNotFoundException?: boolean;
  }) => {
    if (!subTaskId) {
      //If there is no id, that means that another method is calling this method without an id.
      //Prisma will throw an error if we don't provide an id, so we throw a custom error here or return null.
      if (throwNotFoundException) {
        throw new NotFoundException('Sub-task not found');
      } else {
        return null;
      }
    }

    const subTask = await this.prisma.subTask.findUnique({
      where: {
        id: subTaskId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
      },
    });

    if (!subTask && throwNotFoundException) {
      throw new NotFoundException('Sub-task not found');
    }

    return subTask;
  };

  update = async ({
    subTaskId,
    data,
  }: {
    subTaskId: string;
    data: UpdateSubTaskDto;
  }) => {
    const updatedSubTask = await this.prisma.subTask.update({
      where: {
        id: subTaskId,
      },
      data,
    });

    return this.findOne({
      subTaskId: updatedSubTask.id,
    });
  };

  delete = async ({ subTaskId }: { subTaskId: string }) => {
    return this.prisma.subTask.delete({
      where: {
        id: subTaskId,
      },
    });
  };

  deleteMany = async ({ subTaskIds }: { subTaskIds: string[] }) => {
    return this.prisma.subTask.deleteMany({
      where: {
        id: {
          in: subTaskIds,
        },
      },
    });
  };

  checkWorkspaceUserHasAccessToSubTask = async ({
    workspaceUserId,
    subTaskId,
  }: {
    workspaceUserId: string;
    subTaskId: string;
  }) => {
    const belongs = await this.prisma.subTask.findFirst({
      where: {
        AND: [
          {
            id: subTaskId,
          },
          {
            task: {
              agent: {
                project: {
                  workspaceUsers: {
                    some: {
                      id: workspaceUserId,
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    return !!belongs;
  };

  checkSubTaskBelongsToWorkspace = async ({
    workspaceId,
    subTaskId,
  }: {
    workspaceId: string;
    subTaskId: string;
  }) => {
    const belongs = await this.prisma.subTask.findFirst({
      where: {
        AND: [
          {
            id: subTaskId,
          },
          {
            task: {
              agent: {
                project: {
                  FK_workspaceId: workspaceId,
                },
              },
            },
          },
        ],
      },
    });

    return !!belongs;
  };

  /**
   * Manage subtasks based on the input from an LLM.
   * This method will create new subtasks, mark subtasks as completed,
   * blocked, or pending, and delete subtasks as specified.
   */
  manageSubTasks = async ({
    taskId,
    newSubTasks = [],
    completedSubTasks = [],
    blockedSubTasks = [],
    pendingSubTasks = [],
    deletedSubTasks = [],
  }: {
    taskId: string;
    newSubTasks?: string[];
    completedSubTasks?: string[];
    blockedSubTasks?: string[];
    pendingSubTasks?: string[];
    deletedSubTasks?: string[];
  }) => {
    // Verify task exists
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subTasks: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Create new subtasks
    if (newSubTasks.length > 0) {
      await this.createMany({
        data: newSubTasks.map((subTask) => ({
          name: subTask.substring(0, 100),
          taskId: taskId,
        })),
      });
    }

    // Mark completed subtasks
    for (const completedId of completedSubTasks) {
      try {
        await this.update({
          subTaskId: completedId,
          data: { status: SubTaskStatus.complete },
        });
      } catch (error) {
        console.error(
          `Error marking subtask ${completedId} as complete:`,
          error,
        );
      }
    }

    // Mark blocked subtasks
    for (const blockedId of blockedSubTasks) {
      try {
        await this.update({
          subTaskId: blockedId,
          data: { status: SubTaskStatus.blocked },
        });
      } catch (error) {
        console.error(`Error marking subtask ${blockedId} as blocked:`, error);
      }
    }

    // Mark pending subtasks
    for (const pendingId of pendingSubTasks) {
      try {
        await this.update({
          subTaskId: pendingId,
          data: { status: SubTaskStatus.pending },
        });
      } catch (error) {
        console.error(`Error marking subtask ${pendingId} as pending:`, error);
      }
    }

    // Delete subtasks that are no longer relevant
    if (deletedSubTasks.length > 0) {
      try {
        await this.deleteMany({ subTaskIds: deletedSubTasks });
      } catch (error) {
        console.error(`Error deleting subtasks:`, error);
      }
    }

    // Return the updated list of subtasks
    return this.findAllForTask({ taskId });
  };

  /**
   * Will check the messages of the task and mark sub-tasks as completed,
   * as blocked, delete, or create new sub-tasks.
   */
  manageSubTasksListWithLLM = async ({
    taskId,
    agentId,
    workspaceId,
    projectId,
    llmClient,
  }: {
    taskId: string;
    agentId: string;
    workspaceId: string;
    projectId: string;
    llmClient: LanguageModelV1;
  }) => {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        subTasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Get the current subtasks for this task
    const currentSubTasks = task.subTasks || [];

    // Analyze messages to determine task status and required subtasks
    // This would be where you'd call your LLM to analyze the conversation and task
    // For now, we'll implement a placeholder for the response structure
    const llmAnalysis = await this.analyzeLLMResponse({
      taskMessages: task.messages,
      subTasks: currentSubTasks,
      agentId,
      projectId,
      workspaceId,
      llmClient,
    });

    // Process the analysis result
    const {
      newSubTasks = [],
      completedSubTaskIds = [],
      blockedSubTaskIds = [],
      pendingSubTaskIds = [],
      deletedSubTaskIds = [],
    } = llmAnalysis;

    // Create new subtasks
    await this.createMany({
      data: newSubTasks.map((subTask) => ({
        name: subTask.name,
        taskId: taskId,
      })),
    });

    // Mark completed subtasks
    for (const completedId of completedSubTaskIds) {
      const subtask = currentSubTasks.find((st) => st.id === completedId);
      if (subtask && subtask.status !== SubTaskStatus.complete) {
        await this.update({
          subTaskId: completedId,
          data: { status: SubTaskStatus.complete },
        });
      }
    }

    // Mark blocked subtasks
    for (const blockedId of blockedSubTaskIds) {
      await this.update({
        subTaskId: blockedId,
        data: { status: SubTaskStatus.blocked },
      });
    }

    // Mark pending subtasks
    for (const pendingId of pendingSubTaskIds) {
      await this.update({
        subTaskId: pendingId,
        data: { status: SubTaskStatus.pending },
      });
    }

    // Delete subtasks that are no longer relevant
    await this.deleteMany({ subTaskIds: deletedSubTaskIds });

    // Return the updated list of subtasks
    return this.findAllForTask({ taskId });
  };

  /**
   * Private helper method to analyze task and determine subtask status
   * This would be replaced with actual LLM integration
   */
  private analyzeLLMResponse = async ({
    taskMessages,
    subTasks,
    agentId,
    workspaceId,
    projectId,
    llmClient,
  }: {
    taskMessages: TaskMessage[];
    subTasks: SubTask[];
    agentId: string;
    workspaceId: string;
    projectId: string;
    llmClient: LanguageModelV1;
  }) => {
    try {
      // Build a context string from the messages
      const messageContext = taskMessages
        .map((msg) => {
          const content =
            typeof msg.content === 'string'
              ? msg.content
              : JSON.stringify(msg.content);

          return `${msg.role}: ${content}`;
        })
        .join('\n\n');

      // Build a context string for existing subtasks
      const subtasksContext = subTasks.length
        ? 'Current subtasks:\n' +
          subTasks
            .map(
              (task) =>
                `- ${task.id}: "${task.name}" (Status: ${task.status})${
                  task.description ? ` - ${task.description}` : ''
                }`,
            )
            .join('\n')
        : 'No existing subtasks.';

      // Create the prompt for the LLM
      const prompt = `
You are analyzing a conversation to determine the subtasks needed to complete a task.
Based on the conversation history and current subtasks, determine which subtasks:
1. Need to be created
2. Have been completed 
3. Are blocked
4. Remain pending
5. Should be deleted (no longer relevant)

CURRENT CONVERSATION:
${messageContext}

${subtasksContext}

Please provide your analysis identifying the changes needed to the subtasks.
`;

      // Use generateObject for structured output
      const { object, usage } = await generateObject({
        model: llmClient,
        schema: z.object({
          newSubTasks: z
            .array(
              z.object({
                name: z.string().max(100).describe('Name of the new subtask'),
              }),
            )
            .describe('New subtask IDs'),
          completedSubTasks: z
            .array(z.string().describe('Completed subtask IDs'))
            .describe('Completed subtask IDs'),
          blockedSubTasks: z
            .array(z.string().describe('Blocked subtask IDs'))
            .describe('Blocked subtask IDs'),
          pendingSubTasks: z
            .array(z.string().describe('Pending subtask IDs'))
            .describe('Pending subtask IDs'),
          deletedSubTasks: z
            .array(z.string().describe('Deleted subtask IDs'))
            .describe('Deleted subtask IDs'),
        }),
        prompt,
        temperature: 0.2,
        maxTokens: 4000,
      });

      // Calculate tokens for billing
      const promptTokens =
        usage?.promptTokens || this.calculatePromptTokens(prompt);
      const completionTokens =
        usage?.completionTokens ||
        this.calculateCompletionTokens(JSON.stringify(object));

      // Record token usage for billing
      await this.transformLlmTokensToCredits({
        agentId,
        projectId,
        workspaceId,
        promptTokens,
        completionTokens,
      });

      return {
        newSubTasks: object.newSubTasks || [],
        completedSubTaskIds: object.completedSubTasks || [],
        blockedSubTaskIds: object.blockedSubTasks || [],
        pendingSubTaskIds: object.pendingSubTasks || [],
        deletedSubTaskIds: object.deletedSubTasks || [],
      };
    } catch (error) {
      console.error('Error analyzing task with LLM:', error);
      // Return empty structure on error
      return {
        newSubTasks: [],
        completedSubTaskIds: [],
        blockedSubTaskIds: [],
        pendingSubTaskIds: [],
        deletedSubTaskIds: [],
      };
    }
  };

  /**
   * Calculate prompt tokens for billing purposes
   */
  private calculatePromptTokens(text: string): number {
    // Approximate tokens by counting words and multiplying by 1.3
    // A more accurate token counter would be preferred in production
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  /**
   * Calculate completion tokens for billing purposes
   */
  private calculateCompletionTokens(text: string): number {
    // Approximate tokens by counting words and multiplying by 1.3
    // A more accurate token counter would be preferred in production
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  /**
   * Record token usage for billing
   */
  private transformLlmTokensToCredits = async ({
    agentId,
    projectId,
    workspaceId,
    promptTokens,
    completionTokens,
  }: {
    agentId: string;
    projectId: string;
    workspaceId: string;
    promptTokens: number;
    completionTokens: number;
  }) => {
    // Calculate cost - this is a simplified version and should be based on actual model pricing
    const totalTokens = promptTokens + completionTokens;
    const creditsUsed = Math.ceil(totalTokens / 1000);

    // Create credit record
    await this.prisma.credit.create({
      data: {
        creditsUsed,
        details: {
          type: 'llm',
          model: 'claude-3-opus-20240229',
          promptTokens,
          completionTokens,
          totalTokens,
          operation: 'subtasks-analysis',
        },
        FK_agentId: agentId,
        FK_projectId: projectId,
        FK_workspaceId: workspaceId,
      },
    });

    // Update workspace credits
    await this.updateWorkspaceCredits({
      workspaceId,
      creditsUsed,
    });

    return creditsUsed;
  };

  /**
   * Update workspace credits
   */
  private updateWorkspaceCredits = async ({
    workspaceId,
    creditsUsed,
  }: {
    workspaceId: string;
    creditsUsed: number;
  }) => {
    // Get current workspace usage
    const workspaceUsage = await this.prisma.workspaceUsage.findUnique({
      where: {
        FK_workspaceId: workspaceId,
      },
    });

    if (!workspaceUsage) {
      throw new NotFoundException('Workspace usage not found');
    }

    // Check if we need to refresh allotted credits (this would be based on your billing cycle logic)
    // This is just a simplified placeholder
    const shouldRefreshAllottedCredits = false;

    // Update credits
    await this.prisma.workspaceUsage.update({
      where: {
        FK_workspaceId: workspaceId,
      },
      data: {
        // If we've used allotted credits, then use purchased credits
        allottedCredits: shouldRefreshAllottedCredits
          ? workspaceUsage.allottedCredits // Reset to monthly amount
          : Math.max(0, workspaceUsage.allottedCredits - creditsUsed),
        purchasedCredits:
          workspaceUsage.allottedCredits < creditsUsed
            ? workspaceUsage.purchasedCredits -
              (creditsUsed - workspaceUsage.allottedCredits)
            : workspaceUsage.purchasedCredits,
        refreshedAt: shouldRefreshAllottedCredits
          ? new Date()
          : workspaceUsage.refreshedAt,
      },
    });
  };
}
