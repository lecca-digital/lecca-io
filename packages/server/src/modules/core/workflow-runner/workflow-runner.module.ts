import { Module } from '@nestjs/common';

import { ConnectionsService } from '../connections/connections.service';
import { ExecutionsService } from '../executions/executions.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SubTasksService } from '../tasks/subtasks.service';
import { TasksGateway } from '../tasks/tasks.gateway';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowAppsService } from '../workflow-apps/workflow-apps.service';

import { WorkflowRunnerService } from './workflow-runner.service';

@Module({
  exports: [WorkflowRunnerService],
  providers: [
    WorkflowAppsService,
    TasksService, //For workflow apps service
    TasksGateway, //For workflow apps service
    SubTasksService, //For workflow apps service
    ConnectionsService, //For workflow apps service
    ExecutionsService, //For workflow apps service
    WorkflowRunnerService,
    KnowledgeService, //Because TaskService uses it
  ],
})
export class WorkflowRunnerModule {}
