import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { BelongsTo } from '../../../decorators/belongs-to.decorator';
import { Expansion } from '../../../decorators/expansion.decorator';
import { FilterBy } from '../../../decorators/filter-by.decorator';
import { IncludeType } from '../../../decorators/include-type.decorator';
import { Roles } from '../../../decorators/roles.decorator';
import { User } from '../../../decorators/user.decorator';
import { JwtUser } from '../../../types/jwt-user.type';

import { CreateTaskDto } from './dto/create-task.dto';
import { MessageTaskDto } from './dto/message-task.dto';
import { TaskExpansionDto } from './dto/task-expansion.dto';
import { TaskFilterByDto } from './dto/task-filter-by.dto';
import { TaskIncludeTypeDto } from './dto/task-include-type.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('agents/:agentId/tasks')
@ApiTags('Tasks')
@ApiBearerAuth()
export class AgentTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @BelongsTo({ owner: 'either', key: 'agentId', roles: ['MAINTAINER'] })
  async create(
    @Body() data: CreateTaskDto,
    @Expansion('agents') expansion: TaskExpansionDto,
    @Param('agentId') agentId: string,
  ) {
    const task = await this.tasksService.create({
      data,
      agentId,
      expansion,
    });

    return task;
  }

  @Post(':taskId/message')
  @BelongsTo({ owner: 'either', key: 'agentId', roles: ['MAINTAINER'] })
  //We will verify taskId ownership in the service
  //This is because the taskId might not exist yet
  //so we can't use our normal BelongsTo decorator
  @Roles()
  async messageTaskOrCreate(
    @User() user: JwtUser,
    @Param('taskId') taskId: string,
    @Param('agentId') agentId: string,
    @Body() data: MessageTaskDto,
    @Res() response: Response,
  ) {
    // Handle the case where messages array is empty (for subtask continuation)
    const messages = data.messages?.length > 0 
      ? [data.messages[data.messages.length - 1]] 
      : [];

    const result = await this.tasksService.messageTaskOrCreateTaskIfNotFound({
      agentId,
      taskId,
      messages,
      requestingWorkspaceUserId: user.workspaceUserId,
      workspaceId: user.workspaceId,
      customIdentifier: undefined,
      shouldStream: false,
      simpleResponse: false,
    });

    if (typeof result === 'string' || Array.isArray(result)) {
      return response.status(200).json(result);
    } else {
      return result.pipeDataStreamToResponse(response);
    }
  }

  @Post(':taskId/stream-message')
  @BelongsTo({ owner: 'either', key: 'agentId', roles: ['MAINTAINER'] })
  //We will verify taskId ownership in the service
  //This is because the taskId might not exist yet
  //so we can't use our normal BelongsTo decorator
  @Roles()
  async streamMessageTaskOrCreate(
    @User() user: JwtUser,
    @Param('taskId') taskId: string,
    @Param('agentId') agentId: string,
    @Body() data: MessageTaskDto,
    @Res() response: Response,
  ) {
    try {
      // Handle the case where messages array is empty (for subtask continuation)
      const messages = data.messages?.length > 0 
        ? [data.messages[data.messages.length - 1]] 
        : [];

      const result = await this.tasksService.messageTaskOrCreateTaskIfNotFound({
        agentId,
        taskId,
        messages,
        requestingWorkspaceUserId: user.workspaceUserId,
        workspaceId: user.workspaceId,
        shouldStream: true,
        customIdentifier: undefined,
      });

      if (typeof result === 'string' || Array.isArray(result)) {
        return response.status(200).json(result);
      } else {
        return result.pipeDataStreamToResponse(response, {
          getErrorMessage(error) {
            if (typeof error === 'object') {
              return JSON.stringify(error);
            } else {
              return error?.toString();
            }
          },
        });
      }
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }
}

@Controller('tasks')
@ApiTags('Tasks')
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAllForWorkspace(
    @User() user: JwtUser,
    @IncludeType('tasks') includeType: TaskIncludeTypeDto,
    @Expansion('tasks') expansion: TaskExpansionDto,
    @FilterBy('tasks') filterBy: TaskFilterByDto,
  ) {
    return this.tasksService.findAllForWorkspace({
      jwtUser: user,
      workspaceId: user.workspaceId,
      includeType,
      expansion,
      filterBy,
    });
  }

  @Get(':taskId')
  @BelongsTo({ owner: 'either', key: 'taskId', roles: ['MAINTAINER'] })
  async findOne(
    @Param('taskId') taskId: string,
    @Expansion('tasks') expansion: TaskExpansionDto,
  ) {
    const task = await this.tasksService.findOne({
      taskId,
      expansion,
      throwNotFoundException: true,
    });

    return task;
  }

  @Patch(':taskId')
  @BelongsTo({ owner: 'either', key: 'taskId', roles: ['MAINTAINER'] })
  async update(
    @Param('taskId') taskId: string,
    @Body() data: UpdateTaskDto,
    @Expansion('tasks') expansion: TaskExpansionDto,
  ) {
    const task = await this.tasksService.update({
      taskId,
      data,
      expansion,
    });

    return task;
  }

  @Delete(':taskId')
  @BelongsTo({ owner: 'either', key: 'taskId', roles: ['MAINTAINER'] })
  delete(@Param('taskId') taskId: string) {
    return this.tasksService.delete({ taskId });
  }
}
