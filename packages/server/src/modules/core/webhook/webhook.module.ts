import { Module } from '@nestjs/common';

import { StripeService } from '../../commercial/stripe/stripe.service';
import { ConnectionsService } from '../connections/connections.service';
import { ExecutionsService } from '../executions/executions.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { SubTasksService } from '../tasks/subtasks.service';
import { TasksGateway } from '../tasks/tasks.gateway';
import { TasksService } from '../tasks/tasks.service';
import { WorkflowAppsService } from '../workflow-apps/workflow-apps.service';

import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  exports: [WebhookService],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    StripeService,
    WorkflowAppsService,
    TasksService, //workflow apps
    TasksGateway, //For workflow apps service
    SubTasksService, //For workflow apps service
    ConnectionsService, //workflow apps
    ExecutionsService, //workflow apps
    KnowledgeService, //Because TaskService uses it
  ],
})
export class WebhookModule {}
