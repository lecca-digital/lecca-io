import { Module } from '@nestjs/common';

import { ConnectionsService } from '../connections/connections.service';
import { ExecutionsService } from '../executions/executions.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SubTasksService } from '../tasks/subtasks.service';
import { TasksGateway } from '../tasks/tasks.gateway';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowAppsService } from '../workflow-apps/workflow-apps.service';
import { WorkflowsService } from '../workflows/workflows.service';

import { AgentsController, ProjectAgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  controllers: [AgentsController, ProjectAgentsController],
  exports: [AgentsService],
  providers: [
    AgentsService,
    WorkflowsService,
    WorkflowAppsService,
    ConnectionsService, //For workflow apps service
    ExecutionsService, //For workflow apps service
    TasksService, //For workflow apps service
    TasksGateway, //For workflow apps service
    SubTasksService, //For workflow apps service
    KnowledgeService, //Because TaskService uses it
  ],
})
export class AgentsModule {}
