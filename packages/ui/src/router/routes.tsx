import { Route, Routes } from 'react-router-dom';
import { ReactFlowProvider } from 'reactflow';

import ApplicationLayout from '../components/layouts/application-layout';
import { OnboardingLayout } from '../components/layouts/onboarding-layout';
import { AgentDetailsPage } from '../pages/agents/agent-details-page';
import AgentsPage from '../pages/agents/agents-page';
import { AgentChatPage } from '../pages/agents/chat/agent-chat-page';
import { AgentConfigurePage } from '../pages/agents/configure/agent-configure-page';
import { AppDetailsActions } from '../pages/apps/app-details-actions';
import { AppDetailsConnections } from '../pages/apps/app-details-connections';
import { AppDetailsLayout } from '../pages/apps/app-details-layout';
import { AppDetailsOverview } from '../pages/apps/app-details-overview';
import { AppDetailsTriggers } from '../pages/apps/app-details-triggers';
import AppsPage from '../pages/apps/apps-page';
import AssetsPage from '../pages/assets/assets-page';
import BetaPage from '../pages/beta/beta-page';
import { BillingPage } from '../pages/billing/billing-page';
import ConfirmEmailPage from '../pages/confirm-email/confirm-email-page';
import ConnectionDetailsPage from '../pages/connections/connection-details-page';
import ConnectionsPage from '../pages/connections/connections-page';
import CreditsPage from '../pages/credits/credits-page';
import ExecutionsPage from '../pages/executions/executions-page';
import ForgotPasswordPage from '../pages/forgot-password/forgot-password';
import HomePage from '../pages/home/home-page';
import { KnowledgePage } from '../pages/knowledge/knowledge-page';
import { KnowledgeDetailsPage } from '../pages/knowledge/vectorRefs/knowledge-details-page';
import LoginPage from '../pages/login/login-page';
import LogoutPage from '../pages/logout/logout-page';
import { OnboardingPage } from '../pages/onboarding/onboarding-page';
import { ExecutionProvider } from '../pages/projects/execution-provider';
import { ProjectAgentsPage } from '../pages/projects/project-agents-page';
import { ProjectDetailsPage } from '../pages/projects/project-details-page';
import { ProjectExecutionsPage } from '../pages/projects/project-executions-page';
import ProjectAgentSettingsPage from '../pages/projects/project-settings/project-agent-settings-page';
import ProjectGeneralSettingsPage from '../pages/projects/project-settings/project-general-settings-page';
import { ProjectInvitationsPage } from '../pages/projects/project-settings/project-invitations-page';
import { ProjectSettingsLayout } from '../pages/projects/project-settings/project-settings-page-layout';
import { ProjectWorkspaceUsersPage } from '../pages/projects/project-settings/project-workspace-users-page';
import { ProjectWorkflowsPage } from '../pages/projects/project-workflows-page';
import ProjectsPage from '../pages/projects/projects-page';
import { WorkflowBuilderPage } from '../pages/projects/workflow-builder-page';
import { PublicAppsPage } from '../pages/public/public-apps-page';
import { RedirectPage } from '../pages/redirect/redirect-page';
import ResetPasswordPage from '../pages/reset-password/reset-password-page';
import { SuccessfulPaymentPage } from '../pages/successful-payment/successful-payment-page';
import { TaskDetailsPage } from '../pages/tasks/tasks-details-page';
import TasksPage from '../pages/tasks/tasks-page';
import { TeamMembersPage } from '../pages/team-members/team-members-page';
import { WorkflowTemplateDetailsPage } from '../pages/templates/workflow-template-details-page';
import { WorkflowTemplatesPage } from '../pages/templates/workflow-templates-page';
import UserAccountPage from '../pages/user-settings/account/account-page';
import NotificationPreferencesPage from '../pages/user-settings/notification-preferences/notification-preferences';
import UserPreferencesPage from '../pages/user-settings/user-preferences/user-preferences-page';
import SettingsPageLayout from '../pages/user-settings/user-settings-page-layout';
import { WorkspaceInvitationsReceivedPage } from '../pages/user-settings/workspace-invitations-received-page';
import VariablesPage from '../pages/variables/variables-page';
import { VerifyTokenPage } from '../pages/verify-token/verify-token-page';
import { WelcomePage } from '../pages/welcome/welcome-page';
import { WorkflowDetailsPage } from '../pages/workflows/workflow-details-page';
import WorkflowGeneralSettingsPage from '../pages/workflows/workflow-settings/workflow-general-settings-page';
import { WorkflowSettingsLayout } from '../pages/workflows/workflow-settings/workflow-settings-page-layout';
import WorkflowsPage from '../pages/workflows/workflows-page';
import { WorkspaceAgentsPage } from '../pages/workspace-settings/workspace-agents-page';
import { WorkspaceBillingPage } from '../pages/workspace-settings/workspace-billing-page';
import { WorkspaceInvitationsPage } from '../pages/workspace-settings/workspace-invitations-page';
import WorkspaceNotificationPreferencesPage from '../pages/workspace-settings/workspace-notification-preferences';
import WorkspacePreferencesPage from '../pages/workspace-settings/workspace-preference-page';
import WorkspaceSettingsPage from '../pages/workspace-settings/workspace-settings-page';
import WorkspaceSettingsPageLayout from '../pages/workspace-settings/workspace-settings-page-layout';
import { ProjectWorkflowProvider } from '../providers/project-workflow-provider/project-workflow-provider';

import { AuthenticatedRoute } from './authenticated-route';
import { UnauthenticatedRoute } from './unauthenticated-route';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<UnauthenticatedRoute />}>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<OnboardingLayout />}>
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        </Route>
        <Route path="/verify-token" element={<VerifyTokenPage />} />
      </Route>

      <Route element={<AuthenticatedRoute />}>
        <Route element={<ApplicationLayout />}>
          {/* HOME */}
          <Route path="/" element={<HomePage />} />

          {/* PROJECTS */}
          <Route path="/projects">
            <Route index element={<ProjectsPage />} />
            <Route path=":projectId">
              <Route
                index
                element={
                  //   We won't use this page, because we don't really have a
                  //   project overview need at the moment. Eventually we can show
                  //   usage stats, users in the project, recent workflows, .etc
                  //   This page will redirect to /workflows
                  <ProjectDetailsPage />
                }
              />
              {/* PROJECT SETTINGS */}
              <Route element={<ProjectSettingsLayout />}>
                <Route
                  path="settings"
                  element={<ProjectGeneralSettingsPage />}
                />
                <Route path="users" element={<ProjectWorkspaceUsersPage />} />
                <Route
                  path="agent-settings"
                  element={<ProjectAgentSettingsPage />}
                />
                <Route
                  path="invitations"
                  element={<ProjectInvitationsPage />}
                />
              </Route>

              {/* PROJECT EXECUTIONS */}
              <Route path="executions">
                <Route index element={<ProjectExecutionsPage />} />
                <Route
                  path=":executionId"
                  element={
                    <ReactFlowProvider>
                      <ProjectWorkflowProvider>
                        <ExecutionProvider>
                          <WorkflowBuilderPage />
                        </ExecutionProvider>
                      </ProjectWorkflowProvider>
                    </ReactFlowProvider>
                  }
                ></Route>
              </Route>

              {/* PROJECT WORKFLOW TEMPLATE */}
              <Route path="workflow-templates">
                <Route index element={<ProjectWorkflowsPage />} />
                <Route path=":workflowTemplateId">
                  <Route
                    index
                    element={
                      <ReactFlowProvider>
                        <ProjectWorkflowProvider>
                          <WorkflowBuilderPage />
                        </ProjectWorkflowProvider>
                      </ReactFlowProvider>
                    }
                  />
                </Route>
              </Route>

              {/* PROJECT WORKFLOWS */}
              <Route path="workflows">
                <Route index element={<ProjectWorkflowsPage />} />
                <Route
                  path="new"
                  element={
                    <ReactFlowProvider>
                      <ProjectWorkflowProvider>
                        <WorkflowBuilderPage />
                      </ProjectWorkflowProvider>
                    </ReactFlowProvider>
                  }
                />
                <Route path=":workflowId">
                  <Route
                    index
                    element={
                      <ReactFlowProvider>
                        <ProjectWorkflowProvider>
                          <WorkflowBuilderPage />
                        </ProjectWorkflowProvider>
                      </ReactFlowProvider>
                    }
                  />

                  {/* WORKFLOW SETTINGS */}
                  <Route element={<WorkflowSettingsLayout />}>
                    <Route
                      path="settings"
                      element={<WorkflowGeneralSettingsPage />}
                    />
                  </Route>
                </Route>
              </Route>

              {/* PROJECT AGENTS */}
              <Route path="agents">
                <Route index element={<ProjectAgentsPage />} />
                <Route path="new" element={<AgentConfigurePage />} />
                <Route path=":agentId">
                  <Route
                    index
                    element={
                      <ReactFlowProvider>
                        <ProjectWorkflowProvider>
                          <AgentChatPage />
                        </ProjectWorkflowProvider>
                      </ReactFlowProvider>
                    }
                  />

                  {/* CHAT w/ AGENT */}
                  <Route path="chat" element={<AgentChatPage />} />

                  {/* CONFIGURE AGENT */}
                  <Route path="configure" element={<AgentConfigurePage />} />

                  {/* TASKS */}
                  <Route path="tasks">
                    <Route
                      index
                      element={
                        //   This page will redirect to projects/:projectId/agents/:agentId
                        <AgentDetailsPage />
                      }
                    />
                    <Route
                      path=":taskId"
                      element={
                        <ReactFlowProvider>
                          <ProjectWorkflowProvider>
                            <AgentChatPage />
                          </ProjectWorkflowProvider>
                        </ReactFlowProvider>
                      }
                    />
                  </Route>
                </Route>
              </Route>
            </Route>
          </Route>

          {/* WORKFLOWS */}
          <Route path="/workflows">
            <Route index element={<WorkflowsPage />} />
            <Route path=":workflowId">
              <Route
                index
                element={
                  //   This page will redirect to projects/:projectId/workflows/:workflowId
                  <WorkflowDetailsPage />
                }
              />
            </Route>
          </Route>

          {/* AGENTS */}
          <Route path="/agents">
            <Route index element={<AgentsPage />} />
            <Route path=":agentId">
              <Route
                index
                element={
                  //   This page will redirect to projects/:projectId/agents/:agentId
                  <AgentDetailsPage />
                }
              />
            </Route>
          </Route>

          {/* TASKS */}
          <Route path="/tasks">
            <Route index element={<TasksPage />} />
            <Route path=":taskId">
              <Route
                index
                element={
                  //   This page will redirect to projects/:projectId/agents/:agentId/tasks/:taskId
                  <TaskDetailsPage />
                }
              />
            </Route>
          </Route>

          {/* CREDITS */}
          <Route path="/credits">
            <Route index element={<CreditsPage />} />
          </Route>

          {/* EXECUTIONS */}
          <Route path="/executions">
            <Route index element={<ExecutionsPage />} />
          </Route>

          {/* USERS */}
          <Route path="/team-members">
            <Route path="/team-members" element={<TeamMembersPage />} />
          </Route>

          {/* CONNECTIONS */}
          <Route path="/connections">
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route
              path="/connections/:connectionId"
              element={<ConnectionDetailsPage />}
            />
          </Route>

          {/* Knowledge */}
          <Route path="/knowledge">
            <Route index element={<KnowledgePage />} />
            <Route path=":knowledgeId" element={<KnowledgeDetailsPage />} />
          </Route>

          {/* VARIABLES */}
          <Route path="/variables">
            <Route index element={<VariablesPage />} />
            <Route path=":variableId" element={<div>TODO</div>} />
          </Route>

          {/* TEMPLATES */}
          <Route path="/workflow-templates">
            <Route index element={<WorkflowTemplatesPage />} />
            <Route path=":workflowTemplateId">
              <Route index element={<WorkflowTemplateDetailsPage />} />
            </Route>
          </Route>

          {/* APPS */}
          <Route path="/apps">
            <Route index element={<AppsPage />} />
            <Route path=":appId" element={<AppDetailsLayout />}>
              <Route index element={<AppDetailsOverview />} />
              <Route path="actions" element={<AppDetailsActions />} />
              <Route path="triggers" element={<AppDetailsTriggers />} />
              <Route path="connections" element={<AppDetailsConnections />} />
            </Route>
          </Route>

          {/* ASSETS */}
          <Route path="/assets">
            <Route path="/assets" element={<AssetsPage />} />
          </Route>

          {/* BILLING */}
          <Route path="/billing">
            <Route index element={<BillingPage />} />
          </Route>

          {/* SETTINGS */}
          <Route element={<SettingsPageLayout />}>
            <Route
              path="/workspace-user-account"
              element={<UserAccountPage />}
            />
            <Route
              path="/workspace-user-notification-preferences"
              element={<NotificationPreferencesPage />}
            />
            <Route
              path="/workspace-user-preferences"
              element={<UserPreferencesPage />}
            />
            <Route
              path="/workspace-invitations-received"
              element={<WorkspaceInvitationsReceivedPage />}
            />
          </Route>

          {/* WORKSPCE SETTINGS */}
          <Route element={<WorkspaceSettingsPageLayout />}>
            <Route
              path="/workspace-settings"
              element={<WorkspaceSettingsPage />}
            />
            <Route
              path="/workspace-notification-preferences"
              element={<WorkspaceNotificationPreferencesPage />}
            />
            <Route
              path="/workspace-preferences"
              element={<WorkspacePreferencesPage />}
            />
            <Route path="/workspace-agents" element={<WorkspaceAgentsPage />} />
            <Route path="/workspace-billing">
              <Route index element={<WorkspaceBillingPage />} />
            </Route>
            <Route
              path="/workspace-invitations"
              element={<WorkspaceInvitationsPage />}
            />
          </Route>
        </Route>

        <Route element={<OnboardingLayout />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/beta" element={<BetaPage />} />
          <Route
            path="successful-payment"
            element={<SuccessfulPaymentPage />}
          />
        </Route>

        <Route path="/logout" element={<LogoutPage />} />
      </Route>

      <Route path="/redirect" element={<RedirectPage />} />

      <Route path="/public">
        <Route path="apps" element={<PublicAppsPage />} />
      </Route>

      <Route path="*" element={<div>Not Found</div>} />
    </Routes>
  );
};
