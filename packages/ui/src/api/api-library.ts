import { QueryClient } from '@tanstack/react-query';

import AgentsService from './services/agents-service';
import AiProvidersService from './services/ai-provider-service';
import AuthService from './services/auth-service';
import BillingService from './services/billing-service';
import ConnectionsService from './services/connections-service';
import CreditsService from './services/credits-service';
import DiscoveryService from './services/discovery-service';
import ExecutionsService from './services/executions-service';
import KnowledgeService from './services/knowledge-service';
import NotificationsService from './services/notifications-service';
import ProjectInvitationsService from './services/project-invitations-service';
import ProjectsService from './services/projects-service';
import TasksService from './services/tasks-service';
import UsersService from './services/users-service';
import VariablesService from './services/variables-service';
import WorkflowAppsService from './services/workflow-apps-service';
import WorkflowsService from './services/workflow-service';
import WorkflowTemplatesService from './services/workflow-templates-service';
import WorkspaceInvitationsService from './services/workspace-invitations-service';
import WorkspacePreferencesService from './services/workspace-preferences-service';
import WorkspaceUserPreferencesService from './services/workspace-user-preferences-service';
import WorkspaceUsersService from './services/workspace-users-service';
import WorkspacesService from './services/workspaces-service';

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, //60 minutes
    },
  },
});

export class ApiLibrary {
  constructor({
    version,
    queryClient,
  }: {
    version: number;
    queryClient: QueryClient;
  }) {
    //Doesn't use query client or an api version, so we won't use the default constructor.
    this.auth = new AuthService({ library: this });

    //Default constructor with react query client and version
    const defaultConstructor = {
      version: version,
      library: this,
      queryClient: queryClient,
    };

    this.discovery = new DiscoveryService(defaultConstructor);
    this.users = new UsersService(defaultConstructor);
    this.workspaceUsers = new WorkspaceUsersService(defaultConstructor);
    this.workspaceUserPreferences = new WorkspaceUserPreferencesService(
      defaultConstructor,
    );
    this.projects = new ProjectsService(defaultConstructor);
    this.projectInvitations = new ProjectInvitationsService(defaultConstructor);
    this.workspaces = new WorkspacesService(defaultConstructor);
    this.workspaceInvitations = new WorkspaceInvitationsService(
      defaultConstructor,
    );
    this.workspacePreferences = new WorkspacePreferencesService(
      defaultConstructor,
    );
    this.workflowApps = new WorkflowAppsService(defaultConstructor);
    this.connections = new ConnectionsService(defaultConstructor);
    this.workflowTemplates = new WorkflowTemplatesService(defaultConstructor);
    this.executions = new ExecutionsService(defaultConstructor);
    this.workflows = new WorkflowsService(defaultConstructor);
    this.agents = new AgentsService(defaultConstructor);
    this.variables = new VariablesService(defaultConstructor);
    this.notifications = new NotificationsService(defaultConstructor);
    this.tasks = new TasksService(defaultConstructor);
    this.billing = new BillingService(defaultConstructor);
    this.knowledge = new KnowledgeService(defaultConstructor);
    this.credits = new CreditsService(defaultConstructor);
    this.aiProviders = new AiProvidersService(defaultConstructor);
  }

  auth: AuthService;
  discovery: DiscoveryService;
  users: UsersService;
  workspaceUsers: WorkspaceUsersService;
  workspaceUserPreferences: WorkspaceUserPreferencesService;
  projects: ProjectsService;
  projectInvitations: ProjectInvitationsService;
  workspaces: WorkspacesService;
  workspaceInvitations: WorkspaceInvitationsService;
  workspacePreferences: WorkspacePreferencesService;
  workflowApps: WorkflowAppsService;
  connections: ConnectionsService;
  workflowTemplates: WorkflowTemplatesService;
  executions: ExecutionsService;
  workflows: WorkflowsService;
  agents: AgentsService;
  variables: VariablesService;
  notifications: NotificationsService;
  tasks: TasksService;
  billing: BillingService;
  knowledge: KnowledgeService;
  credits: CreditsService;
  aiProviders: AiProvidersService;
}

const apiInstance = new ApiLibrary({
  queryClient: appQueryClient,
  version: 1,
});

export { apiInstance as api };

export interface ApiLibraryConfig {
  params?: Record<
    string,
    (string | number | boolean) | (string | number | boolean)[]
  >;
  options?: Record<string, unknown>;
  signal?: AbortSignal;
}
