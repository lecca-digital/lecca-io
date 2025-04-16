import { FieldConfig, InputConfig } from '@lecca-io/toolkit';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Agent, Knowledge, Workflow } from '@prisma/client';
import {
  CoreAssistantMessage,
  CoreMessage,
  CoreTool,
  CoreToolMessage,
  LanguageModelUsage,
  LanguageModelV1,
  generateText,
  streamText,
} from 'ai';
import { Message } from 'ai';
import { z } from 'zod';

import { JwtUser } from '../../../types/jwt-user.type';
import {
  AiProvider,
  AiProviderService,
} from '../../global/ai-provider/ai-provider.service';
import { CreditsService } from '../../global/credits/credits.service';
import { PrismaService } from '../../global/prisma/prisma.service';
import { WorkflowAppsService } from '../workflow-apps/workflow-apps.service';
import { WorkflowNodeForRunner } from '../workflow-runner/workflow-runner.service';

import { CreateTaskDto } from './dto/create-task.dto';
import { TaskExpansionDto } from './dto/task-expansion.dto';
import { TaskFilterByDto } from './dto/task-filter-by.dto';
import { TaskIncludeTypeDto } from './dto/task-include-type.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WorkflowAppsService))
    private workflowAppService: WorkflowAppsService,
    private creditsService: CreditsService,
    private aiProviderService: AiProviderService,
  ) {}

  messageTaskOrCreateTaskIfNotFound = async (
    args: MessageTaskProps & {
      agentId: string;
      customIdentifier: string | undefined;
    },
  ) => {
    const existingTask = await this.prisma.task.findFirst({
      where: {
        id: args.taskId,
      },
      select: {
        id: true,
        customIdentifier: true,
        name: true,
      },
    });

    if (existingTask) {
      const hasAccess = await this.checkWorkspaceUserHasAccessToTask({
        workspaceUserId: args.requestingWorkspaceUserId,
        taskId: args.taskId,
      });

      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this task');
      }

      return await this.messageTask(args);
    } else {
      const firstMessage = args.messages[0];
      let newName = 'New Task';
      let textContent = '';

      if (typeof firstMessage.content === 'string') {
        textContent = firstMessage.content;
      } else {
        textContent = (firstMessage.content as any)?.[0]?.text;
      }

      newName =
        textContent?.length > 30
          ? textContent.slice(0, 30) + '...'
          : textContent;

      const newTask = await this.create({
        data: {
          id: args.taskId,
          name: newName,
          customIdentifier: args.customIdentifier,
        },
        agentId: args.agentId,
      });

      return await this.messageTask({
        ...args,
        taskId: newTask.id,
        shouldRenameTask: true,
      });
    }
  };

  messageTask = async ({
    taskId,
    messages: inputMessages,
    requestingWorkspaceUserId,
    requestingWorkflowId,
    requestingAgentId,
    workspaceId,
    shouldStream = true,
    simpleResponse = true,
    shouldRenameTask,
  }: MessageTaskProps) => {
    try {
      const taskWithAgentId = await this.prisma.task.findUnique({
        where: {
          id: taskId,
        },
        select: {
          FK_agentId: true,
        },
      });

      if (!taskWithAgentId) {
        throw new NotFoundException('Task not found');
      }

      const agent = await this.getAgentDataForMessaging({
        agentId: taskWithAgentId.FK_agentId,
      });

      const taskMessages = await this.#getTaskMessagesForContext({
        taskId,
      });

      const messagesForContext = taskMessages.concat(inputMessages as any);

      if (!agent.llmConnection) {
        await this.creditsService.checkIfWorkspaceHasLlmCredits({
          aiProvider: agent.llmProvider as AiProvider,
          model: agent.llmModel,
          workspaceId,
        });
      }

      const llmProviderClient = this.aiProviderService.getAiLlmProviderClient({
        aiProvider: agent.llmProvider as AiProvider,
        llmConnection: agent.llmConnection,
        llmModel: agent.llmModel,
        workspaceId: workspaceId,
      });

      let tools = await this.getAgentTools({
        agent: agent,
        workspaceId,
        taskId,
      });

      const provider =
        this.aiProviderService.providers[agent.llmProvider as AiProvider];
      const model = provider.languageModels[agent.llmModel];

      if (provider?.validateConfiguration) {
        // Frequency penalty can be -2 to 2 for open ai, but perplexity needs it to be > 0
        //So this validateConfiguration function can be added to a provider to modify the configuration
        //or throw a descriptive error if the configuration is invalid.
        const response = provider.validateConfiguration({
          frequency_penalty: agent.frequencyPenalty,
        });

        agent.frequencyPenalty = response.frequency_penalty;
      }

      if (model?.canUseTemperature === false) {
        agent.temperature = null;
      }
      if (model?.tools === false) {
        tools = {};
      }

      let nameTaskUsage: LanguageModelUsage | null = null;
      if (shouldRenameTask) {
        nameTaskUsage = await this.nameTask({
          taskId: taskId,
          llmProviderClient,
          messagesForContext: messagesForContext as CoreMessage[],
          taskNamingInstructions: agent.taskNamingInstructions,
        });
      }

      if (shouldStream) {
        const result = streamText({
          model: llmProviderClient,
          toolChoice: 'auto',
          tools,
          system: agent.instructions || undefined,
          messages: messagesForContext as CoreMessage[],
          maxRetries: agent.maxRetries == null ? undefined : agent.maxRetries,
          frequencyPenalty:
            agent.frequencyPenalty == null ? undefined : agent.frequencyPenalty,
          maxSteps:
            agent.maxToolRoundtrips == null
              ? undefined
              : agent.maxToolRoundtrips,
          presencePenalty:
            agent.presencePenalty == null ? undefined : agent.presencePenalty,
          seed: agent.seed == null ? undefined : agent.seed,
          temperature:
            agent.temperature == null ? undefined : agent.temperature,
          onFinish: async (result) => {
            const formattedInputMessages = this.#addDataToInputMessages({
              messages: inputMessages as any,
              requestingWorkspaceUserId: requestingWorkspaceUserId,
              requestingAgentId: requestingAgentId,
              requestingWorkflowId: requestingWorkflowId,
            });

            const formattedResponseMessages = this.#addDataToOutputMessages({
              messages: result.response.messages,
              agentId: taskWithAgentId.FK_agentId,
              tools: agent.tools as WorkflowNodeForRunner[],
            });

            await this.#appendMessagesToTask({
              taskId,
              messages: [
                ...formattedInputMessages,
                ...formattedResponseMessages,
              ] as any,
            });

            if (agent.llmConnection == null) {
              if (nameTaskUsage) {
                result.usage.promptTokens += nameTaskUsage.promptTokens;
                result.usage.completionTokens += nameTaskUsage.completionTokens;
              }

              const creditsUsed =
                this.creditsService.transformLlmTokensToCredits({
                  data: {
                    inputTokens: result.usage.promptTokens,
                    outputTokens: result.usage.completionTokens,
                  },
                  aiProvider: agent.llmProvider as AiProvider,
                  model: agent.llmModel,
                });

              await this.creditsService.updateWorkspaceCredits({
                creditsUsed,
                workspaceId,
                projectId: agent.FK_projectId,
                data: {
                  ref: {
                    agentId: taskWithAgentId.FK_agentId,
                    taskId,
                  },
                  details: {
                    aiProvider: agent.llmProvider,
                    model: agent.llmModel,
                    usage: result.usage,
                  },
                },
              });
            }
          },
        });

        return result;
      } else {
        const result = await generateText({
          model: llmProviderClient,
          toolChoice: 'auto',
          tools,
          system: agent.instructions || undefined,
          messages: messagesForContext as CoreMessage[],
          maxRetries: agent.maxRetries == null ? undefined : agent.maxRetries,
          frequencyPenalty:
            agent.frequencyPenalty == null ? undefined : agent.frequencyPenalty,
          maxSteps:
            agent.maxToolRoundtrips == null
              ? undefined
              : agent.maxToolRoundtrips,
          presencePenalty:
            agent.presencePenalty == null ? undefined : agent.presencePenalty,
          seed: agent.seed == null ? undefined : agent.seed,
          temperature:
            agent.temperature == null ? undefined : agent.temperature,
        });

        const formattedInputMessages = this.#addDataToInputMessages({
          messages: inputMessages,
          requestingWorkspaceUserId: requestingWorkspaceUserId,
          requestingAgentId: requestingAgentId,
          requestingWorkflowId: requestingWorkflowId,
        });

        const formattedResponseMessages = this.#addDataToOutputMessages({
          messages: result.response.messages,
          agentId: taskWithAgentId.FK_agentId,
          tools: agent.tools as WorkflowNodeForRunner[],
        });

        await this.#appendMessagesToTask({
          taskId,
          messages: [
            ...formattedInputMessages,
            ...formattedResponseMessages,
          ] as any,
        });

        if (agent.llmConnection == null) {
          if (nameTaskUsage) {
            result.usage.promptTokens += nameTaskUsage.promptTokens;
            result.usage.completionTokens += nameTaskUsage.completionTokens;
          }

          const creditsUsed = this.creditsService.transformLlmTokensToCredits({
            data: {
              inputTokens: result.usage.promptTokens,
              outputTokens: result.usage.completionTokens,
            },
            aiProvider: agent.llmProvider as AiProvider,
            model: agent.llmModel,
          });

          await this.creditsService.updateWorkspaceCredits({
            creditsUsed,
            workspaceId,
            projectId: agent.FK_projectId,
            data: {
              ref: {
                agentId: taskWithAgentId.FK_agentId,
                taskId,
              },
              details: {
                aiProvider: agent.llmProvider,
                model: agent.llmModel,
                usage: result.usage,
              },
            },
          });
        }

        if (simpleResponse) {
          return result.text;
        } else {
          return result.response.messages;
        }
      }
    } catch (err) {
      let details = err.data?.error?.message;
      if (!details) {
        details = err.message;
      }
      throw new BadRequestException(details);
    }
  };

  create = async ({
    data,
    agentId,
    expansion,
  }: {
    data: CreateTaskDto & {
      /**
       * This is if the UI sends a uuid
       */
      id?: string;
    };
    agentId: string;
    expansion?: TaskExpansionDto;
  }) => {
    if (data.customIdentifier === '') {
      //Cleans any dirty inputs
      data.customIdentifier = undefined;
    }

    if (data.customIdentifier) {
      const existingTask = await this.prisma.task.findFirst({
        where: {
          AND: [
            { FK_agentId: agentId },
            {
              customIdentifier: String(data.customIdentifier),
            },
          ],
        },
        select: {
          id: true,
          customIdentifier: true,
          name: true,
        },
      });

      if (existingTask) {
        return this.findOne({
          taskId: existingTask.id,
          expansion,
        });
      } else {
        const { customIdentifier, ...rest } = data;

        const newTask = await this.prisma.task.create({
          data: {
            ...rest,
            id: data.id || undefined,
            customIdentifier: String(customIdentifier),
            FK_agentId: agentId,
          },
          select: {
            id: true,
          },
        });

        return this.findOne({
          taskId: newTask.id,
          expansion,
        });
      }
    } else {
      const newTask = await this.prisma.task.create({
        data: {
          ...data,
          id: data.id || undefined,
          FK_agentId: agentId,
        },
        select: {
          id: true,
        },
      });

      return this.findOne({
        taskId: newTask.id,
        expansion,
      });
    }
  };

  findOne = async ({
    taskId,
    expansion,
    throwNotFoundException,
  }: {
    taskId: string;
    expansion: TaskExpansionDto;
    throwNotFoundException?: boolean;
  }) => {
    if (!taskId) {
      //If there is no id, that means that another method is calling this method without an id.
      //Prisma will throw an error if we don't provide an id, so we throw a custom error here or return null.
      if (throwNotFoundException) {
        throw new NotFoundException('Task not found');
      } else {
        return null;
      }
    }

    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        name: true,
        description: expansion?.description ?? false,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        customIdentifier: expansion?.customIdentifier ?? false,
        messages: expansion?.messages
          ? {
              select: {
                id: true,
                content: true,
                role: true,
                createdAt: true,
                data: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            }
          : false,
        agent: expansion?.agent
          ? {
              select: {
                id: true,
                name: true,
                project: expansion?.project
                  ? {
                      select: {
                        id: true,
                        name: true,
                      },
                    }
                  : false,
              },
            }
          : false,
      },
    });

    if (!task && throwNotFoundException) {
      throw new NotFoundException('Task not found');
    }

    return task;
  };

  update = async <T>({
    taskId,
    data,
    expansion,
  }: {
    taskId: string;
    data: UpdateTaskDto | T;
    expansion?: TaskExpansionDto;
  }) => {
    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
      },
      select: {
        id: true,
      },
    });

    return this.findOne({
      taskId: updatedTask.id,
      expansion,
    });
  };

  findAllForWorkspace = async ({
    jwtUser,
    workspaceId,
    expansion,
    includeType,
    filterBy,
  }: {
    jwtUser: JwtUser;
    workspaceId: string;
    includeType?: TaskIncludeTypeDto;
    expansion?: TaskExpansionDto;
    filterBy?: TaskFilterByDto;
  }) => {
    if (!jwtUser?.roles?.includes('MAINTAINER')) {
      if (includeType?.all)
        throw new ForbiddenException(
          'You do not have permission to request all tasks',
        );
    }

    return this.prisma.task.findMany({
      where: {
        AND: [
          {
            agent: {
              project: {
                FK_workspaceId: workspaceId,
              },
            },
          },
          filterBy?.projectId
            ? {
                agent: {
                  FK_projectId: filterBy.projectId,
                },
              }
            : {},
          filterBy?.agentId
            ? {
                FK_agentId: filterBy.agentId,
              }
            : {},
          includeType?.all
            ? {}
            : {
                agent: {
                  project: {
                    workspaceUsers: {
                      some: {
                        id: jwtUser.workspaceUserId,
                      },
                    },
                  },
                },
              },
        ],
      },
      select: {
        id: true,
        name: true,
        description: expansion?.description ?? false,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        messages: expansion?.messages
          ? {
              select: {
                id: true,
                content: true,
                role: true,
                createdAt: true,
                data: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            }
          : false,
        agent: expansion?.agent
          ? {
              select: {
                id: true,
                name: true,
                project: expansion?.project
                  ? {
                      select: {
                        id: true,
                        name: true,
                      },
                    }
                  : false,
              },
            }
          : false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  };

  delete = async ({ taskId }: { taskId: string }) => {
    return this.prisma.task.delete({
      where: {
        id: taskId,
      },
    });
  };

  getAgentTools = async ({
    agent,
    workspaceId,
    taskId,
  }: {
    agent: Awaited<ReturnType<TasksService['getAgentDataForMessaging']>>;
    workspaceId: string;
    taskId: string;
  }) => {
    //2. Get workflow app's based on connections
    const filteredWorkflowApps = Object.values(this.workflowAppService.apps)
      .map((workflowApp) => {
        const matchingConnection = agent.connections.find(
          (connection) => connection.workflowAppId === workflowApp.id,
        );

        return {
          connection: matchingConnection || null,
          workflowApp: workflowApp,
        };
      })
      .filter(
        (app) =>
          app.workflowApp.needsConnection === false || app.connection !== null,
      );

    const connectionTools = filteredWorkflowApps.reduce((acc, curr) => {
      return {
        ...acc,
        ...curr.workflowApp.getAppTools({
          connectionId: curr.connection?.id,
          connectionDescription: curr.connection?.description,
          enabledActions: agent.agentActions.map((action) => action.actionId),
          projectId: agent.FK_projectId,
          workspaceId: workspaceId,
          workflowId: undefined, //undefined since the workflow isn't actually calling it, the agent is.
          executionId: undefined,
          taskId: taskId,
          agentId: agent.id,
        }),
      };
    }, {}) as Record<string, CoreTool<any, any>>;

    //3. Get tools from filtered workflow apps and workflows and subagents
    const knowledgeTools = await this.#getKnowledgeTools({
      allKnowledge: agent.agentKnowledge.map(({ knowledge }) => knowledge),
      workspaceId: workspaceId,
      projectId: agent.FK_projectId,
      agentId: agent.id,
    });

    const workflowTools = await this.#getWorkflowTools({
      workflows: agent.agentWorkflows.map(({ workflow }) => workflow),
      workspaceId: workspaceId,
      projectId: agent.FK_projectId,
      agentId: agent.id,
    });

    const subAgentTools = await this.#getSubAgentTools({
      taskId,
      workspaceId: workspaceId,
      projectId: agent.FK_projectId,
      parentAgentId: agent.id,
      subAgents: agent.agentSubAgents.map(({ subagent }) => subagent),
    });

    let webTools = {};
    if (
      agent.agentWebAccess?.webSearchEnabled ||
      agent.agentWebAccess?.websiteAccessEnabled
    ) {
      webTools = await this.#getWebTools({
        workspaceId: workspaceId,
        projectId: agent.FK_projectId,
        agentId: agent.id,
        webSearchEnabled: agent.agentWebAccess?.webSearchEnabled,
        websiteAccessEnabled: agent.agentWebAccess?.websiteAccessEnabled,
      });
    }

    let phoneTools = {};
    if (agent.agentPhoneAccess?.outboundCallsEnabled) {
      phoneTools = await this.#getPhoneTools({
        workspaceId: workspaceId,
        projectId: agent.FK_projectId,
        agentId: agent.id,
        outboundCallsEnabled: agent.agentPhoneAccess?.outboundCallsEnabled,
      });
    }

    //New way we do tools. All others are legacy.
    const actionTools = await this.#getActionTools({
      agentId: agent.id,
      workspaceId: workspaceId,
      projectId: agent.FK_projectId,
      taskId: taskId,
      tools: agent.tools as WorkflowNodeForRunner[],
    });

    const tools = {
      ...knowledgeTools,
      ...workflowTools,
      ...subAgentTools,
      ...connectionTools,
      ...webTools,
      ...phoneTools,
      ...actionTools,
    };

    return tools;
  };

  nameTask = async ({
    taskId,
    llmProviderClient,
    messagesForContext,
    taskNamingInstructions,
  }: {
    taskId: string;
    llmProviderClient: LanguageModelV1;
    messagesForContext: CoreMessage[];
    taskNamingInstructions: string | null;
  }): Promise<LanguageModelUsage | null> => {
    try {
      const result = await generateText({
        model: llmProviderClient,
        toolChoice: 'none',
        system: `Generate a succinct name for this task based on the messages provided to you. Only output the name. ${taskNamingInstructions?.trim() ? `Additional naming instructions: ${taskNamingInstructions}` : ''}`,
        messages: messagesForContext as CoreMessage[],
        maxRetries: 1,
        maxTokens: 25,
      });

      //name can be a maximum of 100 characters
      const newName =
        result.text.length > 100
          ? result.text.slice(0, 97) + '...'
          : result.text;

      //If the generateText fails, it could return an empty string, so we check if the newName is not empty.
      if (newName?.trim()) {
        await this.update({
          taskId,
          data: {
            name: newName,
          },
        });
      }

      return result.usage ?? null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  checkWorkspaceUserHasAccessToTask = async ({
    workspaceUserId,
    taskId,
  }: {
    workspaceUserId: string;
    taskId: string;
  }) => {
    const belongs = await this.prisma.task.findFirst({
      where: {
        AND: [
          {
            id: taskId,
          },
          {
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
        ],
      },
    });

    return !!belongs;
  };

  checkTaskBelongsToWorkspace = async ({
    workspaceId,
    taskId,
  }: {
    workspaceId: string;
    taskId: string;
  }) => {
    const belongs = await this.prisma.task.findFirst({
      where: {
        AND: [
          {
            id: taskId,
          },
          {
            agent: {
              project: {
                FK_workspaceId: workspaceId,
              },
            },
          },
        ],
      },
    });

    return !!belongs;
  };

  #addDataToInputMessages = ({
    messages,
    requestingAgentId,
    requestingWorkspaceUserId,
    requestingWorkflowId,
  }: {
    messages: Message[];
    requestingWorkspaceUserId?: string;
    requestingAgentId?: string;
    requestingWorkflowId?: string;
  }) => {
    return messages.map((message) => {
      if (requestingWorkspaceUserId) {
        return {
          ...message,
          data: {
            workspaceUserId: requestingWorkspaceUserId,
          },
        };
      } else if (requestingAgentId) {
        return {
          ...message,
          data: {
            agentId: requestingAgentId,
          },
        };
      } else if (requestingWorkflowId) {
        return {
          ...message,
          data: {
            workflowId: requestingWorkflowId,
          },
        };
      }
    });
  };

  #addDataToOutputMessages = ({
    messages,
    agentId,
    tools,
  }: {
    messages: CoreMessage[];
    agentId: string;
    tools: WorkflowNodeForRunner[];
  }) => {
    return messages.map((message) => {
      if (message.role === 'tool') {
        const contentWithData = message.content.map((content) => {
          const toolIdFromToolName = content.toolName?.split('tool-')?.[1];
          const toolMatchingToolName = tools.find(
            (tool) => tool.id === toolIdFromToolName,
          );

          if (toolMatchingToolName) {
            const contentData: { appId: string; actionId: string } = {
              appId: toolMatchingToolName.appId,
              actionId: toolMatchingToolName.actionId,
            };

            return {
              ...content,
              data: contentData,
            };
          } else {
            return content;
          }
        });

        return {
          ...message,
          content: contentWithData,
          data: {
            agentId: agentId,
          },
        };
      } else {
        return {
          ...message,
          data: {
            agentId: agentId,
          },
        };
      }
    });
  };

  getAgentDataForMessaging = async ({ agentId }: { agentId: string }) => {
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
      },
      select: {
        id: true,
        instructions: true,
        temperature: true,
        maxTokens: true,
        topP: true,
        frequencyPenalty: true,
        presencePenalty: true,
        maxRetries: true,
        seed: true,
        maxToolRoundtrips: true,
        messageLookbackLimit: true,
        FK_projectId: true,
        llmModel: true,
        llmProvider: true,
        llmConnection: {
          select: {
            id: true,
            connectionId: true,
            apiKey: true, //This is assuming we're only supporting api key connections
          },
        },
        tools: true,
        agentWorkflows: {
          select: {
            workflow: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
                triggerNode: true,
              },
            },
          },
        },
        agentSubAgents: {
          select: {
            subagent: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        agentActions: {
          select: {
            actionId: true,
          },
        },
        agentKnowledge: {
          select: {
            knowledge: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        connections: {
          select: {
            id: true,
            name: true,
            connectionId: true,
            description: true, //For more ai tool metadata
            workflowAppId: true,
          },
        },
        agentWebAccess: {
          select: {
            service: true,
            webSearchEnabled: true,
            websiteAccessEnabled: true,
          },
        },
        agentPhoneAccess: {
          select: {
            service: true,
            outboundCallsEnabled: true,
          },
        },
        taskNamingInstructions: true,
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  };

  #getKnowledgeTools = async ({
    allKnowledge,
    workspaceId,
    projectId,
    agentId,
  }: {
    allKnowledge: Pick<Knowledge, 'id' | 'name' | 'description'>[];
    workspaceId: string;
    projectId: string;
    agentId: string;
  }): Promise<Record<string, CoreTool<any, any>>> => {
    const tools: Record<string, CoreTool<any, any>> = {};

    const searchKnowledgeAction =
      this.workflowAppService.apps['knowledge'].actionMap[
        'knowledge_action_search-knowledge'
      ];

    for (const knowledge of allKnowledge) {
      const overrideDescription = `${knowledge.name}${knowledge.description ? ` - ${knowledge.description}` : ''}`;

      tools[`knowledge-${knowledge.id}`] = searchKnowledgeAction.toToolJSON({
        projectId,
        workflowId: undefined,
        agentId,
        workspaceId,
        executionId: undefined,
        taskId: undefined,
        overrideDescription,
        configValueAgentId: undefined,
        configValueWorkflowId: undefined,
        configValueKnowledgeId: knowledge.id,
        configValueCustomIdentifier: undefined,
      });
    }

    return tools;
  };

  #getWorkflowTools = async ({
    workflows,
    workspaceId,
    projectId,
    agentId,
  }: {
    workflows: Pick<
      Workflow,
      'id' | 'name' | 'description' | 'triggerNode' | 'isActive'
    >[];
    workspaceId: string;
    projectId: string;
    agentId: string;
  }): Promise<Record<string, CoreTool<any, any>>> => {
    const tools: Record<string, CoreTool<any, any>> = {};

    const runWorkflowAction =
      this.workflowAppService.apps['flow-control'].actionMap[
        'flow-control_action_run-workflow'
      ];

    for (const workflow of workflows) {
      //We need to dynamically create the configValue AI Schema using the custom input fields
      //created in workflow 'manually run' input config.

      if (!workflow?.triggerNode) {
        throw new BadRequestException('Workflow does not have a trigger node');
      }

      const triggerNode = workflow.triggerNode as WorkflowNodeForRunner;

      const customInputConfig = triggerNode.value
        ?.customInputConfig as FieldConfig[]; //Not InputConfig, since it doesn't support nested fields

      const aiSchema = this.#generateDynamicConfigValueAiSchema({
        customInputConfig,
      });

      let overrideDescription = `${workflow.name}${workflow.description ? ` - ${workflow.description}` : ''}`;
      if (workflow.isActive === false) {
        overrideDescription = `${workflow.name} - Inactive, workflow cannot be ran.`;
      }

      tools[`workflow-${workflow.id}`] = runWorkflowAction.toToolJSON({
        projectId,
        workflowId: undefined,
        agentId,
        workspaceId,
        executionId: undefined,
        taskId: undefined,
        overrideDescription,
        configValueAgentId: undefined,
        configValueWorkflowId: workflow.id,
        configValueKnowledgeId: undefined,
        overrideConfigValueAiSchema: aiSchema ?? undefined,
        configValueCustomIdentifier: undefined,
      });
    }

    return tools;
  };

  #getSubAgentTools = async ({
    taskId,
    subAgents,
    workspaceId,
    projectId,
    parentAgentId,
  }: {
    taskId: string;
    subAgents: Pick<Agent, 'id' | 'name' | 'description'>[];
    workspaceId: string;
    projectId: string;
    parentAgentId: string;
  }): Promise<Record<string, CoreTool<any, any>>> => {
    const tools: Record<string, CoreTool<any, any>> = {};

    const messageAgentAction =
      this.workflowAppService.apps['ai'].actionMap['ai_action_message-agent'];

    for (const subAgent of subAgents) {
      tools[`subagent-${subAgent.id}`] = messageAgentAction.toToolJSON({
        projectId,
        workflowId: undefined,
        //In this case, the agentId (parentAgentId) is calling the configValueAgentId.
        agentId: parentAgentId,
        workspaceId,
        executionId: undefined,
        taskId: undefined,
        overrideDescription: `${subAgent.name}${subAgent.description ? ` - ${subAgent.description}` : ''}`,
        configValueAgentId: subAgent.id,
        configValueKnowledgeId: undefined,
        configValueWorkflowId: undefined,
        configValueCustomIdentifier: taskId,
      });
    }

    return tools;
  };

  #getWebTools = async ({
    workspaceId,
    projectId,
    agentId,
    webSearchEnabled,
    websiteAccessEnabled,
  }: {
    workspaceId: string;
    projectId: string;
    agentId: string;
    webSearchEnabled: boolean | undefined;
    websiteAccessEnabled: boolean | undefined;
  }): Promise<Record<string, CoreTool<any, any>>> => {
    const tools: Record<string, CoreTool<any, any>> = {};

    if (websiteAccessEnabled) {
      //Retrieves website content using a playwright browser.
      //More expensive, takes longer, but works for websites that require javascript.
      const extractWebsiteContentAction =
        this.workflowAppService.apps['web'].actionMap[
          'web_action_extract-website-content'
        ];

      tools[`web-extract-website-content`] =
        extractWebsiteContentAction.toToolJSON({
          projectId,
          workflowId: undefined,
          agentId,
          workspaceId,
          executionId: undefined,
          taskId: undefined,
          configValueAgentId: undefined,
          configValueWorkflowId: undefined,
          configValueKnowledgeId: undefined,
          overrideConfigValueAiSchema: undefined,
          configValueCustomIdentifier: undefined,
          overrideDescription:
            'Extract website content from javascript enabled websites. Only use if the static website content tool does not work.',
        });

      //Retrieves static html content from a website.
      const extractStaticWebsiteContentAction =
        this.workflowAppService.apps['web'].actionMap[
          'web_action_extract-static-website-content'
        ];

      tools[`web-extract-static-website-content`] =
        extractStaticWebsiteContentAction.toToolJSON({
          projectId,
          workflowId: undefined,
          agentId,
          workspaceId,
          executionId: undefined,
          taskId: undefined,
          configValueAgentId: undefined,
          configValueWorkflowId: undefined,
          configValueKnowledgeId: undefined,
          overrideConfigValueAiSchema: undefined,
          configValueCustomIdentifier: undefined,
          overrideDescription:
            "Extract static website content. Use this one first if the website is static because it's faster and cheaper.",
        });
    }

    if (webSearchEnabled) {
      const searchWebAction =
        this.workflowAppService.apps['web'].actionMap[
          'web_action_google-search'
        ];

      tools[`web-google-search`] = searchWebAction.toToolJSON({
        projectId,
        workflowId: undefined,
        agentId,
        workspaceId,
        executionId: undefined,
        taskId: undefined,
        configValueAgentId: undefined,
        configValueWorkflowId: undefined,
        configValueKnowledgeId: undefined,
        configValueCustomIdentifier: undefined,
        overrideConfigValueAiSchema: undefined,
      });
    }

    return tools;
  };

  #getPhoneTools = async ({
    workspaceId,
    projectId,
    agentId,
    outboundCallsEnabled,
  }: {
    workspaceId: string;
    projectId: string;
    agentId: string;
    outboundCallsEnabled: boolean | undefined;
  }): Promise<Record<string, CoreTool<any, any>>> => {
    const tools: Record<string, CoreTool<any, any>> = {};

    if (outboundCallsEnabled) {
      const makePhoneCallaction =
        this.workflowAppService.apps['phone'].actionMap[
          'phone_action_make-phone-call'
        ];

      tools[`phone-make-phone-call`] = makePhoneCallaction.toToolJSON({
        projectId,
        workflowId: undefined,
        agentId,
        workspaceId,
        executionId: undefined,
        taskId: undefined,
        configValueAgentId: undefined,
        configValueWorkflowId: undefined,
        configValueKnowledgeId: undefined,
        configValueCustomIdentifier: undefined,
        overrideConfigValueAiSchema: undefined,
      });
    }

    return tools;
  };

  #getActionTools = async ({
    projectId,
    tools,
    agentId,
    workspaceId,
    taskId,
  }: {
    tools: WorkflowNodeForRunner[];
    projectId: string;
    agentId: string;
    workspaceId: string;
    taskId: string;
  }) => {
    if (!tools) {
      return {};
    } else {
      const actionTools: Record<string, CoreTool<any, any>> = {};

      await Promise.all(
        tools.map(async (tool) => {
          const toolApp = this.workflowAppService.apps[tool.appId];
          const toolAction = toolApp.actionMap[tool.actionId];

          const userInput = tool.value ?? {};
          //Removes any empty strings, empty arrays, and empty objects so that the AI can provide those fields.
          //This is because the UI doesn't clear field values, it just leaves them empty but not undefined or null.
          const cleanedUserInput = this.#cleanInputValue({ value: userInput });
          let overrideSchema: z.ZodObject<any, any> | undefined;

          if (tool.actionId === 'flow-control_action_run-workflow') {
            //We need to dynamically create the configValue AI Schema using the custom input fields
            //created in workflow 'manually run' input config.

            //1. Retrieve workflow with triggerNode
            const workflow = await this.prisma.workflow.findFirst({
              where: {
                AND: [
                  {
                    id: tool.value?.workflowId,
                  },
                  {
                    FK_projectId: projectId,
                  },
                ],
              },
              select: {
                triggerNode: true,
                isActive: true,
              },
            });

            if (!workflow?.triggerNode) {
              throw new BadRequestException(
                'Workflow tool does not have a trigger node',
              );
            }

            const triggerNode = workflow.triggerNode as WorkflowNodeForRunner;

            const customInputConfig = triggerNode.value
              ?.customInputConfig as FieldConfig[]; //Not InputConfig, since it doesn't support nested fields

            overrideSchema = this.#generateDynamicConfigValueAiSchema({
              customInputConfig,
            });
          }

          const zodSchema = toolAction.toToolJSON({
            projectId,
            workflowId: undefined,
            agentId,
            workspaceId,
            taskId,
            executionId: undefined,
            overrideConfig: cleanedUserInput,
            overrideDescription: `${tool.name}${tool.description ? ` - ${tool.description}` : ''}`,
            connectionDescription: undefined, //We should remove connectionDescription
            connectionId: undefined,
            configValueAgentId: undefined,
            configValueWorkflowId: undefined,
            configValueKnowledgeId: undefined,
            configValueCustomIdentifier: undefined,
            overrideConfigValueAiSchema: overrideSchema,
          });

          //Combines the user input and the zod schema to generate a zod schema of fields the AI needs to fill out.
          const { newSchema } = this.#filterAiSchemaWithUserInput({
            zodSchema: zodSchema.parameters,
            userInput: cleanedUserInput,
            inputConfigSchema: toolAction.inputConfig,
          });

          zodSchema.parameters = newSchema;
          actionTools[`tool-${tool.id}`] = zodSchema;
        }),
      );

      return actionTools;
    }
  };

  #filterAiSchemaWithUserInput = ({
    zodSchema,
    userInput,
  }: {
    zodSchema: z.ZodObject<any, any>;
    userInput: Record<string, any>;
    inputConfigSchema: InputConfig;
  }) => {
    const shape = zodSchema.shape;
    const omittedFields: string[] = [];
    const filteredShape: Record<string, any> = {};

    //inputType maps are special types. Because the are partially filled out by the user
    //but then we want AI to fill out the rest. So we can't omit it completely from the AI schema.
    //TODO: We'll implement this later. For now, we will require the user to fill out the entire map in the UI
    // const idsOfInputTypeMap = new Set<string>();
    // inputConfigSchema.forEach((field: FieldConfig) => {
    //   if (field.inputType === 'map') {
    //     idsOfInputTypeMap.add(field.id);
    //   }
    // });

    // Iterate through the schema fields
    for (const key in shape) {
      // Check if the user has provided a non-empty value
      if (
        !(key in userInput) ||
        userInput[key] === '' ||
        (Array.isArray(userInput[key]) && userInput[key].length === 0)
      ) {
        filteredShape[key] = shape[key]; // Include fields not provided by user
      } else {
        omittedFields.push(key); // Omit fields provided by user
      }
    }

    return { newSchema: z.object(filteredShape), omittedFields };
  };

  #cleanInputValue = ({ value }: { value: Record<string, any> }) => {
    const cleanObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj
          .map((item) => cleanObject(item))
          .filter((item) => item !== null);
      } else if (obj !== null && typeof obj === 'object') {
        return Object.entries(obj).reduce((acc, [key, val]) => {
          const cleanedValue = cleanObject(val) as any;
          if (
            !(typeof cleanedValue === 'string' && cleanedValue.trim() === '') &&
            !(
              typeof cleanedValue === 'object' &&
              cleanedValue !== null &&
              Object.keys(cleanedValue).length === 0
            )
          ) {
            acc[key] = cleanedValue;
          }
          return acc;
        }, {} as any);
      } else if (typeof obj === 'string' && obj.trim() === '') {
        return null;
      }

      return obj;
    };

    const cleanedObject = cleanObject(value);

    return cleanedObject;
  };

  #generateDynamicConfigValueAiSchema = ({
    customInputConfig,
  }: {
    customInputConfig: FieldConfig[];
  }) => {
    if (!customInputConfig || customInputConfig.length === 0) {
      return undefined;
    }

    const schemaShape: Record<string, any> = {};

    customInputConfig.forEach((field) => {
      let fieldSchema;

      switch (field.inputType) {
        case 'text':
          fieldSchema = z.string();
          break;
        case 'number':
          fieldSchema = z.number();
          break;
        case 'select': {
          const selectEnums = field.selectOptions?.map(
            (option) => option.value as string,
          ) as ['']; //this is because a z.enum can't be empty

          fieldSchema = z.enum(selectEnums);
          break;
        }
        case 'multi-select': {
          const selectEnums = field.selectOptions?.map(
            (option) => option.value as string,
          ) as ['']; //this is because a z.enum can't be empty

          fieldSchema = z.array(z.enum(selectEnums));
          break;
        }
        case 'date':
          fieldSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date',
          });
          break;
        case 'date-time':
          fieldSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date-time',
          });
          break;
        default:
          throw new Error(`Unknown input type: ${field.inputType}`);
      }

      if (field.required) {
        //I noticed if I didn't add this describe, the the AI would try to run the workflow without the required input
        //and then an error would be thrown from the zod schema.
        if (field.defaultValue !== undefined && field.defaultValue !== '') {
          fieldSchema = fieldSchema.describe(
            "This value is required for the workflow to run, but a default value is provided if you don't get/have it.",
          );
        } else {
          fieldSchema = fieldSchema.describe(
            'This value is required for the workflow to run',
          );
        }
      } else {
        if (field.defaultValue !== undefined && field.defaultValue !== '') {
          fieldSchema = fieldSchema
            .nullable()
            .optional()
            //I noticed that the AI would just randomly generate optional inputs out of thin air sometimes.
            .describe(
              'Only provide this value if asked to or if you have it, but a default value is provided if you do not.',
            );
        } else {
          fieldSchema = fieldSchema
            .nullable()
            .optional()
            //I noticed that the AI would just randomly generate optional inputs out of thin air sometimes.
            .describe('Only provide this value if asked to or if you have it.');
        }
      }

      if (field.defaultValue !== undefined && field.defaultValue !== '') {
        if (field.inputType === 'multi-select') {
          fieldSchema = (fieldSchema as any).default([field.defaultValue]);
        } else {
          fieldSchema = (fieldSchema as any).default(field.defaultValue);
        }
      }

      schemaShape[field.id] = fieldSchema;
    });

    return z.object({ customInputConfigValues: z.object(schemaShape) });
  };

  #getTaskMessagesForContext = async ({ taskId }: { taskId: string }) => {
    const taskWithMessages = await this.prisma.task.findFirst({
      where: {
        id: taskId,
      },
      select: {
        messages: {
          select: {
            id: true,
            content: true,
            role: true,
            data: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return taskWithMessages.messages;
  };

  #appendMessagesToTask = async ({
    taskId,
    messages,
  }: {
    taskId: string;
    messages: {
      parts: any; //won't be used, but vercel ai sdk streams parts. We don't want that to be saved to the db
      role: Message['role'];
      content:
        | Message['content']
        | CoreToolMessage['content']
        | CoreAssistantMessage['content'];
    }[];
  }) => {
    await this.prisma.taskMessage.createMany({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data: messages.map(({ parts, ...message }, index): any => {
        return {
          ...message,
          //Use the index to slightly offset the createdAt so that the messages are in order.
          createdAt: new Date(new Date().getTime() + index).toISOString(),
          FK_taskId: taskId,
        };
      }),
    });

    return await this.prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        updatedAt: new Date().toISOString(),
      },
    });
  };
}

export type TriggerTaskPayload = {
  agentId: string;

  /**
   * If a taskId isn't passed, a task will be created first.
   */
  taskId?: string;

  /**
   * If a workflow triggers the task, then we'll need the workflowId
   */
  workflowId?: string;

  /**
   * The input for the agent
   */
  data: string;
};

type MessageTaskProps = {
  taskId: string;
  messages: Message[];
  requestingWorkspaceUserId?: string;
  requestingWorkflowId?: string;
  requestingAgentId?: string;
  workspaceId: string;

  /**
   * `default: true`
   */
  shouldStream?: boolean;

  /**
   * `default: true`
   * If true, only the assistant response text will be returned.
   * If false, the entire repsonse message array including tools and text responses will be returned.
   */
  simpleResponse?: boolean;

  shouldRenameTask?: boolean;
};
