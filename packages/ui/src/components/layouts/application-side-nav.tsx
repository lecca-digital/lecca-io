import { IconProps } from '@radix-ui/react-icons/dist/types';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import useApiMutation from '../../api/use-api-mutation';
import { useApplicationSideNav } from '../../hooks/useApplicationSideNav';
import { useUser } from '../../hooks/useUser';
import { Theme } from '../../models/workspace-user-preferences-model';
import { cn } from '../../utils/cn';
import { Icons } from '../icons';
import { useOnborda } from '../onboarda/OnbordaContext';
import { Avatar } from '../ui/avatar';
import { buttonVariants } from '../ui/button';
import { DropdownMenu } from '../ui/dropdown-menu';
import { ResizablePanel } from '../ui/resizable';
import { Select } from '../ui/select';
import { Separator } from '../ui/separator';
import { Sheet } from '../ui/sheet';
import { Tooltip } from '../ui/tooltip';

import WorkspaceSelector from './workspace-selector';

export function ApplicationSideNav() {
  const { agentId } = useParams();
  const { isCollapsed } = useApplicationSideNav();
  const { startOnborda } = useOnborda();
  const { workspaceUser } = useUser();
  const location = useLocation();
  const [
    alreadyShowedApplicationOverview,
    setAlreadyShowedApplicationOverview,
  ] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      if (
        !alreadyShowedApplicationOverview &&
        window.innerWidth > 700 &&
        !workspaceUser?.user?.toursCompleted?.includes('application-overview')
      ) {
        //Sometimes we go straight from onboarding straight to agents page.
        //In that case we don't want to show the onboarding for the application overview
        if (!location.pathname.includes('/agents')) {
          setAlreadyShowedApplicationOverview(true);
          startOnborda('application-overview');
        }
      }
    }, 1000);
  }, [
    alreadyShowedApplicationOverview,
    location.pathname,
    startOnborda,
    workspaceUser?.user?.toursCompleted,
  ]);

  return (
    <ResizablePanel
      collapsible={true}
      className={cn(
        'transition-all duration-500 ease-in-out hidden sm:flex flex-col justify-between min-w-[50px] bg-popover',
        `${isCollapsed ? 'max-w-[50px]' : 'max-w-[245px]'} `,
        {
          '!hidden': agentId,
        },
      )}
    >
      <div>
        <div className="flex items-center px-4 sm:px-2 pb-1.5 pt-3">
          <WorkspaceSelector
            className="hidden sm:flex"
            isCollapsed={isCollapsed}
          />
        </div>
        <MainSideNavContent isCollapsed={isCollapsed} />
      </div>
      <div>
        <Credits isCollapsed={isCollapsed} />
        <div className="mb-2">
          <UserSettings isCollapsed={isCollapsed} />
        </div>
        <Separator />
        <AdditionalSideNavContent isCollapsed={isCollapsed} />
      </div>
    </ResizablePanel>
  );
}

export function MainSideNavContent({
  isCollapsed,
  isSheet,
  isOnAgentSideNav,
}: {
  isCollapsed: boolean;
  isSheet?: boolean;
  /**
   * Used to hide certain side nav links
   * on the agent page to prevent too much clutter
   */
  isOnAgentSideNav?: boolean;
}) {
  const { enabledFeatures } = useUser();

  return (
    <>
      <div className="mx-2 my-1">
        <WorkspaceSelector
          isCollapsed={isCollapsed}
          className="flex sm:hidden"
        />
      </div>
      <Nav
        isCollapsed={isCollapsed}
        isSheet={isSheet}
        links={
          [
            isOnAgentSideNav
              ? null
              : {
                  title: 'Projects',
                  to: '/projects',
                  icon: Icons.project,
                  idSelector: 'onboarding-step2',
                },
            !enabledFeatures.AGENTS
              ? null
              : {
                  title: 'Agents',
                  to: '/agents',
                  icon: Icons.agent,
                  idSelector: 'onboarding-step3',
                },
            !enabledFeatures.WORKFLOWS
              ? null
              : {
                  title: 'Workflows',
                  to: '/workflows',
                  icon: Icons.workflow,
                  idSelector: 'onboarding-step4',
                },
            !enabledFeatures.KNOWLEDGE
              ? null
              : {
                  title: 'Knowledge',
                  to: '/knowledge',
                  icon: Icons.knowledge,
                  idSelector: 'onboarding-step5',
                },
            !enabledFeatures.CONNECTIONS || isOnAgentSideNav
              ? null
              : {
                  title: 'Connections',
                  to: '/connections',
                  icon: Icons.link,
                  idSelector: 'onboarding-step6',
                },
            !enabledFeatures.VARIABLES || isOnAgentSideNav
              ? null
              : {
                  title: 'Variables',
                  to: '/variables',
                  icon: Icons.braces,
                  idSelector: 'onboarding-step7',
                },
            !enabledFeatures.AGENTS
              ? null
              : {
                  title: 'Conversations',
                  to: '/tasks',
                  icon: Icons.chat,
                  idSelector: 'onboarding-step8',
                },
            !enabledFeatures.WORKFLOWS || isOnAgentSideNav
              ? null
              : {
                  title: 'Executions',
                  to: '/executions',
                  icon: Icons.executions,
                  idSelector: 'onboarding-step9',
                },
            isOnAgentSideNav
              ? null
              : {
                  title: 'Team',
                  to: '/team-members',
                  icon: Icons.users,
                  idSelector: 'onboarding-step10',
                },
            !enabledFeatures.CONNECTIONS || isOnAgentSideNav
              ? null
              : {
                  title: 'Apps',
                  to: '/apps',
                  icon: Icons.app,
                  idSelector: 'onboarding-step11',
                },
            isOnAgentSideNav
              ? null
              : {
                  title: 'Templates',
                  to: '/workflow-templates',
                  icon: Icons.templates,
                  idSelector: 'onboarding-step12',
                },
            !enabledFeatures.BILLING || isOnAgentSideNav
              ? null
              : {
                  title: 'Credit Usage',
                  to: '/credits',
                  icon: Icons.creditCard,
                  idSelector: 'onboarding-step13',
                },
          ].filter(Boolean) as any
        }
      />
    </>
  );
}

export function AdditionalSideNavContent({
  isCollapsed,
  isSheet,
}: {
  isCollapsed: boolean;
  isSheet?: boolean;
}) {
  return (
    <Nav
      isCollapsed={isCollapsed}
      isSheet={isSheet}
      links={[
        {
          title: 'Docs',
          to: 'https://lecca.io/docs/overview',
          newTab: true,
          icon: (props: any) => (
            <img
              src="/icons/lecca-digital.png"
              alt="Lecca Digital"
              style={{
                backgroundColor: 'white',
                borderRadius: '50%',
                padding: '.5px',
              }}
              {...props}
            />
          ),
        },
        {
          title: 'Settings',
          to: '/workspace-user-account',
          icon: Icons.gear,
        },
      ]}
    />
  );
}

export function Credits({ isCollapsed }: { isCollapsed: boolean }) {
  const navigate = useNavigate();
  const { workspace, workspaceUser, enabledFeatures } = useUser();

  const shouldShowManagePlanButton = useMemo(() => {
    if (!workspaceUser?.roles.includes('MAINTAINER')) {
      return false;
    } else if (workspace?.billing?.planType === 'free' || !workspace?.billing) {
      return true;
    } else if (workspace?.billing?.status === 'canceled') {
      return true;
    } else if (workspace?.billing?.status === 'unpaid') {
      return true;
    }

    return false;

    // return true;
  }, [workspace?.billing, workspaceUser?.roles]);

  const creditsRemaining = useMemo(() => {
    let credits = 0;

    if (workspace?.usage) {
      credits =
        workspace.usage.allottedCredits + workspace.usage.purchasedCredits;
    }

    return credits;
  }, [workspace?.usage]);

  return enabledFeatures.BILLING ? (
    <div
      className={cn('flex flex-col px-2 mb-2 space-y-3', {
        hidden: isCollapsed,
      })}
    >
      <div
        className={cn('flex items-center justify-between px-3 py-1 group', {
          'cursor-pointer rounded hover:bg-muted': shouldShowManagePlanButton,
        })}
        onClick={() => {
          if (shouldShowManagePlanButton) {
            navigate('/workspace-billing');
          }
        }}
      >
        <div className="flex items-center space-x-2">
          <Icons.creditCard className="size-6 border rounded-full p-1" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground">Credits</span>
            <span className="text-xs font-semibold">
              {creditsRemaining.toLocaleString()}
            </span>
          </div>
        </div>
        {shouldShowManagePlanButton && (
          <Icons.chevronRight className="hidden group-hover:block" />
        )}
      </div>
    </div>
  ) : null;
}

export function UserSettings({
  isCollapsed,
  className,
}: {
  isCollapsed: boolean;
  className?: string;
}) {
  const {
    workspaceUser,
    workspaceUserPreferences,
    setWorkspaceUserPreferences,
  } = useUser();
  const mutation = useApiMutation({
    service: 'workspaceUserPreferences',
    method: 'updateMe',
  });

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        className={cn('flex flex-col px-2 space-y-3 w-full group')}
      >
        <div
          className={cn(
            'flex items-center justify-between px-3 py-1 w-full group-hover:bg-muted rounded cursor-pointer',
            {
              'px-1.5': isCollapsed,
            },
          )}
        >
          <div className="flex items-center space-x-2">
            <Avatar className={cn('size-6 border', className)}>
              <Avatar.Image
                src={workspaceUser?.profileImageUrl ?? undefined}
                alt="User Profile Image"
              />
              <Avatar.Fallback>
                {workspaceUser?.user?.name![0].toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
            <div
              className={cn('flex flex-col', {
                hidden: isCollapsed,
              })}
            >
              <span className="text-xs font-semibold">
                {workspaceUser?.user?.name}
              </span>
            </div>
          </div>
        </div>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="w-56"
        align="end"
        forceMount
        side={'right'}
      >
        <DropdownMenu.Label className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {workspaceUser?.user?.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {workspaceUser?.user?.email}
            </p>
          </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <Link to="/workspace-user-account">
            <DropdownMenu.Item>Account</DropdownMenu.Item>
          </Link>
          {workspaceUser?.roles?.includes('MAINTAINER') && (
            <Link to="/workspace-settings">
              <DropdownMenu.Item>Workspace</DropdownMenu.Item>
            </Link>
          )}
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Group className="p-1">
          <Select
            value={workspaceUserPreferences?.theme ?? 'SYSTEM'}
            onValueChange={(value) => {
              setWorkspaceUserPreferences({
                theme: value as Theme,
                workflowOrientation:
                  workspaceUserPreferences?.workflowOrientation ?? 'HORIZONTAL',
              });

              mutation.mutate({
                data: {
                  theme: value as Theme,
                },
              });
            }}
          >
            <Select.Trigger>
              <div className="flex space-x-2 items-center">
                {
                  {
                    LIGHT: <Icons.lightMode className="size-4" />,
                    DARK: <Icons.darkMode className="size-4" />,
                    SYSTEM: <Icons.systemMode className="size-4" />,
                  }[workspaceUserPreferences?.theme ?? 'SYSTEM']
                }
                <Select.Value placeholder="Theme" />
              </div>
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="LIGHT">Light</Select.Item>
              <Select.Item value="DARK">Dark</Select.Item>
              <Select.Item value="SYSTEM">System</Select.Item>
            </Select.Content>
          </Select>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <Link to="/logout">
          <DropdownMenu.Item>
            Logout
            <DropdownMenu.Shortcut>{<Icons.exit />}</DropdownMenu.Shortcut>
          </DropdownMenu.Item>
        </Link>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

interface NavProps {
  isCollapsed: boolean;
  isSheet?: boolean;
  links: {
    title: string;
    label?: string;
    newTab?: boolean;
    idSelector?: string;
    icon: (props: IconProps) => React.JSX.Element;
    to: string;
    dropdownMenuContent?: React.ReactNode;
  }[];
  className?: string;
}

export function Nav({ links, isCollapsed, isSheet, className }: NavProps) {
  const location = useLocation();

  return (
    <div
      data-collapsed={isCollapsed}
      className="flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
    >
      <nav className={cn('grid px-2', className)}>
        {links.map((link, index) => {
          const linkComponent = isCollapsed ? (
            <Tooltip key={index} delayDuration={0}>
              <Tooltip.Trigger asChild>
                <Link
                  id={link.idSelector}
                  to={link.to}
                  target={link.newTab ? '_blank' : undefined}
                  className={cn(
                    buttonVariants({
                      variant: 'ghost',
                      size: 'icon',
                    }),
                    'size-8 my-0.5',
                    {
                      'bg-muted': location.pathname === link.to,
                    },
                    {
                      'text-muted-foreground': location.pathname !== link.to,
                    },
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  <span className="sr-only">{link.title}</span>
                </Link>
              </Tooltip.Trigger>
              <Tooltip.Content side="right" className="flex items-center gap-4">
                {link.title}
                {link.label && (
                  <span className="ml-auto text-muted-foreground">
                    {link.label}
                  </span>
                )}
              </Tooltip.Content>
            </Tooltip>
          ) : (
            <Link
              key={index}
              to={link.to}
              id={link.idSelector}
              target={link.newTab ? '_blank' : undefined}
              className={cn(
                'relative group',
                buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                }),
                {
                  'bg-muted': location.pathname === link.to,
                },
                {
                  'text-muted-foreground': location.pathname !== link.to,
                },
                'justify-start py-4 my-0.5',
              )}
            >
              <link.icon className="mr-2 h-4 w-4" />
              {link.title}
              {link.dropdownMenuContent && (
                <DropdownMenu>
                  <DropdownMenu.Trigger
                    className={cn(
                      'absolute bg-muted right-2 invisible group-hover:visible flex ml-auto items-center justify-center h-full w-8 rounded-r-md',
                    )}
                  >
                    <Icons.dotsHorizontal className="h-4 w-4" />
                  </DropdownMenu.Trigger>
                  {link.dropdownMenuContent}
                </DropdownMenu>
              )}
              {link.newTab && (
                <Icons.externalLink className="absolute right-0 top-0 h-4 w-4 mr-2 mt-2" />
              )}
            </Link>
          );

          return isSheet ? (
            <Sheet.Close asChild key={index}>
              {linkComponent}
            </Sheet.Close>
          ) : (
            linkComponent
          );
        })}
      </nav>
    </div>
  );
}
