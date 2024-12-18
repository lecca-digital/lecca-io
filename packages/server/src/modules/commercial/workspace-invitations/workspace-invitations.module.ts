import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ServerConfig } from '../../../config/server.config';
import { UsersService } from '../../core/users/users.service';
import { WorkspaceUsersService } from '../../core/workspace-users/workspace-users.service';
import { WorkspacesService } from '../../core/workspaces/workspaces.service';

import { WorkspaceInvitationsController } from './workspace-invitations.controller';
import { WorkspaceInvitationsService } from './workspace-invitations.service';

@Module({
  exports: [WorkspaceInvitationsService],
  imports: [
    //Had to add this JwtModule to use the WorkspaceService
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: ServerConfig.AUTH_JWT_SECRET,
      }),
    }),
  ],
  controllers: [WorkspaceInvitationsController],
  providers: [
    WorkspaceInvitationsService,
    WorkspacesService,
    WorkspaceUsersService, //Had to add these to use the WorkspaceService
    UsersService, //Had to add these to use the WorkspaceService
  ],
})
export class WorkspaceInvitationsModule {}
