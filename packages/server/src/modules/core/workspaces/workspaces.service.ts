import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceUserRole } from '@prisma/client';
import { v4 } from 'uuid';

import { ServerConfig } from '../../../config/server.config';
import { CreditsService } from '../../global/credits/credits.service';
import { PineconeService } from '../../global/pinecone/pinecone.service';
import { PrismaService } from '../../global/prisma/prisma.service';
import { S3ManagerService } from '../../global/s3/s3.service';
import { UsersService } from '../users/users.service';
import { WorkspaceUsersService } from '../workspace-users/workspace-users.service';

import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceExpansionDto } from './dto/workspace-expansion.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private prisma: PrismaService,
    private workspaceUsers: WorkspaceUsersService,
    private users: UsersService,
    private s3Manager: S3ManagerService,
    private pineconeService: PineconeService,
    private credits: CreditsService,
  ) {}

  async create({
    data,
    createdByUserId,
    defaultCreatedWorkspace,
    expansion,
  }: {
    data: CreateWorkspaceDto;
    createdByUserId: string;
    defaultCreatedWorkspace?: boolean;
    expansion?: WorkspaceExpansionDto;
  }) {
    //Create workspace
    const newWorkspace = await this.prisma.workspace.create({
      data: {
        ...data,
        preferences: {
          create: {
            defaultAgentLlmProvider: ServerConfig.DEFAULT_LLM_PROVIDER,
            defaultAgentLlmModel: ServerConfig.DEFAULT_LLM_MODEL,
            defaultTaskNamingLlmProvider: ServerConfig.DEFAULT_LLM_PROVIDER,
            defaultTaskNamingLlmModel: ServerConfig.DEFAULT_LLM_MODEL,
          },
        },
        usage: {
          create: {
            //Not allotting credits unless this is the default created workspace.
            //Or else someone could created unlimited workspaces.
            allottedCredits: defaultCreatedWorkspace
              ? this.credits.getMonthlyProatedCreditAllotment({ plan: 'free' })
              : 0,
            refreshedAt: new Date().toISOString(),
          },
        },
      },
      select: {
        id: true,
      },
    });

    //Get user for the rootProfileImageUrl -> profileImageUrl for workspace user
    const user = await this.users.findOneById({
      userId: createdByUserId,
      expansion: { rootProfileImageUrl: true },
    });

    //Add the user who created the workspace as an maintainer
    const createdByWorkspaceUser = await this.workspaceUsers.create({
      data: {
        roles: [
          WorkspaceUserRole.OWNER,
          WorkspaceUserRole.MAINTAINER,
          WorkspaceUserRole.MEMBER,
        ],
        FK_workspaceId: newWorkspace.id,
        FK_userId: createdByUserId,
        profileImageUrl: user.rootProfileImageUrl,
      },
    });

    //Set the user who created the workspace as the creator of the workspace
    await this.prisma.workspace.update({
      where: {
        id: newWorkspace.id,
      },
      data: {
        createdByWorkspaceUser: {
          connect: {
            id: createdByWorkspaceUser.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    //Set this new workspace as default active workspace for user who created it
    await this.setActiveWorkspaceForUser({
      userId: createdByUserId,
      workspaceId: newWorkspace.id,
    });

    return this.findOne({
      workspaceId: newWorkspace.id,
      expansion,
    });
  }

  async findOne({
    workspaceId,
    expansion,
    throwNotFoundException,
  }: {
    workspaceId: string;
    expansion?: WorkspaceExpansionDto;
    throwNotFoundException?: boolean;
  }) {
    if (!workspaceId) {
      //If there is no id, that means that another method is calling this method without an id.
      //Prisma will throw an error if we don't provide an id, so we throw a custom error here or return null.
      if (throwNotFoundException) {
        throw new NotFoundException('Workspace not found');
      } else {
        return null;
      }
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        name: true,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        onboarded: expansion?.onboarded ?? false,
        description: expansion?.description ?? false,
        logoUrl: expansion?.logoUrl ?? false,
        workspaceUsers: expansion?.workspaceUsers
          ? {
              select: {
                id: true,
                roles: expansion?.workspaceUserRoles ?? false,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            }
          : false,
      },
    });

    if (!workspace && throwNotFoundException) {
      throw new NotFoundException('Workspace not found');
    }

    return workspace;
  }

  async findMe({
    workspaceId,
    throwNotFoundException,
  }: {
    workspaceId: string;
    throwNotFoundException?: boolean;
  }) {
    if (!workspaceId) {
      //If there is no id, that means that another method is calling this method without an id.
      //Prisma will throw an error if we don't provide an id, so we throw a custom error here or return null.
      if (throwNotFoundException) {
        throw new NotFoundException('Your workspace was not found');
      } else {
        return null;
      }
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        onboarded: true,
        inBeta: true,
        logoUrl: true,
        defaultCreatedWorkspace: true,
        billing: {
          select: {
            status: true,
            planType: true,
          },
        },
        usage: {
          select: {
            allottedCredits: true,
            purchasedCredits: true,
          },
        },
        createdByWorkspaceUser: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!workspace && throwNotFoundException) {
      throw new NotFoundException('Your workspace was not found');
    }

    return workspace;
  }

  async updateMe<T>({
    workspaceId,
    data,
  }: {
    workspaceId: string;
    data: UpdateWorkspaceDto | T;
  }) {
    await this.prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data,
      select: {
        id: true,
      },
    });

    return this.findMe({
      workspaceId: workspaceId,
      throwNotFoundException: true,
    });
  }

  async findAllForUser({
    userId,
    expansion,
  }: {
    userId: string;
    expansion?: WorkspaceExpansionDto;
  }) {
    if (!userId) {
      throw new NotFoundException('Workspace user not found');
    }

    return await this.prisma.workspace.findMany({
      where: {
        workspaceUsers: {
          some: {
            AND: [{ FK_userId: userId }, { deletedAt: null }],
          },
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: expansion?.createdAt ?? false,
        updatedAt: expansion?.updatedAt ?? false,
        onboarded: expansion?.onboarded ?? false,
        description: expansion?.description ?? false,
        logoUrl: expansion?.logoUrl ?? false,
        workspaceUsers: expansion?.workspaceUsers
          ? {
              select: {
                id: true,
                roles: expansion?.workspaceUserRoles ?? false,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            }
          : false,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async delete({ workspaceId }: { workspaceId: string }) {
    await this.#deleteKnowledgeFromWorkspace({ workspaceId });
    await this.#deleteS3BucketForWorkspace({ workspaceId });

    const workspaceToDelete = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        defaultCreatedWorkspace: true,
      },
    });

    if (workspaceToDelete?.defaultCreatedWorkspace) {
      throw new ForbiddenException('Cannot delete default created workspace');
    }

    const usersFromDeletedWorkspace =
      await this.workspaceUsers.findAllForWorkspace({
        workspaceId,
        expansion: { user: true },
      });

    //Delete workspace
    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    //Set all the affected users' active workspace to null
    await Promise.all(
      usersFromDeletedWorkspace.map(async (workspaceUser) => {
        await this.removeActiveWorkspaceForUserIfApplicableAndSetNewActiveWorkspace(
          {
            userId: workspaceUser.user.id,
            workspaceId,
          },
        );
      }),
    );

    return true;
  }

  #deleteKnowledgeFromWorkspace = async ({
    workspaceId,
  }: {
    workspaceId: string;
  }) => {
    const knowledgeFromProjectsToDelete = await this.prisma.knowledge.findMany({
      where: {
        FK_workspaceId: workspaceId,
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

  #deleteS3BucketForWorkspace = async ({
    workspaceId,
  }: {
    workspaceId: string;
  }) => {
    await this.s3Manager.deletePath(`workspaces/${workspaceId}`);
  };

  async getPresignedPostUrlForProfileImage({
    fileName,
    workspaceId,
  }: {
    fileName: string;
    workspaceId: string;
  }) {
    let fileNameExtension = fileName.split('.').pop();
    if (!fileNameExtension || fileNameExtension.length === 0) {
      fileNameExtension = undefined;
    } else {
      fileNameExtension = fileNameExtension.toLocaleLowerCase();
    }

    return this.s3Manager.getPresignedPostUrl({
      filePath: `workspaces/${workspaceId}/logo/logo${fileNameExtension ? `.${fileNameExtension}` : ''}`,
      fileName: fileName,
      options: {
        ExpirationMinutes: 5,
        publicRead: true,
      },
    });
  }

  async joinWorkspace({
    userId,
    workspaceId,
    roles,
  }: {
    userId: string;
    workspaceId: string;
    roles?: WorkspaceUserRole[];
  }) {
    //Check user limit for workspace plan
    await this.#checkUserLimitForWorkspacePlan({ workspaceId });

    /**
     * Check if workspace user already exists and is not deleted
     */
    const alreadyExistsWorkspaceUser =
      await this.workspaceUsers.findWorkspaceUserByWorkspaceIdAndUserId({
        workspaceId,
        userId,
        expansion: { deletedAt: true },
        includeType: { deleted: true },
      });

    //roles always need to have 'MEMBER'
    const newRolesWithMemberDefault = [
      ...new Set([WorkspaceUserRole.MEMBER, ...roles]),
    ];

    /**
     * Throw error if user already belongs to workspace
     */
    if (alreadyExistsWorkspaceUser && !alreadyExistsWorkspaceUser.deletedAt) {
      throw new ConflictException('User already belongs to this workspace');
    } else {
      /**
       * Restore deleted workspace user if it exists
       */
      if (alreadyExistsWorkspaceUser?.deletedAt) {
        const newWorkspaceUser = await this.prisma.workspaceUser.update({
          where: { id: alreadyExistsWorkspaceUser.id },
          data: {
            createdAt: new Date().toISOString(),
            deletedAt: null,
            roles: newRolesWithMemberDefault,
          },
        });

        return this.workspaceUsers.findOne({
          workspaceUserId: newWorkspaceUser.id,
        });
      } else {
        /**
         * Create workspace user if it does not exist
         */
        const newWorkspaceUser = await this.workspaceUsers.create({
          data: {
            roles: newRolesWithMemberDefault,
            FK_workspaceId: workspaceId,
            FK_userId: userId,
          },
        });

        return this.workspaceUsers.findOne({
          workspaceUserId: newWorkspaceUser.id,
        });
      }
    }
  }

  async removeWorkspaceUserFromWorkspace({
    workspaceUserId,
    workspaceId,
  }: {
    workspaceUserId: string;
    workspaceId: string;
  }) {
    if (
      !(await this.workspaceUsers.checkWorkspaceUserBelongsToWorkspace({
        workspaceUserId,
        workspaceId,
      }))
    ) {
      throw new ForbiddenException('User does not belong this workspace');
    }

    //Check if is last maintainer in workspace
    const workspaceAdminUsers = await this.prisma.workspaceUser.findMany({
      where: {
        AND: [
          {
            FK_workspaceId: workspaceId,
          },
          {
            deletedAt: null,
          },
          {
            roles: {
              has: WorkspaceUserRole.MAINTAINER, //TODO: Should this be owner?
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (
      workspaceAdminUsers.length <= 1 &&
      workspaceAdminUsers[0].id === workspaceUserId
    ) {
      throw new ForbiddenException(
        'There must be at least one admin in your workspace, you can delete the workspace instead.',
      );
    }

    /**
     * Leave workspace
     */
    await this.workspaceUsers.delete({ workspaceUserId });

    /**
     * If you are leaving a workspace that is your active workspace, set active workspace to another workspace or null
     */
    const user = await this.users.findOneByWorkspaceUserId({
      workspaceUserId,
      includeType: { deleted: true },
    });

    await this.removeActiveWorkspaceForUserIfApplicableAndSetNewActiveWorkspace(
      {
        userId: user.id,
        workspaceId,
      },
    );

    return true;
  }

  async setActiveWorkspaceForUser({
    userId,
    workspaceId,
  }: {
    userId: string;
    workspaceId: string;
  }) {
    if (
      !(await this.users.checkUserBelongsToWorkspace({ userId, workspaceId }))
    ) {
      throw new ForbiddenException('User does not belong this workspace');
    }

    return await this.users.update({
      userId,
      data: { FK_activeWorkspaceId: workspaceId },
    });
  }

  /**
   * Removes the active workspace for a user if workspaceId provided doesn't match their existing active workspace.
   * Then if there are more workspaces the user belongs to, it sets the first one as the active workspace.
   */
  async removeActiveWorkspaceForUserIfApplicableAndSetNewActiveWorkspace({
    userId,
    workspaceId,
  }: {
    userId: string;
    /**
     * If no workspace id is provided, it will remove the active workspace for the user and set the first workspace the user belongs to as the active workspace.
     * Nothing will happen if the active workspace id matches the provided workspace id.
     */
    workspaceId?: string;
  }) {
    if (!workspaceId || !userId) {
      return;
    }

    const workspaceUserWithWorkspaces = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        activeWorkspace: {
          select: {
            id: true,
          },
        },
        workspaceUsers: {
          select: {
            workspace: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (workspaceUserWithWorkspaces?.activeWorkspace?.id !== workspaceId) {
      //We don't need to do anything if the active workspaceId doesn't match the provided workspaceId
      return;
    }

    if (workspaceUserWithWorkspaces?.workspaceUsers.length) {
      const firstWorkspace =
        workspaceUserWithWorkspaces.workspaceUsers[0].workspace;
      await this.setActiveWorkspaceForUser({
        userId,
        workspaceId: firstWorkspace.id,
      });
    } else {
      await this.users.update({
        userId,
        data: {
          FK_activeWorkspaceId: null,
        },
      });
    }
  }

  #checkUserLimitForWorkspacePlan = async ({
    workspaceId,
  }: {
    workspaceId: string;
  }) => {
    /**
     * free (Starter): 1 user
     * professional: 1 user
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
            workspaceUsers: true,
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
      throw new NotFoundException(
        'Workspace not found to determine user limit.',
      );
    }

    const numUsers: number = (workspace as any)._count.workspaceUsers;

    //TODO: If someone downgrades plan, do we delete projects? Do we tell them they need to delete projects to downgrade?
    if (
      (!workspace.billing ||
        workspace.billing.planType === 'free' ||
        workspace.billing.planType === 'professional') &&
      numUsers >= 1
    ) {
      throw new ForbiddenException(
        'This workspace has reached the maximum number of users allowed for this plan.',
      );
    }
  };

  validateWorkspaceBetaKey = async ({
    workspaceId,
    betaKey,
  }: {
    workspaceId: string;
    betaKey: string;
  }) => {
    //It's not meant to be secure, just a quick way to prevent easy access to the public.
    //We're launching slowly and want people to request access.
    if (betaKey !== '1234') {
      throw new ForbiddenException('Invalid beta key');
    }

    await this.prisma.workspace.update({
      where: {
        id: workspaceId,
      },
      data: {
        inBeta: true,
      },
    });

    return true;
  };

  async getPresignedPostUrlForTempFile({
    fileName,
    workspaceId,
  }: {
    fileName: string;
    workspaceId: string;
  }) {
    return this.s3Manager.getPresignedPostUrl({
      filePath: `temp/workspaces/${workspaceId}/created-at/${Date.now()}/${v4()}-${fileName}`,
      fileName: fileName,
      options: {
        ExpirationMinutes: 5,
        publicRead: true,
      },
    });
  }
}
