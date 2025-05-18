import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../global/prisma/prisma.service';

import { UpdateWorkspacePreferencesDto } from './dto/update-workspace-preferences.dto';

@Injectable()
export class WorkspacePreferencesService {
  constructor(private prisma: PrismaService) {}

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
        throw new NotFoundException('Workspace preferences not found');
      } else {
        return null;
      }
    }

    const workspacePreferences =
      await this.prisma.workspacePreferences.findFirst({
        where: {
          FK_workspaceId: workspaceId,
        },
        select: {
          id: true,
          disabledFeatures: true,
          defaultAgentLlmProvider: true,
          defaultAgentLlmModel: true,
          defaultAgentLlmConnection: {
            select: {
              id: true,
              connectionId: true,
              name: true,
            },
          },
          defaultTaskNamingInstructions: true,
          defaultTaskNamingLlmProvider: true,
          defaultTaskNamingLlmModel: true,
          defaultTaskNamingLlmConnection: {
            select: {
              id: true,
              connectionId: true,
              name: true,
            },
          },
        },
      });

    if (!workspacePreferences && throwNotFoundException) {
      throw new NotFoundException('Workspace preferences not found');
    }

    return workspacePreferences;
  }

  async updateMe<T>({
    workspaceId,
    data,
  }: {
    workspaceId: string;
    data: UpdateWorkspacePreferencesDto | T;
  }) {
    const defaultAgentLlmConnectionId = (data as UpdateWorkspacePreferencesDto)
      .defaultAgentLlmConnectionId;
    if (defaultAgentLlmConnectionId !== undefined) {
      delete (data as UpdateWorkspacePreferencesDto)
        .defaultAgentLlmConnectionId;
    }

    const defaultTaskNamingLlmConnectionId = (
      data as UpdateWorkspacePreferencesDto
    ).defaultTaskNamingLlmConnectionId;
    if (defaultTaskNamingLlmConnectionId !== undefined) {
      delete (data as UpdateWorkspacePreferencesDto)
        .defaultTaskNamingLlmConnectionId;
    }

    await this.prisma.workspacePreferences.update({
      where: {
        FK_workspaceId: workspaceId,
      },
      data: {
        ...data,
        defaultAgentLlmConnection:
          defaultAgentLlmConnectionId === null
            ? {
                disconnect: true,
              }
            : defaultAgentLlmConnectionId === undefined
              ? undefined
              : {
                  connect: {
                    id: defaultAgentLlmConnectionId,
                  },
                },
        defaultTaskNamingLlmConnection:
          defaultTaskNamingLlmConnectionId === null
            ? {
                disconnect: true,
              }
            : defaultTaskNamingLlmConnectionId === undefined
              ? undefined
              : {
                  connect: {
                    id: defaultTaskNamingLlmConnectionId,
                  },
                },
      },
      select: {
        id: true,
      },
    });

    //Don't have a this.findOne but findMe will work because users will only ever be accessing their own workspace preferences
    return this.findMe({
      workspaceId: workspaceId,
      throwNotFoundException: true,
    });
  }
}
