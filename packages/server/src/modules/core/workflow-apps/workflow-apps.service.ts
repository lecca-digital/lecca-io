import apps from '@lecca-io/apps';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

import { Action } from '../../../apps/lib/action';
import { App } from '../../../apps/lib/app';
import {
  OAuth2CallbackState,
  OAuth2Connection,
} from '../../../apps/lib/connection';
import { Trigger } from '../../../apps/lib/trigger';
import { AiProviderService } from '../../global/ai-provider/ai-provider.service';
import { CreditsService } from '../../global/credits/credits.service';
import { FileHandlerService } from '../../global/file/file-handler.service';
import { HttpService } from '../../global/http/http.service';
import { NotificationsService } from '../../global/notifications/notifications.service';
import { PrismaService } from '../../global/prisma/prisma.service';
import { S3ManagerService } from '../../global/s3/s3.service';
import { ConnectionsService } from '../connections/connections.service';
import { ExecutionsService } from '../executions/executions.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowNodeForRunner } from '../workflow-runner/workflow-runner.service';

import { RunNodeDto } from './dto/run-node.dto';

@Injectable()
export class WorkflowAppsService {
  constructor(
    private prisma: PrismaService,
    private connection: ConnectionsService,
    private execution: ExecutionsService,
    private notification: NotificationsService,
    private s3: S3ManagerService,
    private knowledge: KnowledgeService,
    private task: TasksService,
    private fileHandler: FileHandlerService,
    private readonly http: HttpService,
    private jwt: JwtService,
    private eventEmitter: EventEmitter2,
    private credits: CreditsService,
    private aiProviders: AiProviderService,
  ) {
    this.apps = {} as Record<string, App>;
    Object.entries(apps).forEach(([key, value]) => {
      (this.apps as any)[key] = new App({
        id: value.id,
        name: value.name,
        description: value.description,
        logoUrl: value.logoUrl,
        _actions: value.actions,
        _triggers: value.triggers,
        _connections: value.connections,
        isPublished: value.isPublished,
        availableForAgent: value.availableForAgent,
        parseWebhookEventType: value.parseWebhookEventType,
        verifyWebhookRequest: value.verifyWebhookRequest,
        prisma: this.prisma,
        connection: this.connection,
        execution: this.execution,
        knowledge: this.knowledge,
        notification: this.notification,
        fileHandler: this.fileHandler,
        s3: this.s3,
        task: this.task,
        jwt: this.jwt,
        http: this.http,
        eventEmitter: this.eventEmitter,
        credits: this.credits,
        aiProviders: this.aiProviders,
      });
    });
  }

  apps: Record<string, App>;

  findAll() {
    return Object.values(this.apps);
  }

  async retrieveActionDynamicValues({
    appId,
    actionId,
    fieldId,
    connectionId,
    workspaceUserId,
    workspaceId,
    workflowId,
    agentId,
    projectId,
    extraOptions,
  }: {
    appId: string;
    actionId: string;
    fieldId: string;
    connectionId: string;
    workspaceId: string;
    workspaceUserId: string;
    workflowId: string | undefined;
    agentId: string | undefined;
    projectId: string;
    extraOptions: Record<string, any> | undefined;
  }) {
    const app = this.apps[appId];

    if (!app) {
      throw new NotFoundException(`App (${appId}) not found`);
    }

    const action = app.actionMap[actionId];

    if (!action) {
      throw new NotFoundException(`Action (${actionId}) not found`);
    }

    const hasAccessToProject = await this.workspaceUserHasAccessToProject({
      workspaceUserId: workspaceUserId,
      projectId,
    });

    if (!hasAccessToProject) {
      throw new NotFoundException(
        `User does not have access to project (${projectId})`,
      );
    }

    if (action.needsConnection) {
      const hasAccessToConnection = await this.projectHasAccessToConnection({
        connectionId: connectionId,
        projectId,
      });

      if (!hasAccessToConnection) {
        throw new NotFoundException(
          `Project does not have access to connection (${connectionId})`,
        );
      }
    }

    return await action.retrieveDynamicValues({
      fieldId,
      connectionId,
      extraOptions,
      projectId,
      workspaceId,
      agentId,
      workflowId,
    });
  }

  async retrieveTriggerDynamicValues({
    appId,
    triggerId,
    fieldId,
    connectionId,
    workspaceId,
    workspaceUserId,
    workflowId,
    agentId,
    projectId,
    extraOptions,
  }: {
    appId: string;
    triggerId: string;
    fieldId: string;
    connectionId: string;
    workspaceId: string;
    workspaceUserId: string;
    workflowId: string | undefined;
    agentId: string | undefined;
    projectId: string;
    extraOptions: Record<string, any> | undefined;
  }) {
    const app = this.apps[appId];

    if (!app) {
      throw new NotFoundException(`App (${appId}) not found`);
    }

    const trigger = app.triggerMap[triggerId];

    if (!trigger) {
      throw new NotFoundException(`Trigger (${triggerId}) not found`);
    }

    const hasAccessToProject = await this.workspaceUserHasAccessToProject({
      workspaceUserId: workspaceUserId,
      projectId,
    });

    if (!hasAccessToProject) {
      throw new NotFoundException(
        `User does not have access to project (${projectId})`,
      );
    }

    if (trigger.needsConnection) {
      const hasAccessToConnection = await this.projectHasAccessToConnection({
        connectionId: connectionId,
        projectId,
      });

      if (!hasAccessToConnection) {
        throw new NotFoundException(
          `Project does not have access to connection (${connectionId})`,
        );
      }
    }

    return await trigger.retrieveDynamicValues({
      fieldId,
      connectionId,
      workspaceId,
      workflowId,
      agentId,
      extraOptions,
      projectId,
    });
  }

  async testNode({
    workspaceUserId,
    workspaceId,
    data,
  }: {
    workspaceUserId: string;
    workspaceId: string;
    data: RunNodeDto;
  }) {
    const { nodeId, workflowId, shouldMock, skipValidatingConditions } = data;

    const hasAccessToWorkflow = await this.workspaceUserHasAccessToWorkflow({
      workspaceUserId,
      workflowId,
    });

    if (!hasAccessToWorkflow) {
      throw new NotFoundException(
        `User does not have access to workflow (${workflowId})`,
      );
    }

    const workflowWithNodes = await this.prisma.workflow.findUnique({
      where: {
        id: workflowId,
      },
      select: {
        id: true,
        nodes: true,
        FK_projectId: true,
      },
    });

    let nodeToRun: Prisma.JsonObject | undefined;
    if (Array.isArray(workflowWithNodes.nodes)) {
      nodeToRun = workflowWithNodes.nodes.find(
        (n: Prisma.JsonObject) => n.id === nodeId,
      ) as Prisma.JsonObject;
    }

    if (!nodeToRun) {
      throw new NotFoundException(`Node (${nodeId}) not found`);
    }

    const appId = nodeToRun.appId as string;
    const actionId = nodeToRun.actionId as string | undefined;
    const triggerId = nodeToRun.triggerId as string | undefined;
    const value = nodeToRun.value as Record<string, any>;
    const app = this.apps[appId];

    if (!app) {
      throw new NotFoundException(`App (${appId}) not found`);
    }

    if (!actionId && !triggerId) {
      throw new BadRequestException('Node is missing an action or trigger');
    }

    if (!value) {
      throw new BadRequestException('Node is missing a value');
    }

    if (actionId) {
      const action = app.actionMap[actionId];

      if (!action) {
        throw new NotFoundException(`Action (${actionId}) not found`);
      }

      return await action.prepareAndRunAction({
        configValue: value,
        workflowId,
        nodeId,
        shouldMock,
        workspaceId,
        projectId: workflowWithNodes.FK_projectId,
        testing: true,
        agentId: undefined,
        executionId: undefined,
        taskId: undefined,
      });
    } else if (triggerId) {
      const trigger = app.triggerMap[triggerId];

      if (!trigger) {
        throw new NotFoundException(`Action (${actionId}) not found`);
      }

      //Trigger successful runs return an array of outputs because they're usually polling for many items.
      //So we will only return the first output when testing a node.
      const triggerResponse = await trigger.prepareAndRunTrigger({
        inputData: null,
        configValue: value,
        workflowId,
        workspaceId,
        nodeId,
        shouldMock,
        agentId: null, //agents cant test nodes
        executionId: null, //no execution when testing
        projectId: workflowWithNodes.FK_projectId,
        skipValidatingConditions,
        testing: true,
      });

      return {
        success: triggerResponse.success?.[0],
        conditionsMet: triggerResponse.conditionsMet,
        failure: triggerResponse.failure,
      };
    } else {
      throw new BadRequestException('Node is missing an action or trigger');
    }
  }

  async connectApp({
    appId,
    connectionId,
    workspaceId,
    value,
    res,
    req,
  }: {
    appId: string;
    connectionId: string;
    workspaceId: string;
    value: Record<string, any>;
    res: Response;
    req: Request;
  }) {
    const app = this.apps[appId];

    if (!app) {
      throw new NotFoundException(`App (${appId}) not found`);
    }

    const connection = app.connectionMap[connectionId];

    if (!connection) {
      throw new NotFoundException(`Connection (${connectionId}) not found`);
    }

    return await connection.connectApp({
      workspaceId: workspaceId,
      configValue: value,
      res,
      req,
    });
  }

  async handleOAuth2Callback({ res, req }: { res: Response; req: Request }) {
    let stateToken: string | undefined;
    try {
      stateToken = JSON.parse(decodeURIComponent(req.query.state as string));
    } catch {
      //Sometimes it doesn't need to be parsed because the oauth app does it for us
      stateToken = decodeURIComponent(req.query.state as string);
    }

    const state = this.jwt.decode<OAuth2CallbackState>(stateToken);

    const appId = state.appId;
    const connectionId = state.connectionId;

    const app = this.apps[appId];

    if (!app) {
      throw new NotFoundException(`App (${appId}) not found`);
    }

    const connection = app.connectionMap[connectionId];

    if (!connection) {
      throw new NotFoundException(`Connection (${connectionId}) not found`);
    } else if (connection.connectionType !== 'oauth2') {
      throw new BadRequestException(
        `Connection (${connectionId}) is not an OAuth2 connection`,
      );
    }

    return (connection as OAuth2Connection).handleCallback({
      res,
      req,
    });
  }

  async workspaceUserHasAccessToWorkflow({
    workspaceUserId,
    workflowId,
  }: {
    workspaceUserId: string;
    workflowId: string;
  }) {
    const isMemberOfWorkflowProject = await this.prisma.workspaceUser.findFirst(
      {
        where: {
          AND: [
            {
              id: workspaceUserId,
            },
            {
              projects: {
                some: {
                  workflows: {
                    some: {
                      id: workflowId,
                    },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
        },
      },
    );

    if (isMemberOfWorkflowProject) {
      return true;
    }

    const isAdminOfWorkspaceForWorkflowProject =
      await this.prisma.workspaceUser.findFirst({
        where: {
          AND: [
            {
              id: workspaceUserId,
            },
            {
              roles: {
                has: 'MAINTAINER',
              },
            },
            {
              workspace: {
                projects: {
                  some: {
                    workflows: {
                      some: {
                        id: workflowId,
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

    if (isAdminOfWorkspaceForWorkflowProject) {
      return true;
    }

    return false;
  }

  async workspaceUserHasAccessToProject({
    workspaceUserId,
    projectId,
  }: {
    workspaceUserId: string;
    projectId: string;
  }) {
    const isMemberOfProject = await this.prisma.workspaceUser.findFirst({
      where: {
        AND: [
          {
            id: workspaceUserId,
          },
          {
            projects: {
              some: {
                id: projectId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (isMemberOfProject) {
      return true;
    }

    const isAdminOfWorkspaceForProject =
      await this.prisma.workspaceUser.findFirst({
        where: {
          AND: [
            {
              id: workspaceUserId,
            },
            {
              roles: {
                has: 'MAINTAINER',
              },
            },
            {
              workspace: {
                projects: {
                  some: {
                    id: projectId,
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

    if (isAdminOfWorkspaceForProject) {
      return true;
    }

    return false;
  }

  async projectHasAccessToConnection({
    connectionId,
    projectId,
  }: {
    connectionId: string;
    projectId: string;
  }) {
    const hasAccess = await this.prisma.connection.findFirst({
      where: {
        AND: [
          {
            id: connectionId,
          },
          {
            OR: [
              // Check if the connection is in the project
              {
                project: {
                  id: projectId,
                },
              },
              {
                // Check if the connection is in the workspace and the project is null
                AND: [
                  {
                    workspace: {
                      projects: {
                        some: {
                          id: projectId,
                        },
                      },
                    },
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
      select: { id: true },
    });

    return !!hasAccess;
  }

  async projectHasAccessToVariable({
    variableId,
    projectId,
  }: {
    variableId: string;
    projectId: string;
  }) {
    const hasAccess = await this.prisma.variable.findFirst({
      where: {
        AND: [
          {
            id: variableId,
          },
          {
            OR: [
              // Check if the connection is in the project
              {
                project: {
                  id: projectId,
                },
              },
              {
                // Check if the connection is in the workspace and the project is null
                AND: [
                  {
                    workspace: {
                      projects: {
                        some: {
                          id: projectId,
                        },
                      },
                    },
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
      select: { id: true },
    });

    return !!hasAccess;
  }

  async validateProjectHasAccessToAllVariablesInObject({
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
          return value;
        }

        for (const variable of variables) {
          const variableId = variable.split(':')[1].replace('}}', '');
          const hasAccess = await this.projectHasAccessToVariable({
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

  getTriggerFromNode({
    node,
  }: {
    node: WorkflowNodeForRunner;
  }): Trigger | undefined {
    const workflowApp = this.apps[node.appId];

    if (!workflowApp) {
      throw new NotFoundException(`App (${node.appId}) not found`);
    }

    return workflowApp.triggerMap[node.triggerId];
  }

  getActionFromNode({
    node,
  }: {
    node: WorkflowNodeForRunner;
  }): Action | undefined {
    const workflowApp = this.apps[node.appId];

    if (!workflowApp) {
      throw new NotFoundException(`App (${node.appId}) not found`);
    }

    return workflowApp.actionMap[node.actionId];
  }
}
