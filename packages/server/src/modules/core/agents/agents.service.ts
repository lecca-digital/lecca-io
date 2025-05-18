import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AgentTrigger } from '@prisma/client';
import { v4 } from 'uuid';

import { ServerConfig } from '../../../config/server.config';
import { JwtUser } from '../../../types/jwt-user.type';
import { PrismaService } from '../../global/prisma/prisma.service';
import { S3ManagerService } from '../../global/s3/s3.service';
import { WorkflowNodeForRunner } from '../workflow-runner/workflow-runner.service';
import { WorkflowsService } from '../workflows/workflows.service';

import { AgentExpansionDto } from './dto/agent-expansion.dto';
import { AgentFilterByDto } from './dto/agent-filter-by.dto';
import { AgentIncludeTypeDto } from './dto/agent-include-type.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(
    private prisma: PrismaService,
    private workflowsService: WorkflowsService,
    private s3Manager: S3ManagerService,
  ) {}

  async create({
    data,
    projectId,
    expansion,
  }: {
    data: CreateAgentDto;
    projectId: string;
    workspaceId: string;
    expansion: AgentExpansionDto;
  }) {
    if (data.tools) {
      await this.#validateNodeData({
        nodes: data.tools,
        projectId,
        patching: false,
      });
    } else {
      data.tools = [];
    }

    const triggers = data.triggers as PartialOrSavedAgentTrigger[];

    if (data.triggers) {
      await this.#validateNodeData({
        nodes:
          data.triggers?.map?.(
            (trigger: { node: WorkflowNodeForRunner }) => trigger.node,
          ) ?? [],
        projectId,
        patching: false,
      });
      delete (data as CreateAgentDto).triggers;
    }

    const connectionIds = (data as UpdateAgentDto).connectionIds;
    if (connectionIds) {
      //So it doesn't get spread on the create object
      delete (data as UpdateAgentDto).connectionIds;
    }

    const knowledgeIds = (data as UpdateAgentDto).knowledgeIds;
    if (knowledgeIds) {
      //So it doesn't get spread on the create object
      delete (data as UpdateAgentDto).knowledgeIds;
    }

    const actionIds = (data as UpdateAgentDto).actionIds;
    if (actionIds) {
      //So it doesn't get spread on the create object
      delete (data as UpdateAgentDto).actionIds;
    }

    const variableIds = (data as UpdateAgentDto).variableIds;
    if (variableIds) {
      //So it doesn't get spread on the create object
      delete (data as UpdateAgentDto).variableIds;
    }

    const workflowIds = (data as UpdateAgentDto).workflowIds;
    if (workflowIds) {
      //So it doesn't get spread on the create object
      delete (data as UpdateAgentDto).workflowIds;
    }

    const agentIds = (data as UpdateAgentDto).agentIds;
    if (agentIds) {
      //So it doesn't get spread on the create object
      delete (data as UpdateAgentDto).agentIds;
    }

    const llmConnectionId = (data as UpdateAgentDto).llmConnectionId;
    if (llmConnectionId) {
      await this.#validateConnectionsBelongToProject({
        connectionIds: [llmConnectionId],
        projectId: projectId,
      });
      delete (data as UpdateAgentDto).llmConnectionId;
    }

    const taskNamingLlmConnectionId = (data as UpdateAgentDto)
      .taskNamingLlmConnectionId;
    if (taskNamingLlmConnectionId) {
      await this.#validateConnectionsBelongToProject({
        connectionIds: [taskNamingLlmConnectionId],
        projectId: projectId,
      });
      delete (data as UpdateAgentDto).taskNamingLlmConnectionId;
    }

    const webAccess = (data as UpdateAgentDto).webAccess;
    if (webAccess != null) {
      delete (data as UpdateAgentDto).webAccess;
    }

    const phoneAccess = (data as UpdateAgentDto).phoneAccess;
    if (phoneAccess != null) {
      delete (data as UpdateAgentDto).phoneAccess;
    }

    const project = await this.#getProjectSettingsByProjectId({
      projectId,
    });

    const newAgent = await this.prisma.agent.create({
      data: {
        ...data,
        triggers: undefined, //We'll set this in the update along with the other properties. Just adding this here to remove type warning
        llmProvider:
          data.llmProvider ??
          project.defaultAgentLlmProvider ??
          ServerConfig.DEFAULT_LLM_PROVIDER,
        llmModel:
          data.llmModel ??
          project.defaultAgentLlmModel ??
          ServerConfig.DEFAULT_LLM_MODEL,
        FK_llmConnectionId: llmConnectionId,
        taskNamingLlmProvider:
          data.taskNamingLlmProvider ??
          project.defaultTaskNamingLlmProvider ??
          ServerConfig.DEFAULT_LLM_PROVIDER,
        taskNamingLlmModel:
          data.taskNamingLlmModel ??
          project.defaultTaskNamingLlmModel ??
          ServerConfig.DEFAULT_LLM_MODEL,
        // taskNamingInstructions ?? project.taskNa
        taskNamingInstructions:
          project.defaultTaskNamingInstructions ?? data.taskNamingInstructions,
        FK_taskNamingLlmConnectionId:
          project.defaultTaskNamingLlmConnection?.id ??
          taskNamingLlmConnectionId,
        FK_projectId: projectId,
      },
      select: {
        id: true,
      },
    });

    if (
      connectionIds ||
      actionIds ||
      knowledgeIds ||
      variableIds ||
      workflowIds ||
      agentIds ||
      triggers
    ) {
      await this.update({
        agentId: newAgent.id,
        data: {
          connectionIds,
          variableIds,
          actionIds,
          knowledgeIds,
          workflowIds,
          agentIds,
          webAccess,
          phoneAccess,
          triggers,
        },
      });
    }

    return this.findOne({
      agentId: newAgent.id,
      expansion,
    });
  }

  async findOne({
    agentId,
    expansion,
    throwNotFoundException,
  }: {
    agentId: string;
    expansion: AgentExpansionDto;
    throwNotFoundException?: boolean;
  }) {
    if (!agentId) {
      //If there is no id, that means that another method is calling this method without an id.
      //Prisma will throw an error if we don't provide an id, so we throw a custom error here or return null.
      if (throwNotFoundException) {
        throw new NotFoundException('Agent not found');
      } else {
        return null;
      }
    }

    const agent = await this.prisma.agent.findUnique({
      where: {
        id: agentId,
      },
      select: {
        id: true,
        name: true,
        description: expansion?.description ?? false,
        profileImageUrl: expansion?.profileImageUrl ?? false,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        instructions: expansion?.instructions ?? false,
        temperature: expansion?.temperature ?? false,
        maxTokens: expansion?.maxTokens ?? false,
        topP: expansion?.topP ?? false,
        frequencyPenalty: expansion?.frequencyPenalty ?? false,
        presencePenalty: expansion?.presencePenalty ?? false,
        maxRetries: expansion?.maxRetries ?? false,
        seed: expansion?.seed ?? false,
        maxToolRoundtrips: expansion?.maxToolRoundtrips ?? false,
        messageLookbackLimit: expansion?.messageLookbackLimit ?? false,
        tools: expansion?.tools ?? false,
        toolIds: expansion?.toolIds ?? false,
        triggerIds: expansion?.triggerIds ?? false,
        llmModel: expansion?.llmModel ?? false,
        llmProvider: expansion?.llmProvider ?? false,
        llmConnection: expansion?.llmConnection
          ? {
              select: {
                id: true,
                connectionId: true,
                name: true,
              },
            }
          : false,
        taskNamingInstructions: expansion?.taskNamingInstructions ?? false,
        taskNamingLlmModel: expansion?.taskNamingLlmModel ?? false,
        taskNamingLlmProvider: expansion?.taskNamingLlmProvider ?? false,
        taskNamingLlmConnection: expansion?.taskNamingLlmConnection
          ? {
              select: {
                id: true,
                connectionId: true,
                name: true,
              },
            }
          : false,
        triggers: expansion?.triggers
          ? {
              select: {
                id: true,
                node: true,
                FK_workflowId: true,
                triggerId: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            }
          : false,
        agentActions: expansion?.actions
          ? {
              select: {
                id: true,
                actionId: true,
              },
            }
          : false,
        agentKnowledge: expansion?.knowledge
          ? {
              select: {
                id: true,
                knowledge: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        connections: expansion?.connections
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        agentVariables: expansion?.variables
          ? {
              select: {
                id: true,
                variable: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        agentWorkflows: expansion?.workflows
          ? {
              select: {
                id: true,
                workflow: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        agentSubAgents: expansion?.subAgents
          ? {
              select: {
                id: true,
                subagent: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                parentAgent: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        agentWebAccess: expansion?.webAccess
          ? {
              select: {
                service: true,
                webSearchEnabled: true,
                websiteAccessEnabled: true,
              },
            }
          : false,
        agentPhoneAccess: expansion?.phoneAccess
          ? {
              select: {
                service: true,
                outboundCallsEnabled: true,
                inboundCallsEnabled: true,
              },
            }
          : false,
        project: expansion?.project
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
      },
    });

    if (!agent && throwNotFoundException) {
      throw new NotFoundException('Agent not found');
    }

    return agent;
  }

  async update<T>({
    agentId,
    data,
    expansion,
  }: {
    agentId: string;
    data: UpdateAgentDto | T;
    expansion?: AgentExpansionDto;
  }) {
    const agentProject = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
      },
      select: {
        project: {
          select: {
            id: true,
            FK_workspaceId: true,
          },
        },
      },
    });

    if ((data as UpdateAgentDto).tools) {
      await this.#validateNodeData({
        nodes: (data as UpdateAgentDto).tools,
        projectId: agentProject.project.id,
        patching: false,
      });
    }

    const triggers = (data as UpdateAgentDto).triggers;
    if ((data as UpdateAgentDto).triggers) {
      await this.#validateNodeData({
        nodes:
          (data as UpdateAgentDto).triggers?.map?.(
            (trigger: { node: WorkflowNodeForRunner }) => trigger.node,
          ) ?? [],
        projectId: agentProject.project.id,
        patching: false,
      });

      delete (data as UpdateAgentDto).triggers;
    }

    const llmConnectionId = (data as UpdateAgentDto).llmConnectionId;
    if (llmConnectionId) {
      await this.#validateConnectionsBelongToProject({
        connectionIds: [llmConnectionId],
        projectId: agentProject.project.id,
      });

      delete (data as UpdateAgentDto).llmConnectionId;
    } else {
      delete (data as UpdateAgentDto).llmConnectionId;
    }

    const taskNamingLlmConnectionId = (data as UpdateAgentDto)
      .taskNamingLlmConnectionId;
    if (taskNamingLlmConnectionId) {
      await this.#validateConnectionsBelongToProject({
        connectionIds: [taskNamingLlmConnectionId],
        projectId: agentProject.project.id,
      });

      delete (data as UpdateAgentDto).taskNamingLlmConnectionId;
    } else {
      delete (data as UpdateAgentDto).taskNamingLlmConnectionId;
    }

    /**
     * Legacy code. We need to remove this in the future.
     */
    const connectionIds = (data as UpdateAgentDto).connectionIds;
    const actionIds = (data as UpdateAgentDto).actionIds;
    if (connectionIds || actionIds) {
      if (connectionIds) {
        await this.#validateConnectionsBelongToProject({
          connectionIds,
          projectId: agentProject.project.id,
        });

        delete (data as UpdateAgentDto).connectionIds;
      }

      if (actionIds) {
        // const validActionIds =
        //   await this.#validateActionIdsHaveConnectionsAndReturnValidActions({
        //     actionIds,
        //     agentId,
        //     newConnectionIds: connectionIds,
        //   });

        // actionIds = validActionIds;

        /**
         * Not validating, because some workflows don't require a connection.
         * We will need to pass in workflowApps service as a dependency to validate this to check the needsConnection property on the app.
         * Don't want to worry about this, so just not validating. The user will have to delete their actions manually they remove delete a connection.
         */

        delete (data as UpdateAgentDto).actionIds;
      }
    }

    /**
     * Legacy code. We need to remove this in the future.
     */
    const knowledgeIds = (data as UpdateAgentDto).knowledgeIds;
    if (knowledgeIds) {
      const agentProject = await this.prisma.agent.findFirst({
        where: {
          id: agentId,
        },
        select: {
          project: {
            select: {
              id: true,
            },
          },
        },
      });

      await this.#validateKnowledgeBelongToProject({
        knowledgeIds,
        projectId: agentProject.project.id,
      });

      delete (data as UpdateAgentDto).knowledgeIds;
    }

    /**
     * Legacy code. We need to remove this in the future.
     */
    const variableIds = (data as UpdateAgentDto).variableIds;
    if (variableIds) {
      const agentProject = await this.prisma.agent.findFirst({
        where: {
          id: agentId,
        },
        select: {
          project: {
            select: {
              id: true,
            },
          },
        },
      });

      await this.#validateVariablesBelongToProject({
        variableIds,
        projectId: agentProject.project.id,
      });

      delete (data as UpdateAgentDto).variableIds;
    }

    /**
     * Legacy code. We need to remove this in the future.
     */
    const workflowIds = (data as UpdateAgentDto).workflowIds;
    if (workflowIds) {
      const agentProject = await this.prisma.agent.findFirst({
        where: {
          id: agentId,
        },
        select: {
          project: {
            select: {
              id: true,
            },
          },
        },
      });

      await this.#validateWorkflowsBelongToProject({
        workflowIds,
        projectId: agentProject.project.id,
      });

      delete (data as UpdateAgentDto).workflowIds;
    }

    /**
     * Legacy code. We need to remove this in the future.
     */
    const agentIds = (data as UpdateAgentDto).agentIds;
    if (agentIds) {
      const agentProject = await this.prisma.agent.findFirst({
        where: {
          id: agentId,
        },
        select: {
          project: {
            select: {
              id: true,
            },
          },
        },
      });

      await this.#validateAgentsBelongToProject({
        agentIds,
        projectId: agentProject.project.id,
      });

      delete (data as UpdateAgentDto).agentIds;
    }

    /**
     * Legacy code. We need to remove this in the future.
     */
    const webAccess = (data as UpdateAgentDto).webAccess;
    if (webAccess != null) {
      delete (data as UpdateAgentDto).webAccess;
    }

    /**
     * Legacy code. We need to remove this in the future.
     */
    const phoneAccess = (data as UpdateAgentDto).phoneAccess;
    if (phoneAccess != null) {
      delete (data as UpdateAgentDto).phoneAccess;
    }

    const updatedAgent = await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        ...data,
        triggers: undefined, //We'll handle this below in another function.
        toolIds: (data as UpdateAgentDto).tools
          ? (data as UpdateAgentDto).tools.map((tool) => tool.actionId)
          : undefined,
        triggerIds: (data as UpdateAgentDto).triggers
          ? (data as UpdateAgentDto).triggers.map(
              (trigger) => trigger.node.triggerId,
            )
          : undefined,
        agentActions: actionIds
          ? {
              deleteMany: {},
              createMany: { data: actionIds.map((actionId) => ({ actionId })) },
            }
          : undefined,
        connections: connectionIds
          ? {
              set: connectionIds.map((id) => ({
                id,
              })),
            }
          : undefined,
        agentKnowledge: knowledgeIds
          ? {
              deleteMany: {},
              createMany: {
                data: knowledgeIds.map((id) => ({ FK_knowledgeId: id })),
              },
            }
          : undefined,
        agentVariables: variableIds
          ? {
              deleteMany: {},
              createMany: {
                data: variableIds.map((id) => ({ FK_variableId: id })),
              },
            }
          : undefined,
        agentWorkflows: workflowIds
          ? {
              deleteMany: {},
              createMany: {
                data: workflowIds.map((id) => ({ FK_workflowId: id })),
              },
            }
          : undefined,
        agentSubAgents: agentIds
          ? {
              deleteMany: {
                FK_agentId: agentId,
              },
              //This will be set directly below. It needs to be managed differently
            }
          : undefined,
        llmConnection:
          llmConnectionId === null
            ? {
                disconnect: true,
              }
            : llmConnectionId === undefined
              ? undefined
              : {
                  connect: {
                    id: llmConnectionId,
                  },
                },
        taskNamingLlmConnection:
          taskNamingLlmConnectionId === null
            ? {
                disconnect: true,
              }
            : taskNamingLlmConnectionId === undefined
              ? undefined
              : {
                  connect: {
                    id: taskNamingLlmConnectionId,
                  },
                },
        agentWebAccess:
          webAccess == null
            ? undefined
            : {
                upsert: {
                  create: {
                    webSearchEnabled: webAccess,
                    websiteAccessEnabled: webAccess,
                  },
                  update: {
                    webSearchEnabled: webAccess,
                    websiteAccessEnabled: webAccess,
                  },
                },
              },
        agentPhoneAccess:
          phoneAccess == null
            ? undefined
            : {
                upsert: {
                  create: {
                    outboundCallsEnabled: phoneAccess,
                    inboundCallsEnabled: false, //We don't support this yet
                  },
                  update: {
                    outboundCallsEnabled: phoneAccess,
                    inboundCallsEnabled: false, //We don't support this yet
                  },
                },
              },
      },
      select: {
        id: true,
      },
    });

    // Now, directly handle AgentSubAgent records
    if (agentIds) {
      await this.prisma.agentSubAgent.createMany({
        data: agentIds.map((subAgentId) => {
          return {
            FK_agentId: agentId, // This references the parent agent
            FK_subAgentId: subAgentId, // This references the sub-agent
          };
        }),
      });
    }

    if (triggers) {
      await this.#handleUpdatingAgentTrigger({
        agentId: agentId,
        triggers,
        projectId: agentProject.project.id,
        workspaceId: agentProject.project.FK_workspaceId,
      });
    }

    return this.findOne({
      agentId: updatedAgent.id,
      expansion,
    });
  }

  async findAllForWorkspace({
    jwtUser,
    workspaceId,
    expansion,
    includeType,
    filterBy,
  }: {
    jwtUser: JwtUser;
    workspaceId: string;
    includeType?: AgentIncludeTypeDto;
    expansion?: AgentExpansionDto;
    filterBy?: AgentFilterByDto;
  }) {
    if (!jwtUser?.roles?.includes('MAINTAINER')) {
      if (includeType?.all)
        throw new ForbiddenException(
          'You do not have permission to request all agents',
        );
    }

    const agents = await this.prisma.agent.findMany({
      where: {
        AND: [
          {
            project: {
              FK_workspaceId: workspaceId,
            },
          },
          filterBy?.projectId
            ? {
                FK_projectId: filterBy.projectId,
              }
            : {},
          includeType?.all
            ? {}
            : {
                project: {
                  workspaceUsers: {
                    some: {
                      id: jwtUser.workspaceUserId,
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
        profileImageUrl: expansion?.profileImageUrl ?? false,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        instructions: expansion?.instructions ?? false,
        temperature: expansion?.temperature ?? false,
        maxTokens: expansion?.maxTokens ?? false,
        topP: expansion?.topP ?? false,
        frequencyPenalty: expansion?.frequencyPenalty ?? false,
        presencePenalty: expansion?.presencePenalty ?? false,
        maxRetries: expansion?.maxRetries ?? false,
        seed: expansion?.seed ?? false,
        maxToolRoundtrips: expansion?.maxToolRoundtrips ?? false,
        messageLookbackLimit: expansion?.messageLookbackLimit ?? false,
        tools: expansion?.tools ?? false,
        triggers: expansion?.triggers ?? false,
        toolIds: expansion?.toolIds ?? false,
        triggerIds: expansion?.triggerIds ?? false,
        llmModel: expansion?.llmModel ?? false,
        llmProvider: expansion?.llmProvider ?? false,
        llmConnection: expansion?.llmConnection
          ? {
              select: {
                id: true,
                connectionId: true,
                name: true,
              },
            }
          : false,
        taskNamingInstructions: expansion?.taskNamingInstructions ?? false,
        taskNamingLlmModel: expansion?.taskNamingLlmModel ?? false,
        taskNamingLlmProvider: expansion?.taskNamingLlmProvider ?? false,
        taskNamingLlmConnection: expansion?.taskNamingLlmConnection
          ? {
              select: {
                id: true,
                connectionId: true,
                name: true,
              },
            }
          : false,
        agentActions: expansion?.actions
          ? {
              select: {
                id: true,
                actionId: true,
              },
            }
          : false,
        agentKnowledge: expansion?.knowledge
          ? {
              select: {
                id: true,
                knowledge: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        connections: expansion?.connections
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        agentVariables: expansion?.variables
          ? {
              select: {
                id: true,
                variable: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        agentWorkflows: expansion?.workflows
          ? {
              select: {
                id: true,
                workflow: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        agentSubAgents: expansion?.subAgents
          ? {
              select: {
                id: true,
                subagent: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        agentWebAccess: expansion?.webAccess
          ? {
              select: {
                service: true,
                webSearchEnabled: true,
                websiteAccessEnabled: true,
              },
            }
          : false,
        agentPhoneAccess: expansion?.phoneAccess
          ? {
              select: {
                service: true,
                outboundCallsEnabled: true,
                inboundCallsEnabled: true,
              },
            }
          : false,
        project: expansion?.project
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return agents;
  }

  async delete({ agentId }: { agentId: string }) {
    await this.prisma.agent.delete({
      where: {
        id: agentId,
      },
    });

    return true;
  }

  async checkWorkspaceUserHasAccessToAgent({
    workspaceUserId,
    agentId,
  }: {
    workspaceUserId: string;
    agentId: string;
  }) {
    const belongs = await this.prisma.agent.findFirst({
      where: {
        AND: [
          {
            id: agentId,
          },
          {
            project: {
              workspaceUsers: {
                some: {
                  id: workspaceUserId,
                },
              },
            },
          },
        ],
      },
    });

    return !!belongs;
  }

  async checkAgentBelongsToWorkspace({
    workspaceId,
    agentId,
  }: {
    workspaceId: string;
    agentId: string;
  }) {
    const belongs = await this.prisma.agent.findFirst({
      where: {
        AND: [
          {
            id: agentId,
          },
          {
            project: {
              FK_workspaceId: workspaceId,
            },
          },
        ],
      },
    });

    return !!belongs;
  }

  async checkProjectHasAccessToConnection({
    projectId,
    connectionId,
  }: {
    projectId: string;
    connectionId: string;
  }) {
    const belongs = await this.prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          {
            OR: [
              {
                connections: {
                  some: {
                    id: connectionId,
                  },
                },
              },
              {
                workspace: {
                  connections: {
                    some: {
                      AND: [
                        {
                          id: connectionId,
                        },
                        {
                          FK_projectId: null,
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return !!belongs;
  }

  async checkProjectHasAccessToKnowledge({
    projectId,
    knowledgeId,
  }: {
    projectId: string;
    knowledgeId: string;
  }) {
    const belongs = await this.prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          {
            OR: [
              {
                knowledge: {
                  some: {
                    id: knowledgeId,
                  },
                },
              },
              {
                workspace: {
                  knowledge: {
                    some: {
                      AND: [
                        {
                          id: knowledgeId,
                        },
                        {
                          FK_projectId: null,
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return !!belongs;
  }

  async checkProjectHasAccessToVariable({
    projectId,
    variableId,
  }: {
    projectId: string;
    variableId: string;
  }) {
    const belongs = await this.prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          {
            OR: [
              {
                variables: {
                  some: {
                    id: variableId,
                  },
                },
              },
              {
                workspace: {
                  variables: {
                    some: {
                      AND: [
                        {
                          id: variableId,
                        },
                        {
                          FK_projectId: null,
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return !!belongs;
  }

  async checkProjectHasAccessToWorkflow({
    projectId,
    workflowId,
  }: {
    projectId: string;
    workflowId: string;
  }) {
    const belongs = await this.prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          {
            workflows: {
              some: {
                id: workflowId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return !!belongs;
  }

  async checkProjectHasAccessToAgent({
    projectId,
    agentId,
  }: {
    projectId: string;
    agentId: string;
  }) {
    const belongs = await this.prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          {
            agents: {
              some: {
                id: agentId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    return !!belongs;
  }

  async #handleUpdatingAgentTrigger({
    agentId,
    triggers,
    projectId,
    workspaceId,
  }: {
    agentId: string;
    triggers: PartialOrSavedAgentTrigger[];
    projectId: string;
    workspaceId: string;
  }) {
    const existingAgentTriggers = await this.prisma.agent.findUnique({
      where: {
        id: agentId,
      },
      select: {
        triggers: {
          select: {
            id: true,
            node: true,
            FK_workflowId: true,
          },
        },
      },
    });

    const existingTriggers = existingAgentTriggers.triggers;

    //We'll add new internal workflows for these
    const newTriggers = triggers.filter((trigger) => !trigger.id);

    //We'll update the trigger node of these existing internal workflows
    const updatedTriggers = triggers.filter((trigger) => trigger.id);

    //We'll delete these internal workflows
    const triggersToBeDeleted = existingTriggers.filter(
      (trigger) => !triggers.some((newTrigger) => newTrigger.id === trigger.id),
    );

    // Parallel processing version
    await Promise.all([
      ...newTriggers.map((trigger) =>
        this.#buildInternalWorkflowForTrigger({
          trigger,
          agentId,
          projectId,
          workspaceId,
        }),
      ),
      ...triggersToBeDeleted.map((trigger) =>
        this.#deleteInternalWorkflowForTrigger({ trigger }),
      ),
      ...updatedTriggers.map((trigger) =>
        this.#updateInternalWorkflowForTrigger({
          trigger,
          agentId,
          projectId,
          workspaceId,
        }),
      ),
    ]);
  }

  #buildInternalWorkflowForTrigger = async ({
    trigger,
    agentId,
    projectId,
    workspaceId,
  }: {
    trigger: PartialOrSavedAgentTrigger;
    agentId: string;
    projectId: string;
    workspaceId: string;
  }) => {
    const messageAgentNode = this.#createMessageAgentNode({
      agentId,
      triggerNode: trigger.node,
    });

    const messageAgentEdge = this.#createMessageAgentEdge({
      triggerNodeId: trigger.node.id,
      messageAgentNodeId: messageAgentNode.id,
    });

    let agentTriggerId = trigger.id;
    if (!agentTriggerId) {
      const newAgentTrigger = await this.prisma.agentTrigger.create({
        data: {
          node: trigger.node,
          FK_agentId: agentId,
          triggerId: trigger.node.triggerId,
        },
        select: {
          id: true,
        },
      });

      agentTriggerId = newAgentTrigger.id;
    }

    const newWorkflow = await this.workflowsService.create({
      data: {
        name: 'DO NOT DELETE OR MODIFY - INTERNAL WORKFLOW',
        description: `Created by the platform to trigger your agent.`,
        isInternal: true,
        isActive: true,
        edges: [messageAgentEdge],
        nodes: [trigger.node, messageAgentNode],
        workflowOrientation: 'HORIZONTAL',
      },
      projectId: projectId,
      workspaceId: workspaceId,
    });

    await this.prisma.agentTrigger.update({
      where: {
        id: agentTriggerId,
      },
      data: {
        FK_workflowId: newWorkflow.id,
      },
    });
  };

  #deleteInternalWorkflowForTrigger = async ({
    trigger,
  }: {
    trigger: {
      id: string;
    };
  }) => {
    const deletedTrigger = await this.prisma.agentTrigger.delete({
      where: {
        id: trigger.id,
      },
      select: {
        FK_workflowId: true,
      },
    });

    if (deletedTrigger?.FK_workflowId) {
      await this.workflowsService.delete({
        workflowId: deletedTrigger.FK_workflowId,
      });
    }
  };

  #updateInternalWorkflowForTrigger = async ({
    trigger,
    agentId,
    projectId,
    workspaceId,
  }: {
    trigger: PartialOrSavedAgentTrigger & { id: string };
    agentId: string;
    projectId: string;
    workspaceId: string;
  }) => {
    // Get the existing trigger and its associated workflow
    const existingTrigger = await this.prisma.agentTrigger.findUnique({
      where: {
        id: trigger.id,
      },
      select: {
        FK_workflowId: true,
      },
    });

    if (!existingTrigger?.FK_workflowId) {
      // If no workflow exists, create a new one
      return this.#buildInternalWorkflowForTrigger({
        trigger,
        agentId,
        projectId,
        workspaceId,
      });
    }

    // Create the message agent node with updated trigger node
    const messageAgentNode = this.#createMessageAgentNode({
      agentId,
      triggerNode: trigger.node,
    });

    // Create the edge between trigger node and message agent node
    const messageAgentEdge = this.#createMessageAgentEdge({
      triggerNodeId: trigger.node.id,
      messageAgentNodeId: messageAgentNode.id,
    });

    // Update the existing workflow with new nodes and edges
    await this.workflowsService.update({
      workflowId: existingTrigger.FK_workflowId,
      data: {
        nodes: [trigger.node, messageAgentNode],
        edges: [messageAgentEdge],
      },
      workspaceId,
    });

    // Update the trigger in the database if necessary
    await this.prisma.agentTrigger.update({
      where: {
        id: trigger.id,
      },
      data: {
        node: trigger.node,
      },
    });
  };

  #createMessageAgentNode = ({
    agentId,
    triggerNode,
  }: {
    agentId: string;
    triggerNode: WorkflowNodeForRunner;
  }) => {
    return {
      id: v4(),
      appId: 'ai',
      nodeType: 'action',
      actionId: 'ai_action_message-agent',
      description: 'Message one of your agents.',
      name: 'Message Agent',
      position: {
        x: 120,
        y: 0,
      },
      value: {
        agentId: agentId,
        data: `={{ref:${triggerNode.id}}}`,
      },
      raw: {
        agentId: agentId,
        data: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'templateVariable',
                  attrs: {
                    variable: `ref:${triggerNode.id}`,
                    variableName: triggerNode.name,
                    refType: 'ref',
                    variableId: triggerNode.id,
                  },
                },
              ],
            },
          ],
        },
      },
    };
  };

  #createMessageAgentEdge = ({
    triggerNodeId,
    messageAgentNodeId,
  }: {
    triggerNodeId: string;
    messageAgentNodeId: string;
  }) => {
    return {
      id: `${triggerNodeId}=>${messageAgentNodeId}`,
      source: triggerNodeId,
      target: messageAgentNodeId,
      type: 'workflow',
      animated: true,
    };
  };

  #getProjectSettingsByProjectId = async ({
    projectId,
  }: {
    projectId: string;
  }) => {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        defaultAgentLlmModel: true,
        defaultAgentLlmProvider: true,
        defaultTaskNamingLlmConnection: {
          select: {
            id: true,
          },
        },
        defaultTaskNamingLlmModel: true,
        defaultTaskNamingLlmProvider: true,
        defaultTaskNamingInstructions: true,
      },
    });

    return project;
  };

  async #validateConnectionsBelongToProject({
    projectId,
    connectionIds,
  }: {
    projectId: string;
    connectionIds: string[];
  }) {
    await Promise.all(
      connectionIds.map(async (id) => {
        const hasAccess = await this.checkProjectHasAccessToConnection({
          projectId,
          connectionId: id,
        });

        if (!hasAccess) {
          throw new ForbiddenException(
            `Project does not have access to connection ${id}`,
          );
        }
      }),
    );
  }

  async #validateKnowledgeBelongToProject({
    projectId,
    knowledgeIds,
  }: {
    projectId: string;
    knowledgeIds: string[];
  }) {
    await Promise.all(
      knowledgeIds.map(async (id) => {
        const hasAccess = await this.checkProjectHasAccessToKnowledge({
          projectId,
          knowledgeId: id,
        });

        if (!hasAccess) {
          throw new ForbiddenException(
            `Project does not have access to knowledge ${id}`,
          );
        }
      }),
    );
  }

  async #validateVariablesBelongToProject({
    projectId,
    variableIds,
  }: {
    projectId: string;
    variableIds: string[];
  }) {
    await Promise.all(
      variableIds.map(async (id) => {
        const hasAccess = await this.checkProjectHasAccessToVariable({
          projectId,
          variableId: id,
        });

        if (!hasAccess) {
          throw new ForbiddenException(
            `Project does not have access to variable ${id}`,
          );
        }
      }),
    );
  }

  async #validateWorkflowsBelongToProject({
    projectId,
    workflowIds,
  }: {
    projectId: string;
    workflowIds: string[];
  }) {
    await Promise.all(
      workflowIds.map(async (id) => {
        const hasAccess = await this.checkProjectHasAccessToWorkflow({
          projectId,
          workflowId: id,
        });

        if (!hasAccess) {
          throw new ForbiddenException(
            `Project does not have access to workflow ${id}`,
          );
        }
      }),
    );
  }

  async #validateAgentsBelongToProject({
    projectId,
    agentIds,
  }: {
    projectId: string;
    agentIds: string[];
  }) {
    await Promise.all(
      agentIds.map(async (id) => {
        const hasAccess = await this.checkProjectHasAccessToAgent({
          projectId,
          agentId: id,
        });

        if (!hasAccess) {
          throw new ForbiddenException(
            `Project does not have access to agent ${id}`,
          );
        }
      }),
    );
  }

  async #validateNodeData({
    nodes,
    projectId,
    patching,
  }: {
    nodes: any;
    projectId: string;
    patching: boolean;
  }) {
    if ((!nodes && !patching) || !nodes.length) {
      return;
    }

    if ((patching && nodes) || !patching) {
      if (!Array.isArray(nodes)) {
        throw new BadRequestException('Nodes must be an array');
      }
    }

    return await Promise.all(
      nodes.map(async (node: any) => {
        if (node.nodeType === 'placeholder') {
          return;
        }

        //VALIDATE REQUIRED FIELDS
        if (!node.id && !patching) {
          throw new BadRequestException('Node ID is required');
        }

        if (!node.appId && !patching) {
          throw new BadRequestException('App ID is required');
        }

        if (!node.name && !patching) {
          throw new BadRequestException('Name is required');
        }

        if (!node.position && !patching) {
          throw new BadRequestException('Position is required');
        }

        //VALIDATE NODE TYPE
        if (node.nodeType === 'action') {
          if (!node.actionId) {
            throw new BadRequestException(
              'Action ID is required on action node',
            );
          }
        } else if (node.nodeType === 'trigger') {
          if (!node.triggerId) {
            throw new BadRequestException(
              'Trigger ID is required on trigger node',
            );
          }
        } else {
          throw new BadRequestException(`Invalid node type: ${node.nodeType}`);
        }

        const value = node.value;

        //VALIDATE CONNECTION OWNERSHIP
        const connectionId = value?.connectionId;

        if (connectionId) {
          if (
            !(await this.checkProjectHasAccessToConnection({
              projectId,
              connectionId,
            }))
          ) {
            throw new BadRequestException(
              'Project does not have access to the connection',
            );
          }
        }

        //VALIDATE VARIABLE OWNERSHIP
        await this.checkProjectHasAccessToAllVariablesInObject({
          projectId,
          values: node.value ?? {},
        });

        //TODO, should we validate all node.value.agentId's and node.value.knowledgeId's?
        //that way we can always confidently trust the knowledgeIds, and agentIds on the workflow object?
        //For now we always validate those at run time
      }),
    );
  }

  async getPresignedPostUrlForProfileImage({
    fileName,
    agentId,
    workspaceId,
  }: {
    fileName: string;
    agentId: string;
    workspaceId: string;
  }) {
    let fileNameExtension = fileName.split('.').pop();
    if (!fileNameExtension || fileNameExtension.length === 0) {
      fileNameExtension = undefined;
    } else {
      fileNameExtension = fileNameExtension.toLocaleLowerCase();
    }

    return this.s3Manager.getPresignedPostUrl({
      filePath: `workspaces/${workspaceId}/agents/${agentId}/profile-image/profile-image${fileNameExtension ? `.${fileNameExtension}` : ''}`,
      fileName: fileName,
      options: {
        ExpirationMinutes: 5,
        publicRead: true,
      },
    });
  }

  async checkProjectHasAccessToAllVariablesInObject({
    values,
    projectId,
  }: {
    values: Record<string, any>;
    projectId: string;
  }) {
    const keys = Object.keys(values);

    for (const key of keys) {
      if (typeof values[key] === 'string') {
        //A variable will be in the format of ={{var:variableId}}
        //We'll want to extract the id, and then swap out the entire ={{var:variableId}} with the value of the variable
        //there may be more than one variable in the string, so we'll need to loop through and swap them all out
        const value = JSON.stringify(values[key]);
        const variables = value.match(/={{var:([\w-]+)}}/g);

        if (!variables) {
          continue;
        }

        for (const variable of variables) {
          const variableId = variable.split(':')[1].replace('}}', '');
          const hasAccess = await this.checkProjectHasAccessToVariable({
            variableId,
            projectId: projectId,
          });

          if (!hasAccess) {
            throw new ForbiddenException(
              'Project does not have access to variable',
            );
          }
        }
      }
    }
  }
}

export type PartialOrSavedAgentTrigger = Partial<AgentTrigger> & {
  id: string | undefined;
  node: WorkflowNodeForRunner;
};
