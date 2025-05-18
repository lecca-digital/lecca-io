import React, { useMemo } from 'react';
import { Outlet, useParams } from 'react-router-dom';

import useApiQuery from '../../../api/use-api-query';
import PageLayout from '../../../components/layouts/page-layout';
import { PageSideNavLink } from '../../../components/layouts/page-side-nav';
import { Loader } from '../../../components/loaders/loader';
import { NavProjectSelector } from '../components/nav-selectors/nav-project-selector';

export function ProjectSettingsLayout() {
  const { projectId } = useParams();
  const { data: project, isLoading: isLoadingProject } = useApiQuery({
    service: 'projects',
    method: 'getById',
    apiLibraryArgs: {
      id: projectId!,
    },
  });

  const leftRailNavigationItems: React.ReactNode[] = useMemo(
    () => [
      <PageSideNavLink
        item={{ title: 'General', to: `/projects/${projectId}/settings` }}
      />,
      <PageSideNavLink
        item={{
          title: 'Users',
          to: `/projects/${projectId}/users`,
        }}
      />,
      <PageSideNavLink
        item={{ title: 'Agents', to: `/projects/${projectId}/agent-settings` }}
      />,
      <PageSideNavLink
        item={{
          title: 'Invitations',
          to: `/projects/${projectId}/invitations`,
        }}
      />,
    ],
    [projectId],
  );

  if (isLoadingProject) {
    return <Loader />;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <PageLayout
      title="Settings"
      breadcrumbs={[
        {
          label: 'Projects',
          href: '/projects',
        },
        {
          label: project.name,
          href: `/projects/${projectId}`,
          additionalButton: <NavProjectSelector />,
        },
      ]}
      leftRailNavigationItems={[...leftRailNavigationItems]}
    >
      <Outlet />
    </PageLayout>
  );
}
