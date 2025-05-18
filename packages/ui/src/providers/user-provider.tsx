/* eslint-disable @typescript-eslint/no-empty-function */
import React, { createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, appQueryClient } from '../api/api-library';
import { AiProviders } from '../models/ai-provider-model';
import { Features, defaultEnabledFeatures } from '../models/discovery-model';
import { User } from '../models/user-model';
import { Workspace } from '../models/workspace-model';
import { WorkspacePreferences } from '../models/workspace-preferences-model';
import { WorkspaceUser } from '../models/workspace-user-model';
import { WorkspaceUserPreferences } from '../models/workspace-user-preferences-model';

interface UserContextProps {
  enabledFeatures: Features;
  aiProviders: AiProviders;
  workspaceUser: WorkspaceUser | null | undefined;
  workspaceUserPreferences: WorkspaceUserPreferences | null | undefined;
  workspace: Workspace | null | undefined;
  workspacePreferences: WorkspacePreferences | null | undefined;
  isAuthenticated: boolean | undefined;
  setUser: (user: User) => void;
  setWorkspaceUser: (workspaceUser: WorkspaceUser | null) => void;
  setWorkspaceUserPreferences: (
    preferences: WorkspaceUserPreferences | null,
  ) => void;
  setWorkspace: (workspace: Workspace) => void;
  setWorkspacePreferences: (preferences: WorkspacePreferences) => void;
  initializeUserContextData: () => Promise<void>;
  isLoading: boolean;
  logout: () => void;
}

export const UserContext = createContext<UserContextProps>({
  //We'll only be using this user in authenticated routes anyway.
  //But to avoid any potential issues, we'll set it to a guest user.
  enabledFeatures: defaultEnabledFeatures,
  workspaceUser: null,
  workspaceUserPreferences: null,
  workspace: null,
  workspacePreferences: null,
  isAuthenticated: undefined,
  setUser: () => {},
  setWorkspaceUser: () => {},
  setWorkspaceUserPreferences: () => {},
  setWorkspace: () => {},
  setWorkspacePreferences: () => {},
  initializeUserContextData: async () => {},
  isLoading: true,
  logout: () => {},
  aiProviders: {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  //AI Providers from enabledFeatures, but formatted for easier access
  const [aiProviders, setAiProviders] = useState<AiProviders>({});

  //Features
  const [enabledFeatures, setEnabledFeatures] = useState<Features>(
    defaultEnabledFeatures,
  );

  //WorkspaceUser context
  const [workspaceUserContext, setWorkspaceUserContext] = useState<
    WorkspaceUser | null | undefined
  >(undefined);

  //WorkspaceUser preferences context
  const [workspaceUserPreferencesContext, setWorkspaceUserPreferencesContext] =
    useState<WorkspaceUserPreferences | null | undefined>(undefined);

  //Workspace context
  const [workspaceContext, setWorkspaceContext] = useState<
    Workspace | null | undefined
  >(undefined);

  //Workspace preferences context
  const [workspacePreferencesContext, setWorkspacePreferencesContext] =
    useState<WorkspacePreferences | null | undefined>(undefined);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | undefined>();

  const setWorkspaceUser = (workspaceUser: WorkspaceUser | null) => {
    setWorkspaceUserContext(workspaceUser);
    if (workspaceUser) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  };

  const setUser = (user: User) => {
    //Should only be used when updating user properties like name.
    if (workspaceUserContext) {
      workspaceUserContext.user = user;
      setWorkspaceUserContext(workspaceUserContext);
    }
  };

  const setWorkspaceUserPreferences = (
    preferences: WorkspaceUserPreferences | null,
  ) => {
    setWorkspaceUserPreferencesContext(preferences);
  };

  const setWorkspace = (workspace: Workspace | null) => {
    setWorkspaceContext(workspace);
  };

  const setWorkspacePreferences = (
    preferences: WorkspacePreferences | null,
  ) => {
    setWorkspacePreferencesContext(preferences);
  };

  const logout = React.useCallback(() => {
    setEnabledFeatures(defaultEnabledFeatures);
    setWorkspaceUserContext(null);
    setWorkspaceUserPreferencesContext(null);
    setIsAuthenticated(false);
    navigate('/welcome', { replace: true });
    setIsLoading(false);
    appQueryClient.cancelQueries();
    appQueryClient.removeQueries();

    window.localStorage.clear();
  }, [navigate]);

  const initializeUserContextData = async () => {
    //We want to reset react query cache
    appQueryClient.cancelQueries();
    appQueryClient.removeQueries();

    if (!window.localStorage.getItem('accessToken')) {
      if (import.meta.env.VITE_MOCK_API_CALLS === 'true') {
        window.localStorage.setItem(
          'accessToken',
          'some-mock-token-for-development',
        );
      } else {
        setIsLoading(false);
        return;
      }
    }

    const [
      { data: enabledFeaturesResponse },
      { data: userResponse },
      { data: workspaceResponse },
      { data: userPreferencesResponse },
      { data: workspacePreferencesResponse },
    ] = await Promise.all([
      api.discovery.getEnabledWorkspaceFeatures(),
      api.workspaceUsers.getMe(),
      api.workspaces.getMe(),
      api.workspaceUserPreferences.getMe(),
      api.workspacePreferences.getMe(),
    ]);

    if (userResponse && userPreferencesResponse) {
      window.localStorage.setItem('userId', userResponse.id);
      setWorkspaceUser(userResponse);
      setWorkspaceUserPreferences(userPreferencesResponse);
    } else {
      //Toast error?
      logout();
    }

    if (workspaceResponse && workspacePreferencesResponse) {
      window.localStorage.setItem('workspaceId', workspaceResponse.id);
      setWorkspace(workspaceResponse);
      setWorkspacePreferences(workspacePreferencesResponse);
    } else {
      //Redirect to workspace creation page? Or with the route guards redirect?
    }

    if (enabledFeaturesResponse) {
      setEnabledFeatures(enabledFeaturesResponse);
      setAiProviders(enabledFeaturesResponse.AI);
    }

    if (isLoading) {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    initializeUserContextData(); //Fetches data for initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    //Apply dark theme to body
    if (import.meta.env.VITE_MOCK_API_CALLS !== 'true') {
      if (!workspaceUserPreferencesContext) {
        /**
         * If the user preferences haven't been loaded yet, we'll check local storage.
         * If there are no preferences in local storage, we'll check the user's system preferences.
         * Doing this to prevent flickering when the user preferences are loaded.
         */
        if (window.localStorage.getItem('userPreferences')) {
          const theme = window.localStorage.getItem('userPreferences');
          theme === 'DARK'
            ? document.body.classList.add('dark')
            : document.body.classList.remove('dark');
        } else {
          const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
          prefersDarkMode
            ? document.body.classList.add('dark')
            : document.body.classList.remove('dark');
        }
      } else if (workspaceUserPreferencesContext.theme === 'DARK') {
        document.body.classList.add('dark');
      } else if (workspaceUserPreferencesContext.theme === 'LIGHT') {
        document.body.classList.remove('dark');
      } else {
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        prefersDarkMode
          ? document.body.classList.add('dark')
          : document.body.classList.remove('dark');
      }
    } else {
      //If we're using mock data, we'll just check the user's system preferences.
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersDarkMode
        ? document.body.classList.add('dark')
        : document.body.classList.remove('dark');
    }
  }, [workspaceUserPreferencesContext, workspaceUserPreferencesContext?.theme]);

  return (
    <UserContext.Provider
      value={{
        isLoading,
        enabledFeatures,
        workspaceUser: workspaceUserContext,
        workspaceUserPreferences: workspaceUserPreferencesContext,
        workspace: workspaceContext,
        workspacePreferences: workspacePreferencesContext,
        aiProviders,
        setWorkspaceUser: setWorkspaceUser,
        setWorkspaceUserPreferences: setWorkspaceUserPreferences,
        setUser: setUser,
        setWorkspace,
        setWorkspacePreferences,
        isAuthenticated,
        initializeUserContextData,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
