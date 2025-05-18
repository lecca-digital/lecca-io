import { FormattedTaskMessage } from '../../models/task/formatted-task-message-model';
import { SavedTaskMessage } from '../../models/task/saved-task-message-model';
import {
  CreateTaskType,
  Task,
  UpdateTaskType,
  taskSchema,
} from '../../models/task/task-model';
import { ApiLibrary, ApiLibraryConfig, appQueryClient } from '../api-library';
import { ApiLibraryHelper } from '../api-library-helpers';

export default class TasksService extends ApiLibraryHelper {
  protected schema = taskSchema;
  protected path = '/tasks';
  protected serviceName = 'tasks' as keyof ApiLibrary;

  /**
   * Does not return a streamed response.
   */
  sendMessage({
    agentId,
    taskId,
    messages,
    config,
  }: {
    agentId: string;
    taskId: string;
    messages: FormattedTaskMessage[];
    config?: ApiLibraryConfig;
  }) {
    return super.apiFetch<SavedTaskMessage[]>({
      path: `/agents/${agentId}${this.path}/${taskId}/message`,
      httpMethod: 'post',
      mockConfig: {
        schema: null,
      },
      config: config,
      data: {
        messages,
      },
    });
  }

  create({
    data,
    agentId,
    config,
  }: {
    data: CreateTaskType;
    agentId: string;
    config?: ApiLibraryConfig;
  }) {
    return super.apiFetch<Task>({
      httpMethod: 'post',
      mockConfig: {
        schema: taskSchema,
      },
      path: `/agents/${agentId}/tasks`,
      data,
      onSuccess: async () => {
        await Promise.all([
          appQueryClient.invalidateQueries({
            queryKey: [this.serviceName, 'getList'],
          }),
        ]);
      },
      config,
    });
  }

  getList(args?: { config?: ApiLibraryConfig }) {
    return super._getList<Task[]>({
      config: {
        ...args?.config,
        params: {
          expansion: [
            'createdAt',
            'updatedAt',
            'description',
            'agent',
            'project',
          ],
          ...args?.config?.params,
        },
      },
    });
  }

  getById({ id, config }: { id: string; config?: ApiLibraryConfig }) {
    return super.apiFetch<Task>({
      httpMethod: 'get',
      mockConfig: {
        schema: taskSchema,
      },
      path: `${this.path}/${id}`,
      config: {
        ...config,
        params: {
          expansion: [
            'createdAt',
            'updatedAt',
            'description',
            'agent',
            'project',
            'messages',
            'messageCreatedAt',
            'messageUsage',
            'subTasks',
          ],
          ...config?.params,
        },
      },
    });
  }

  update({
    id,
    data,
    config,
  }: {
    id: string;
    data: UpdateTaskType;
    config?: ApiLibraryConfig;
  }) {
    return super._update<Task>({
      id,
      data,
      config,
    });
  }

  delete({ id, config }: { id: string; config?: ApiLibraryConfig }) {
    return super._delete<boolean>({
      id,
      config,
    });
  }
}
