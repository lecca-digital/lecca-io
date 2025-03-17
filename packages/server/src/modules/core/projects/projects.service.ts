import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { JwtUser } from '../../../types/jwt-user.type';
import { CreditsService } from '../../global/credits/credits.service';
import { PineconeService } from '../../global/pinecone/pinecone.service';
import { PrismaService } from '../../global/prisma/prisma.service';
import { S3ManagerService } from '../../global/s3/s3.service';

import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectExpansionDto } from './dto/project-expansion.dto';
import { ProjectIncludeTypeDto } from './dto/project-include-type.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private pineconeService: PineconeService,
    private s3Manager: S3ManagerService,
    private credits: CreditsService,
  ) {}

  async create({
    data,
    createdByWorkspaceUserId,
    workspaceId,
    expansion,
  }: {
    data: CreateProjectDto;
    workspaceId: string;
    createdByWorkspaceUserId: string;
    expansion: ProjectExpansionDto;
  }) {
    //Check project limit for workspace plan
    await this.#checkProjectLimitForWorkspacePlan({ workspaceId });

    const newProject = await this.prisma.project.create({
      data: {
        ...data,
        FK_createdByWorkspaceUserId: createdByWorkspaceUserId,
        FK_workspaceId: workspaceId,
        workspaceUsers: {
          connect: {
            id: createdByWorkspaceUserId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return this.findOne({
      projectId: newProject.id,
      expansion,
    });
  }

  async findOne({
    projectId,
    expansion,
    throwNotFoundException,
  }: {
    projectId: string;
    expansion: ProjectExpansionDto;
    throwNotFoundException?: boolean;
  }) {
    if (!projectId) {
      //If there is no id, that means that another method is calling this method without an id.
      //Prisma will throw an error if we don't provide an id, so we throw a custom error here or return null.
      if (throwNotFoundException) {
        throw new NotFoundException('Project not found');
      } else {
        return null;
      }
    }

    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        name: true,
        description: expansion?.description ?? false,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        defaultAgentLlmProvider: expansion?.defaultAgentLlmProvider ?? false,
        defaultAgentLlmModel: expansion?.defaultAgentLlmModel ?? false,
        defaultAgentLlmConnection: expansion?.defaultAgentLlmConnection
          ? {
              select: {
                id: true,
                connectionId: true,
                name: true,
              },
            }
          : false,
        defaultTaskNamingInstructions:
          expansion?.defaultTaskNamingInstructions ?? false,
        defaultTaskNamingLlmProvider:
          expansion?.defaultTaskNamingLlmProvider ?? false,
        defaultTaskNamingLlmModel:
          expansion?.defaultTaskNamingLlmModel ?? false,
        defaultTaskNamingLlmConnection:
          expansion?.defaultTaskNamingLlmConnection
            ? {
                select: {
                  id: true,
                  connectionId: true,
                  name: true,
                },
              }
            : false,
        _count: expansion?.countAgents
          ? {
              select: {
                agents: !!expansion?.countAgents,
                connections: !!expansion?.countConnections,
                knowledge: !!expansion?.countKnowledge,
                variables: !!expansion?.countVariables,
                workflows: !!expansion?.countWorkflows,
              },
            }
          : false,
        createdByWorkspaceUser: expansion?.createdByWorkspaceUser
          ? {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        workflows: expansion?.workflows
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        workspaceUsers: expansion?.workspaceUsers
          ? {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            }
          : false,
      },
    });

    if (!project && throwNotFoundException) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update<T>({
    projectId,
    data,
    expansion,
  }: {
    projectId: string;
    data: UpdateProjectDto | T;
    includeType?: ProjectIncludeTypeDto;
    expansion?: ProjectExpansionDto;
  }) {
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data,
      select: {
        id: true,
      },
    });

    return this.findOne({
      projectId: project.id,
      expansion,
    });
  }

  async findAllForWorkspace({
    jwtUser,
    workspaceId,
    expansion,
    includeType,
  }: {
    jwtUser: JwtUser;
    workspaceId: string;
    includeType?: ProjectIncludeTypeDto;
    expansion?: ProjectExpansionDto;
  }) {
    if (!jwtUser?.roles?.includes('MAINTAINER')) {
      if (includeType?.all)
        throw new ForbiddenException(
          'You do not have permission to request all projects',
        );
    }

    return this.prisma.project.findMany({
      where: {
        AND: [
          { FK_workspaceId: workspaceId },
          includeType?.all
            ? {}
            : {
                workspaceUsers: {
                  some: {
                    id: jwtUser.workspaceUserId,
                  },
                },
              },
        ],
      },
      select: {
        id: true,
        name: true,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        description: expansion?.description ?? false,
        defaultAgentLlmProvider: expansion?.defaultAgentLlmProvider ?? false,
        defaultAgentLlmModel: expansion?.defaultAgentLlmModel ?? false,
        defaultAgentLlmConnection: expansion?.defaultAgentLlmConnection
          ? {
              select: {
                id: true,
                connectionId: true,
                name: true,
              },
            }
          : false,
        defaultTaskNamingInstructions:
          expansion?.defaultTaskNamingInstructions ?? false,
        defaultTaskNamingLlmProvider:
          expansion?.defaultTaskNamingLlmProvider ?? false,
        defaultTaskNamingLlmModel:
          expansion?.defaultTaskNamingLlmModel ?? false,
        defaultTaskNamingLlmConnection:
          expansion?.defaultTaskNamingLlmConnection
            ? {
                select: {
                  id: true,
                  connectionId: true,
                  name: true,
                },
              }
            : false,
        _count: expansion?.countAgents
          ? {
              select: {
                agents: !!expansion?.countAgents,
                connections: !!expansion?.countConnections,
                knowledge: !!expansion?.countKnowledge,
                variables: !!expansion?.countVariables,
                workflows: !!expansion?.countWorkflows,
              },
            }
          : false,
        createdByWorkspaceUser: expansion?.createdByWorkspaceUser
          ? {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            }
          : false,
        workflows: expansion?.workflows
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        workspaceUsers: expansion?.workspaceUsers
          ? {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            }
          : false,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async delete({ projectId }: { projectId: string }) {
    const projectToDelete = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        FK_workspaceId: true,
      },
    });

    await this.#deleteKnowledgeFromProject({ projectId });
    await this.#deleteS3BucketForProject({
      workspaceId: projectToDelete.FK_workspaceId,
      projectId,
    });

    await this.prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    return true;
  }

  #deleteKnowledgeFromProject = async ({
    projectId,
  }: {
    projectId: string;
  }) => {
    const knowledgeFromProjectsToDelete = await this.prisma.knowledge.findMany({
      where: {
        FK_projectId: projectId,
      },
      select: {
        id: true,
        indexName: true,
        FK_workspaceId: true,
        vectorRefs: {
          select: {
            id: true,
          },
        },
      },
    });

    await Promise.all(
      knowledgeFromProjectsToDelete.map((knowledge) =>
        this.#deleteS3BucketForKnowledge({
          knowledgeId: knowledge.id,
          workspaceId: knowledge.FK_workspaceId,
        }),
      ),
    );

    if (knowledgeFromProjectsToDelete.length) {
      const vectorIdsToDelete = knowledgeFromProjectsToDelete.flatMap(
        (knowledge) => knowledge.vectorRefs.map((vectorRef) => vectorRef.id),
      );

      if (vectorIdsToDelete.length) {
        await this.pineconeService.deleteMany({
          workspaceId: knowledgeFromProjectsToDelete[0].FK_workspaceId,
          indexName: knowledgeFromProjectsToDelete[0].indexName,
          idsToDelete: vectorIdsToDelete,
        });
      }
    }
  };

  #deleteS3BucketForProject = async ({
    workspaceId,
    projectId,
  }: {
    workspaceId: string;
    projectId: string;
  }) => {
    await this.s3Manager.deletePath(
      `workspaces/${workspaceId}/projects/${projectId}`,
    );
  };

  #deleteS3BucketForKnowledge = async ({
    workspaceId,
    knowledgeId,
  }: {
    workspaceId: string;
    knowledgeId: string;
  }) => {
    await this.s3Manager.deletePath(
      `workspaces/${workspaceId}/knowledge/${knowledgeId}`,
    );
  };

  async leaveProject({
    workspaceUserId,
    projectId,
  }: {
    workspaceUserId: string;
    projectId: string;
  }) {
    await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        workspaceUsers: {
          disconnect: {
            id: workspaceUserId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return true;
  }

  async checkWorkspaceUserHasAccessToProject({
    workspaceUserId,
    projectId,
  }: {
    workspaceUserId: string;
    projectId: string;
  }) {
    const belongs = await this.prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          {
            workspaceUsers: {
              some: {
                id: workspaceUserId,
              },
            },
          },
        ],
      },
    });

    return !!belongs;
  }

  async checkProjectBelongsToWorkspace({
    workspaceId,
    projectId,
  }: {
    workspaceId: string;
    projectId: string;
  }) {
    const belongs = await this.prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          {
            FK_workspaceId: workspaceId,
          },
        ],
      },
    });

    return !!belongs;
  }

  async checkProjectBelongsToWorkspaceUser({
    workspaceUserId,
    projectId,
  }: {
    workspaceUserId: string;
    projectId: string;
  }) {
    const belongs = await this.prisma.project.findFirst({
      where: {
        AND: [
          {
            id: projectId,
          },
          {
            FK_createdByWorkspaceUserId: workspaceUserId,
          },
        ],
      },
    });

    return !!belongs;
  }

  #checkProjectLimitForWorkspacePlan = async ({
    workspaceId,
  }: {
    workspaceId: string;
  }) => {
    /**
     * free (Starter): 1 project
     * professional: No limit
     * team: No limit
     * business: No limit
     */
    if (!this.credits.isBillingEnabled()) {
      return;
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        _count: {
          select: {
            projects: true,
          },
        },
        billing: {
          select: {
            planType: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found to check project limit');
    }

    const numProjects: number = (workspace as any)._count.projects;

    //TODO: If someone downgrades plan, do we delete projects? Do we tell them they need to delete projects to downgrade?
    if (
      (!workspace.billing || workspace.billing.planType === 'free') &&
      numProjects >= 1
    ) {
      throw new ForbiddenException(
        'You have reached the project limit for your plan. Please upgrade your plan to add more projects.',
      );
    }
  };
}
