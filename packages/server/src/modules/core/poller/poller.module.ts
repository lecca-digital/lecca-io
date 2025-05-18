import { Module } from '@nestjs/common';

import { ConnectionsService } from '../connections/connections.service';
import { ExecutionsService } from '../executions/executions.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SubTasksService } from '../tasks/subtasks.service';
import { TasksGateway } from '../tasks/tasks.gateway';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowAppsService } from '../workflow-apps/workflow-apps.service';

import { PollerService } from './poller.service';

@Module({
  exports: [PollerService],
  providers: [
    PollerService,
    WorkflowAppsService,
    TasksService, //For workflow apps serviceyy
    TasksGateway, //For workflow apps service
    SubTasksService,
    ConnectionsService, //workflow apps
    ExecutionsService, //workflow apps
    KnowledgeService, //Because TaskService uses it
  ],
})
export class PollerModule {}
