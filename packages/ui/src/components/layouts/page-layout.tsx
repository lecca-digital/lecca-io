import React from 'react';

import { cn } from '../../utils/cn';
import { ScrollArea } from '../ui/scroll-area';

import PageNav, { Breadcrumbs } from './page-nav';
import { PageSideNav } from './page-side-nav';

export default function PageLayout({
  title,
  titleButton,
  editableTitleDefaultValue,
  onTitleChange,
  subtitle,
  defaultIsEditingTitle,
  breadcrumbs,
  actions,
  leftRailNavigationItems,
  children,
  className,
  wrapperClassName,
  noHeader,
}: {
  title?: string;
  titleButton?: React.ReactNode;
  editableTitleDefaultValue?: string;
  onTitleChange?: (title: string) => void;
  subtitle?: string;
  defaultIsEditingTitle?: boolean;
  breadcrumbs?: Breadcrumbs;
  actions?: React.ReactNode[];
  leftRailNavigationItems?: React.ReactNode[];
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  noHeader?: boolean;
}) {
  const hasLeftRailNavigation = leftRailNavigationItems?.length;

  return (
    <div className={cn('flex flex-col h-full relative', wrapperClassName)}>
      {!noHeader && (
        <PageNav
          title={title}
          titleButton={titleButton}
          editableTitleDefaultValue={editableTitleDefaultValue}
          onTitleChange={onTitleChange}
          defaultIsEditingTitle={defaultIsEditingTitle}
          subtitle={subtitle}
          actions={actions}
          breadcrumbs={breadcrumbs}
        />
      )}
      {hasLeftRailNavigation ? (
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0 h-full w-full">
          <aside className="lg:w-1/5 p-4">
            <PageSideNav items={leftRailNavigationItems} />
          </aside>
          <div className="flex-1 lg:max-w-4xl w-full px-4">{children}</div>
        </div>
      ) : (
        <ScrollArea>
          <div className={cn('p-2 sm:py-2 sm:px-4', className)}>{children}</div>
        </ScrollArea>
      )}
    </div>
  );
}
