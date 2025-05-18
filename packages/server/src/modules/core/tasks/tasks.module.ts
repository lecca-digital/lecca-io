import { Module } from '@nestjs/common';

import { ConnectionsService } from '../connections/connections.service';
import { ExecutionsService } from '../executions/executions.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { WorkflowAppsService } from '../workflow-apps/workflow-apps.service';

import { SubTasksService } from './subtasks.service';
import { AgentTasksController, TasksController } from './tasks.controller';
import { TasksGateway } from './tasks.gateway';
import { TasksService } from './tasks.service';

@Module({
  imports: [],
  controllers: [TasksController, AgentTasksController],
  exports: [TasksService, SubTasksService, TasksGateway],
  providers: [
    TasksService,
    SubTasksService,
    TasksGateway,
    WorkflowAppsService,
    ConnectionsService, //For workflow apps service
    ExecutionsService, //For workflow apps service
    KnowledgeService,
  ],
})
export class TasksModule {}
