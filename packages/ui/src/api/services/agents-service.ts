import {
  Agent,
  CreateAgentType,
  UpdateAgentType,
  agentSchema,
} from '../../models/agent/agent-model';
import { ApiLibrary, ApiLibraryConfig, appQueryClient } from '../api-library';
import { ApiLibraryHelper } from '../api-library-helpers';

export default class AgentsService extends ApiLibraryHelper {
  protected schema = agentSchema;
  protected path = '/agents';
  protected serviceName = 'agents' as keyof ApiLibrary;

  create({
    data,
    projectId,
    config,
  }: {
    data: CreateAgentType;
    projectId: string;
    config?: ApiLibraryConfig;
  }) {
    return super.apiFetch<Agent>({
      httpMethod: 'post',
      mockConfig: {
        schema: agentSchema,
      },
      path: `/projects/${projectId}/agents`,
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
    return super._getList<Agent[]>({
      config: {
        ...args?.config,
        params: {
          expansion: [
            'createdAt',
            'updatedAt',
            'profileImageUrl',
            'description',
            'project',
            'connections',
            'knowledge',
            'triggerIds',
            'toolIds',
          ],
          ...args?.config?.params,
        },
      },
    });
  }

  getById({ id, config }: { id: string; config?: ApiLibraryConfig }) {
    return super.apiFetch<Agent>({
      httpMethod: 'get',
      mockConfig: {
        schema: agentSchema,
      },
      path: `${this.path}/${id}`,
      config: {
        ...config,
        params: {
          expansion: [
            'createdAt',
            'updatedAt',
            'profileImageUrl',
            'description',
            'project',
            'instructions',
            'maxRetries',
            'frequencyPenalty',
            'maxTokens',
            'maxToolRoundtrips',
            'presencePenalty',
            'seed',
            'temperature',
            'topP',
            'tools',
            'triggers',
            'connections',
            'actions',
            'knowledge',
            'variables',
            'workflows',
            'subAgents',
            'webAccess',
            'phoneAccess',
            'llmConnection',
            'llmModel',
            'llmProvider',
            'triggerIds',
            'toolIds',
            'taskNamingInstructions',
            'taskNamingLlmConnection',
            'taskNamingLlmModel',
            'taskNamingLlmProvider',
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
    data: UpdateAgentType;
    config?: ApiLibraryConfig;
  }) {
    return super._update<Agent>({
      id,
      data,
      config,
    });
  }

  getPresignedPostUrlForProfileImage({
    id,
    fileName,
    config,
  }: {
    id: string;
    fileName: string;
    config?: ApiLibraryConfig;
  }) {
    return super.apiFetch<{
      presignedPostData: { url: string; fields: Record<string, string> };
      pathUrl: string;
    }>({
      httpMethod: 'post',
      path: `${this.path}/${id}/profile-image-post-url`,
      data: { fileName },
      config,
      mockConfig: {
        isArray: false,
        schema: null,
      },
    });
  }

  delete({ id, config }: { id: string; config?: ApiLibraryConfig }) {
    return super._delete<boolean>({
      id,
      config,
    });
  }
}
