import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ServerConfig } from '../../../config/server.config';
import { ConnectionsService } from '../connections/connections.service';
import { ExecutionsService } from '../executions/executions.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SubTasksService } from '../tasks/subtasks.service';
import { TasksGateway } from '../tasks/tasks.gateway';
import { TasksService } from '../tasks/tasks.service';

import { WorkflowAppsController } from './workflow-apps.controller';
import { WorkflowAppsService } from './workflow-apps.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: ServerConfig.APP_OAUTH_CALLBACK_STATE_SECRET,
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  exports: [WorkflowAppsService],
  controllers: [WorkflowAppsController],
  providers: [
    WorkflowAppsService,
    ConnectionsService,
    TasksService,
    TasksGateway,
    SubTasksService,
    ExecutionsService,
    TasksService,
    KnowledgeService, //Because TaskService uses it
  ],
})
export class WorkflowAppsModule {}
