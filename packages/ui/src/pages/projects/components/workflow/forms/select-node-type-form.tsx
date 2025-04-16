import { zodResolver } from '@hookform/resolvers/zod';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DropdownMenu } from '../../../../../components/ui/dropdown-menu';
import { Form } from '../../../../../components/ui/form';
import { Input } from '../../../../../components/ui/input';
import { ScrollArea } from '../../../../../components/ui/scroll-area';
import { useProjectWorkflow } from '../../../../../hooks/useProjectWorkflow';
import { WorkflowApp } from '../../../../../models/workflow/workflow-app-model';
import { cn } from '../../../../../utils/cn';

export function SelectNodeTypeForm({
  onSubmit,
  placeholderType,
  entity,
}: {
  onSubmit: (newNode: {
    appId: string;
    actionId?: string;
    triggerId?: string;
  }) => void;
  placeholderType: 'trigger' | 'action';
  entity: 'workflow' | 'agent';
}) {
  const { workflowApps } = useProjectWorkflow();
  const [
    workflowAppsWithAppNameAndIdOnActionsAndTriggers,
    setWorkflowAppsWithAppNameAndIdOnActionsAndTriggers,
  ] = useState<WorkflowApp[]>();
  const [searchQuery, setSearchQuery] = useState('');
  const [hideHackDiv, setHideHackDiv] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const firstSubTriggerRef = useRef<HTMLDivElement>(null);
  const searchResults = useMemo(() => {
    const flattenedTriggersAndActions =
      workflowAppsWithAppNameAndIdOnActionsAndTriggers
        ?.reduce(
          (acc, app) => {
            if (app.isPublished) {
              if (placeholderType === 'trigger') {
                return acc.concat(app.triggers ?? []);
              } else if (placeholderType === 'action') {
                return acc.concat(app.actions ?? []);
              } else {
                throw new Error(`Invalid placeholder type: ${placeholderType}`);
              }
            } else {
              return acc;
            }
          },
          [] as (WorkflowApp['triggers'] | WorkflowApp['actions'])[],
        )
        .flat();

    return (
      flattenedTriggersAndActions?.filter(
        (item) =>
          item.name
            .toLocaleLowerCase()
            .includes(searchQuery.toLocaleLowerCase()) ||
          (item as any).appName
            .toLocaleLowerCase()
            .includes(searchQuery.toLocaleLowerCase()),
      ) ?? []
    );
  }, [
    placeholderType,
    searchQuery,
    workflowAppsWithAppNameAndIdOnActionsAndTriggers,
  ]);

  const FormSchema = z.object({
    appId: z.string(),
    triggerOrActionId: z.string().min(1, {
      message: `${placeholderType === 'trigger' ? 'Trigger' : 'Action'} is required`,
    }),
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const handleSubmit = useCallback(() => {
    const data = form.getValues();
    return onSubmit({
      appId: data.appId,
      actionId:
        placeholderType === 'action' ? data.triggerOrActionId : undefined,
      triggerId:
        placeholderType === 'trigger' ? data.triggerOrActionId : undefined,
    });
  }, [form, onSubmit, placeholderType]);

  const filterApps = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
  }, []);

  const RenderCommonActionsForAppView = useMemo(() => {
    if (searchQuery === '') {
      if (placeholderType === 'action') {
        if (entity === 'agent') {
          const importantActionsMap: Record<string, Record<string, boolean>> = {
            'flow-control': { 'flow-control_action_run-workflow': true },
            ai: { 'ai_action_message-agent': true },
            knowledge: { 'knowledge_action_search-knowledge': true },
            web: { 'web_action_google-search': true },
          };

          const importantActions: any[] = [];
          workflowAppsWithAppNameAndIdOnActionsAndTriggers?.forEach((app) => {
            if (app.id in importantActionsMap) {
              app.actions.forEach((action) => {
                if (action.id in importantActionsMap[app.id]) {
                  importantActions.push(action);
                }
              });
            }
          });

          return (
            <div>
              <DropdownMenu.Label className="font-semibold text-xs">
                Popular
              </DropdownMenu.Label>
              {importantActions?.map((item: any) => {
                return (
                  <DropdownMenu.Item
                    key={item.id}
                    onClick={() => {
                      form.setValue('appId', item.appId, {
                        shouldValidate: true,
                      });
                      form.setValue('triggerOrActionId', item.id, {
                        shouldValidate: true,
                      });

                      handleSubmit();
                    }}
                  >
                    <div className="flex items-start space-x-2 p-1">
                      <img
                        src={item.iconUrl ?? item.appLogoUrl}
                        alt={item.name}
                        className="size-5 bg-white rounded p-0.5"
                      />
                      <div className="flex flex-col max-w-64 items-start space-y-1">
                        <span>{item.name}</span>

                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </div>
                  </DropdownMenu.Item>
                );
              })}

              <DropdownMenu.Separator />
            </div>
          );
        } else {
          const importantActionApps =
            workflowAppsWithAppNameAndIdOnActionsAndTriggers?.filter((app) => {
              return (
                app.id === 'flow-control' ||
                app.id === 'ai' ||
                app.id === 'web' ||
                app.id === 'knowledge'
              );
            });

          return (
            <div>
              <DropdownMenu.Label className="font-semibold text-xs">
                Popular
              </DropdownMenu.Label>
              {importantActionApps?.map((app) => {
                const items = app.actions;

                return (
                  <DropdownMenu.Sub key={app.id}>
                    <DropdownMenu.SubTrigger>
                      <div className="flex items-center space-x-2 py-1">
                        <img
                          src={app.logoUrl}
                          alt={app.name}
                          className="size-5 bg-white rounded p-0.5"
                        />
                        <span>{app.name}</span>
                      </div>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.SubContent>
                        {items && Object.entries(items)?.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-4 flex justify-center">
                            Coming soon.
                          </div>
                        ) : (
                          Object.entries(items!)?.map(([key, item]) => (
                            <DropdownMenu.Item
                              key={app.id + key}
                              onClick={() => {
                                form.setValue('appId', app.id, {
                                  shouldValidate: true,
                                });
                                form.setValue('triggerOrActionId', item.id, {
                                  shouldValidate: true,
                                });

                                handleSubmit();
                              }}
                            >
                              <div className="flex items-start space-x-2 p-1">
                                <img
                                  src={item.iconUrl ?? app.logoUrl}
                                  alt={app.name}
                                  className="size-5 bg-white rounded p-0.5"
                                />
                                <div className="flex flex-col max-w-64 items-start space-y-1">
                                  <span>{item.name}</span>

                                  <span className="text-xs text-muted-foreground">
                                    {item.description}
                                  </span>
                                </div>
                              </div>
                            </DropdownMenu.Item>
                          ))
                        )}
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Sub>
                );
              })}

              <DropdownMenu.Separator />
            </div>
          );
        }
      } else {
        const importantTriggers =
          workflowAppsWithAppNameAndIdOnActionsAndTriggers?.find((app) => {
            return app.id === 'flow-control';
          })?.triggers;

        return (
          <div>
            {importantTriggers?.map((item, index) => {
              return (
                <DropdownMenu.Item
                  key={item.id}
                  ref={index === 0 ? firstSubTriggerRef : null}
                  onClick={() => {
                    form.setValue('appId', (item as any).appId, {
                      shouldValidate: true,
                    });
                    form.setValue('triggerOrActionId', item.id, {
                      shouldValidate: true,
                    });

                    handleSubmit();
                  }}
                  className="py-2"
                >
                  <div className="flex items-start space-x-2">
                    <img
                      src={item.iconUrl}
                      alt={item.name}
                      className="size-5 bg-white rounded p-0.5"
                    />
                    <div className="flex flex-col max-w-64 items-start space-y-1">
                      <span>{item.name}</span>
                    </div>
                  </div>
                </DropdownMenu.Item>
              );
            })}
            <DropdownMenu.Separator />
          </div>
        );
      }
    } else {
      return null;
    }
  }, [
    entity,
    form,
    handleSubmit,
    placeholderType,
    searchQuery,
    workflowAppsWithAppNameAndIdOnActionsAndTriggers,
  ]);

  const RenderAppView = useMemo(() => {
    if (searchQuery === '') {
      return (
        <>
          <DropdownMenu.Label className="font-semibold text-xs">
            Apps
          </DropdownMenu.Label>
          <DropdownMenu.Group className="max-h-[calc(40dvh-135px)]">
            {workflowAppsWithAppNameAndIdOnActionsAndTriggers
              ?.filter((app) => app.id !== 'flow-control')
              ?.map((app) => {
                let items;
                if (placeholderType === 'trigger') {
                  items = app.triggers;
                } else if (placeholderType === 'action') {
                  items = app.actions;
                } else {
                  throw new Error(
                    `Invalid placeholder type: ${placeholderType}`,
                  );
                }

                return (
                  <DropdownMenu.Sub key={app.id}>
                    <DropdownMenu.SubTrigger>
                      <div className="flex items-center space-x-2 py-1">
                        <img
                          src={app.logoUrl}
                          alt={app.name}
                          className="size-5 bg-white rounded p-0.5"
                        />
                        <span>{app.name}</span>
                      </div>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.SubContent>
                        {items && Object.entries(items)?.length === 0 ? (
                          <div className="text-sm text-muted-foreground py-4 flex justify-center">
                            Coming soon.
                          </div>
                        ) : (
                          Object.entries(items!)?.map(([key, item]) => (
                            <DropdownMenu.Item
                              key={app.id + key}
                              onClick={() => {
                                form.setValue('appId', app.id, {
                                  shouldValidate: true,
                                });
                                form.setValue('triggerOrActionId', item.id, {
                                  shouldValidate: true,
                                });

                                handleSubmit();
                              }}
                            >
                              <div className="flex items-start space-x-2 p-1">
                                <img
                                  src={item.iconUrl ?? app.logoUrl}
                                  alt={item.name ?? app.name}
                                  className="size-5 bg-white rounded p-0.5"
                                />
                                <div className="flex flex-col max-w-64 items-start space-y-1">
                                  <span>{item.name}</span>

                                  <span className="text-xs text-muted-foreground">
                                    {item.description}
                                  </span>
                                </div>
                              </div>
                            </DropdownMenu.Item>
                          ))
                        )}
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Sub>
                );
              })}
          </DropdownMenu.Group>
        </>
      );
    } else {
      return null;
    }
  }, [
    form,
    handleSubmit,
    placeholderType,
    searchQuery,
    workflowAppsWithAppNameAndIdOnActionsAndTriggers,
  ]);

  const RenderSearchView = useMemo(() => {
    if (searchQuery !== '') {
      return (
        <DropdownMenu.Group className="max-h-[calc(50dvh-135px)]">
          {!searchResults?.length ? (
            <div className="py-4 flex justify-center text-muted-foreground text-sm">
              No results
            </div>
          ) : (
            searchResults?.map((item, index) => {
              return (
                <DropdownMenu.Item
                  key={item.id}
                  ref={index === 0 ? firstSubTriggerRef : null}
                  onClick={() => {
                    form.setValue('appId', (item as any).appId, {
                      shouldValidate: true,
                    });
                    form.setValue('triggerOrActionId', item.id, {
                      shouldValidate: true,
                    });

                    handleSubmit();
                  }}
                >
                  <div className="flex items-start space-x-2 p-1">
                    <img
                      src={(item as any).appLogoUrl}
                      alt={item.name}
                      className="size-5 bg-white rounded p-0.5"
                    />
                    <div className="flex flex-col max-w-64 items-start space-y-1">
                      <span>{item.name}</span>

                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    </div>
                  </div>
                </DropdownMenu.Item>
              );
            })
          )}
        </DropdownMenu.Group>
      );
    } else {
      return null;
    }
  }, [form, handleSubmit, searchQuery, searchResults]);

  useEffect(() => {
    if (workflowApps) {
      const apps = workflowApps
        .filter((app) => {
          if (entity === 'agent' && app.availableForAgent === false) {
            return false;
          } else if (!app.isPublished) {
            return false;
          } else if (placeholderType === 'trigger') {
            return app.triggers?.length;
          } else if (placeholderType === 'action') {
            return app.actions?.length;
          } else {
            return false;
          }
        })
        .map((app) => {
          const triggers = app.triggers?.map((trigger) => {
            return {
              ...trigger,
              appId: app.id,
              appName: app.name,
              appLogoUrl: app.logoUrl,
            };
          });
          const actions = app.actions?.map((action) => ({
            ...action,
            appId: app.id,
            appName: app.name,
            appLogoUrl: app.logoUrl,
          }));

          if (entity === 'agent') {
            return {
              ...app,
              triggers: triggers?.filter(
                (trigger) => trigger.availableForAgent,
              ),
              actions: actions?.filter((action) => action.availableForAgent),
            };
          } else {
            return {
              ...app,
              triggers,
              actions,
            };
          }
        });
      setWorkflowAppsWithAppNameAndIdOnActionsAndTriggers(apps);
    }
  }, [entity, placeholderType, workflowApps]);

  useEffect(() => {
    //When the popover opens, if the mouse is over a menu item, the focus causes the popover to automatically close.
    //So I'll put a transparent div to cover those elements until the popover is fully open.
    setTimeout(() => {
      setHideHackDiv(true);
    }, 300);
  }, []);

  return (
    <Form {...form}>
      <form className="relative">
        <div
          className={cn('w-full h-full absolute z-50', {
            hidden: hideHackDiv,
          })}
        ></div>
        <Form.Content className="p-0">
          <Form.Field
            control={form.control}
            name="triggerOrActionId"
            render={() => {
              return (
                <>
                  <DropdownMenu.Label className="px-1">
                    <Input
                      ref={inputRef}
                      placeholder="Search..."
                      className="mb-1 focus-visible:ring-0"
                      autoFocus
                      value={searchQuery}
                      onKeyDown={(e) => {
                        //Focus first item on these keys
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          firstSubTriggerRef.current?.focus();
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          firstSubTriggerRef.current?.focus();
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          firstSubTriggerRef.current?.focus();
                        }

                        e.stopPropagation();
                      }}
                      onChange={(e) => filterApps(e)}
                    />
                  </DropdownMenu.Label>
                  <ScrollArea>
                    {RenderCommonActionsForAppView}
                    {RenderAppView}
                    {RenderSearchView}
                  </ScrollArea>
                </>
              );
            }}
          />
        </Form.Content>
      </form>
    </Form>
  );
}
