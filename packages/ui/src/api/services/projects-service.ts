import {
  CreateProjectType,
  Project,
  UpdateProjectType,
  projectSchema,
} from '../../models/project/project-model';
import { ApiLibrary, ApiLibraryConfig, appQueryClient } from '../api-library';
import { ApiLibraryHelper } from '../api-library-helpers';

export default class ProjectsService extends ApiLibraryHelper {
  protected schema = projectSchema;
  protected path = '/projects';
  protected serviceName = 'projects' as keyof ApiLibrary;

  getList(args?: { config?: ApiLibraryConfig }) {
    return super._getList<Project[]>({
      config: {
        ...args?.config,
        params: {
          expansion: ['createdAt', 'updatedAt', 'description'],
          ...args?.config?.params,
        },
      },
    });
  }

  getById({ id, config }: { id: string; config?: ApiLibraryConfig }) {
    return super._getById<Project>({
      id,
      config: {
        ...config,
        params: {
          expansion: [
            'createdAt',
            'updatedAt',
            'description',
            'createdByWorkspaceUser',
            'defaultAgentLlmConnection',
            'defaultAgentLlmModel',
            'defaultAgentLlmProvider',
            'defaultTaskNamingInstructions',
            'defaultTaskNamingLlmConnection',
            'defaultTaskNamingLlmModel',
            'defaultTaskNamingLlmProvider',
            'countAgents',
            'countConnections',
            'countKnowledge',
            'countVariables',
            'countWorkflows',
          ],
          ...config?.params,
        },
      },
    });
  }

  create({
    data,
    config,
  }: {
    data: CreateProjectType;
    config?: ApiLibraryConfig;
  }) {
    return super._create<Project>({ data, config });
  }

  update({
    id,
    data,
    config,
  }: {
    id: string;
    data: UpdateProjectType;
    config?: ApiLibraryConfig;
  }) {
    return super._update<Project>({ id, data, config });
  }

  delete({ id, config }: { id: string; config?: ApiLibraryConfig }) {
    return this.apiFetch<null>({
      path: `${this.path}/${id}`,
      httpMethod: 'delete',
      config,
      mockConfig: {
        schema: null,
        doNotMock: false,
      },
      onSuccess: async () => {
        await Promise.all([
          appQueryClient.invalidateQueries({
            queryKey: [this.serviceName, 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['knowledge', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['workflows', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['agents', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['connections', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['variables', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['executions', 'getList'],
          }),
        ]);
      },
    });
  }

  leaveProject({
    projectId,
    config,
  }: {
    projectId: string;
    config?: ApiLibraryConfig;
  }) {
    return super.apiFetch({
      httpMethod: 'post',
      mockConfig: {
        schema: null,
      },
      path: `${this.path}/${projectId}/leave`,
      config,
      onSuccess: async () => {
        await Promise.all([
          appQueryClient.invalidateQueries({
            queryKey: [this.serviceName, 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['knowledge', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['workflows', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['agents', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['connections', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['variables', 'getList'],
          }),
          appQueryClient.invalidateQueries({
            queryKey: ['executions', 'getList'],
          }),
        ]);
      },
    });
  }
}
