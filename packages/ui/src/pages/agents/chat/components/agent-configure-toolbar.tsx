import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactFlow, { NodeProps, useReactFlow } from 'reactflow';
import { v4 } from 'uuid';

import useApiMutation from '../../../../api/use-api-mutation';
import useApiQuery from '../../../../api/use-api-query';
import { Icons } from '../../../../components/icons';
import { Accordion } from '../../../../components/ui/accordion';
import { Button } from '../../../../components/ui/button';
import { DropdownMenu } from '../../../../components/ui/dropdown-menu';
import { Tooltip } from '../../../../components/ui/tooltip';
import { useProjectWorkflow } from '../../../../hooks/useProjectWorkflow';
import { useToast } from '../../../../hooks/useToast';
import { Agent } from '../../../../models/agent/agent-model';
import { AgentTrigger } from '../../../../models/agent/agent-trigger-model';
import {
  SavedActionNode,
  SavedTriggerNode,
} from '../../../../models/workflow/node/node-model';
import { WorkflowApp } from '../../../../models/workflow/workflow-app-model';
import actionNode from '../../../../pages/projects/components/workflow/nodes/action-node/action-node';
import placeholderNode from '../../../../pages/projects/components/workflow/nodes/placeholder-node/placeholder-node';
import { cn } from '../../../../utils/cn';
import { SelectNodeTypeForm } from '../../../projects/components/workflow/forms/select-node-type-form';
import { WorkflowNodePopover } from '../../../projects/components/workflow/nodes/action-node/action-node-popover';
import {
  formatNodesForSaving,
  loadNodesFromSavedState,
  setActionNodeData,
  setTriggerNodeData,
} from '../../../projects/components/workflow/nodes/node-utils';
import { AgentBuilderAdvancedSettingsContent } from '../../configure/agent-builder-advanced-settings-content';

type AgentConfigureToolbarProps = {
  projectId: string;
  agentId: string;
  className?: string;
  selectorContentSide: 'right' | 'top';
  mode: 'welcome' | 'chat';
};

export function AgentConfigureToolbar({
  agentId,
  projectId,
  className,
  selectorContentSide,
  mode,
}: AgentConfigureToolbarProps) {
  const { setSaveAgent, setIsSaving } = useProjectWorkflow();
  const { getNodes, setNodes } = useReactFlow();
  const { mappedWorkflowApps: apps } = useProjectWorkflow();
  const { data: agent } = useApiQuery({
    service: 'agents',
    method: 'getById',
    apiLibraryArgs: {
      id: agentId,
    },
  });

  const updateAgentMutation = useApiMutation({
    service: 'agents',
    method: 'update',
  });

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    const nodes = getNodes();
    const tools = (formatNodesForSaving(nodes) as SavedActionNode[]).filter(
      (n) => n.actionId,
    );

    const triggerNodes = (
      formatNodesForSaving(nodes) as SavedTriggerNode[]
    ).filter((n) => n.triggerId);

    const existingTriggerNodeIds: {
      triggerNodeId: string;
      agentTriggerId: string;
    }[] = [];

    agent?.triggers?.forEach((t) => {
      existingTriggerNodeIds.push({
        triggerNodeId: t.node.id,
        agentTriggerId: t.id!,
      });
    });
    const combinedTriggers: AgentTrigger[] = [];

    triggerNodes.forEach((t) => {
      const match = existingTriggerNodeIds.find(
        (val) => val.triggerNodeId === t.id,
      );

      if (!match) {
        combinedTriggers.push({
          id: undefined, //Make sure to leave id empty, so the server knows it's new
          node: t,
        });
      } else {
        combinedTriggers.push({
          id: match.agentTriggerId,
          node: t,
        });
      }
    });

    return await updateAgentMutation.mutateAsync(
      {
        id: agentId,
        data: {
          tools,
          triggers: combinedTriggers,
        },
      },
      {
        onSuccess: () => {
          //WE NEED TO ADD THE Agent trigger id to the node I think? I thought invalidating would do taht.
        },
        onSettled: () => {
          setIsSaving(false);
        },
      },
    );
    //   //Can't put updateAgentMutation or there is infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.triggers, agentId, getNodes, setIsSaving]);

  useEffect(() => {
    setSaveAgent(() => handleSave);
  }, [handleSave, setSaveAgent]);

  useEffect(() => {
    if (agent && apps) {
      const actionNodesForReactflow = agent.tools?.map((n) => {
        const loadedData = loadNodesFromSavedState({
          savedNodes: [n],
          apps,
          savedEdges: [],
        });

        return loadedData.nodes[0];
      });

      const triggerNodesForReactflow = agent.triggers?.map((trigger) => {
        const loadedData = loadNodesFromSavedState({
          savedNodes: [trigger.node],
          apps,
          savedEdges: [],
        });

        return loadedData.nodes[0];
      });

      setNodes([
        ...(actionNodesForReactflow ?? []),
        ...(triggerNodesForReactflow ?? []),
      ]);
    }
  }, [agent, apps, setNodes]);

  const nodeTypes = useMemo(
    () => ({
      placeholder: placeholderNode,
      action: actionNode,
      trigger: actionNode, //There's no big difference, so we'll keep them the same
    }),
    [],
  );
  const edgeTypes = useMemo(() => ({}), []);

  if (!agent || !apps) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <ReactFlow
        defaultNodes={[]}
        defaultEdges={[]}
        fitView
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        className="hidden"
      />
      <div className="flex gap-2 flex-wrap pb-3">
        <ToolsDropdown
          agent={agent}
          projectId={projectId}
          apps={apps}
          selectorContentSide={selectorContentSide}
        />
        {mode === 'welcome' && (
          <TriggersDropdown
            agent={agent}
            projectId={projectId}
            apps={apps}
            selectorContentSide={selectorContentSide}
          />
        )}
      </div>
      {mode === 'welcome' && (
        <LegacyToolConfigureLink agent={agent} projectId={projectId} />
      )}
      {mode === 'welcome' && <AdvancedSettingsDropdown agent={agent} />}
    </div>
  );
}

function ToolsDropdown({
  agent,
  projectId,
  apps,
  selectorContentSide,
}: {
  agent: Agent;
  projectId: string;
  apps: Record<string, WorkflowApp>;
  selectorContentSide: 'right' | 'top';
}) {
  const { setNodes, getNodes } = useReactFlow();
  const { saveAgent } = useProjectWorkflow();
  const { toast } = useToast();
  const [defaultOpen, setDefaultOpen] = useState(false);

  const handleAddActionTool = (values: {
    appId: string;
    actionId?: string;
    triggerId?: string;
  }) => {
    const app = apps?.[values.appId];
    if (!app) {
      toast({
        title: 'App not found',
        variant: 'destructive',
      });
      return;
    } else {
      const workflowAction = app.actions.find((a) => a.id === values.actionId);
      if (!workflowAction) {
        toast({
          title: 'Action not found',
          variant: 'destructive',
        });
        return;
      } else {
        const actionToolNode = setActionNodeData({
          node: {
            id: v4(),
            position: { x: 0, y: 0 },
            data: {},
          },
          workflowAction,
          workflowApp: app,
          clearOutput: true,
          clearValue: true,
        });

        setNodes((prevNodes) => [...prevNodes, actionToolNode]);
        saveAgent?.();
      }
    }
  };

  const tools = (formatNodesForSaving(getNodes()) as SavedActionNode[]).filter(
    (n) => n.actionId,
  );

  useEffect(() => {
    //Set's it to false when switching between agents.
    //there was a bug where if you switched between agents, it auto opened all the tools.
    setDefaultOpen(false);

    setTimeout(() => {
      setDefaultOpen(true);
    }, 100);
  }, [agent.id]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            className="space-x-2"
            id="onboarding-agents-overview-tool"
          >
            <span>Tools</span>
            <Icons.plus className="size-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          side={selectorContentSide}
          sideOffset={6}
          className="min-w-[324px]"
        >
          <SelectNodeTypeForm
            onSubmit={handleAddActionTool}
            placeholderType="action"
            entity="agent"
          />
        </DropdownMenu.Content>
      </DropdownMenu>
      {tools?.map((tool) => {
        return (
          <AgentActionButton
            key={tool.id}
            agent={agent}
            apps={apps}
            projectId={projectId}
            tool={tool}
            defaultOpen={defaultOpen}
          />
        );
      })}
    </>
  );
}

function TriggersDropdown({
  agent,
  projectId,
  apps,
  selectorContentSide,
}: {
  agent: Agent;
  projectId: string;
  apps: Record<string, WorkflowApp>;
  selectorContentSide: 'right' | 'top';
}) {
  const { setNodes, getNodes } = useReactFlow();
  const { saveAgent } = useProjectWorkflow();
  const { toast } = useToast();
  const [defaultOpen, setDefaultOpen] = useState(false);

  const handleAddTrigger = (values: {
    appId: string;
    actionId?: string;
    triggerId?: string;
  }) => {
    const app = apps?.[values.appId];
    if (!app) {
      toast({
        title: 'App not found',
        variant: 'destructive',
      });
      return;
    } else {
      const workflowTrigger = app.triggers.find(
        (a) => a.id === values.triggerId,
      );

      if (!workflowTrigger) {
        toast({
          title: 'Trigger not found',
          variant: 'destructive',
        });
        return;
      } else {
        const triggerNode = setTriggerNodeData({
          node: {
            id: v4(),
            position: { x: 0, y: 0 },
            data: {},
          },
          workflowTrigger,
          workflowApp: app,
          clearOutput: true,
          clearValue: true,
        });

        setNodes((prevNodes) => [triggerNode, ...prevNodes]);
        saveAgent?.();
      }
    }
  };

  const triggers = (
    formatNodesForSaving(getNodes()) as SavedTriggerNode[]
  ).filter((n) => n.triggerId);

  useEffect(() => {
    setTimeout(() => {
      setDefaultOpen(true);
    }, 100);
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            className="space-x-2"
            id="onboarding-agents-overview-trigger"
          >
            <span>Triggers</span>
            <Icons.plus className="size-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          side={selectorContentSide}
          sideOffset={6}
          className="min-w-[324px]"
        >
          <SelectNodeTypeForm
            onSubmit={handleAddTrigger}
            placeholderType="trigger"
            entity="agent"
          />
        </DropdownMenu.Content>
      </DropdownMenu>
      {triggers?.map((trigger) => {
        return (
          <AgentTriggerButton
            key={trigger.id}
            agent={agent}
            apps={apps}
            projectId={projectId}
            trigger={trigger}
            defaultOpen={defaultOpen}
          />
        );
      })}
    </>
  );
}

function LegacyToolConfigureLink({
  agent,
  projectId,
}: {
  agent: Agent;
  projectId: string;
}) {
  const hasLegacyTools = useMemo(() => {
    if (
      agent.agentActions?.length ||
      agent.agentActions?.length ||
      agent.agentKnowledge?.length ||
      agent.agentSubAgents?.length ||
      agent.agentVariables?.length ||
      agent.agentWorkflows?.length ||
      agent.agentWebAccess?.webSearchEnabled ||
      agent.agentWebAccess?.websiteAccessEnabled ||
      agent.agentPhoneAccess?.outboundCallsEnabled
    ) {
      return true;
    } else {
      return false;
    }
  }, [
    agent.agentActions?.length,
    agent.agentKnowledge?.length,
    agent.agentPhoneAccess?.outboundCallsEnabled,
    agent.agentSubAgents?.length,
    agent.agentVariables?.length,
    agent.agentWebAccess?.webSearchEnabled,
    agent.agentWebAccess?.websiteAccessEnabled,
    agent.agentWorkflows?.length,
  ]);

  if (!hasLegacyTools) {
    return null;
  } else {
    return (
      <div className="flex justify-center pt-20">
        <Link to={`/projects/${projectId}/agents/${agent.id}/configure`}>
          <Button variant="ghost" className="space-x-2 animate-pulse">
            <span>
              Please remove all legacy tools and start using the new tools
            </span>
            <Icons.chevronRight className="size-4" />
          </Button>
        </Link>
      </div>
    );
  }
}

function AdvancedSettingsDropdown({ agent }: { agent: Agent }) {
  return (
    <div className="flex space-x-2 w-full ">
      <Accordion type="single" collapsible className="w-full mt-20">
        <Accordion.Item
          value="advanced"
          className="!border-none w-full flex flex-col space-y-8 "
        >
          <Accordion.Trigger className="text-muted-foreground flex items-center justify-center">
            <span id="onboarding-agents-overview-advanced-settings">
              Configure
            </span>
          </Accordion.Trigger>
          <Accordion.Content>
            <AgentBuilderAdvancedSettingsContent agent={agent} />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}

const AgentActionButton = ({
  tool,
  projectId,
  agent,
  apps,
  defaultOpen,
}: {
  tool: SavedActionNode;
  projectId: string;
  agent: Agent;
  apps: Record<string, WorkflowApp>;
  defaultOpen: boolean;
}) => {
  const nodeData = useMemo(() => {
    const loadedData = loadNodesFromSavedState({
      savedNodes: [tool],
      apps,
      savedEdges: [],
    });

    return loadedData.nodes[0];
  }, [apps, tool]);

  const fields = useMemo(() => {
    const app = apps[tool.appId];
    const action = app?.actions.find((a) => a.id === tool.actionId);

    return {
      icon: (
        <img
          src={action?.iconUrl ?? app?.logoUrl}
          alt={action?.name ?? app?.name}
          className={cn('size-5 rounded p-0.5', {
            'dark:invert':
              action?.id !== 'web_action_google-search' &&
              action?.iconUrl != null,
          })}
        />
      ),
      name: tool.name,
      description: tool.description,
    };
  }, [apps, tool.actionId, tool.appId, tool.description, tool.name]);

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <WorkflowNodePopover
          projectId={projectId}
          agentId={agent.id}
          executionId={undefined}
          workflowId={undefined}
          nodeStatus={{ isComplete: true, messages: [], status: 'good' }}
          defaultOpen={defaultOpen}
          noPopover
          asChild
          className="!shadow-none"
          {...(nodeData as unknown as NodeProps)}
        >
          <Button variant={'outline'} className="space-x-2">
            {fields.icon}
            <span>{fields.name}</span>
          </Button>
        </WorkflowNodePopover>
      </Tooltip.Trigger>
      <Tooltip.Content side="bottom">{fields.description}</Tooltip.Content>
    </Tooltip>
  );
};

const AgentTriggerButton = ({
  trigger,
  projectId,
  agent,
  apps,
  defaultOpen,
}: {
  trigger: SavedTriggerNode;
  projectId: string;
  agent: Agent;
  apps: Record<string, WorkflowApp>;
  defaultOpen: boolean;
}) => {
  const nodeData = useMemo(() => {
    const loadedData = loadNodesFromSavedState({
      savedNodes: [trigger],
      apps,
      savedEdges: [],
    });

    return loadedData.nodes[0];
  }, [apps, trigger]);

  const fields = useMemo(() => {
    const app = apps[trigger.appId];
    const action = app?.triggers.find((a) => a.id === trigger.triggerId);

    return {
      icon: (
        <img
          src={action?.iconUrl ?? app?.logoUrl}
          alt={action?.name ?? app?.name}
          className={cn('size-5 rounded p-0.5', {
            'dark:invert': action?.iconUrl != null,
          })}
        />
      ),
      name: trigger.name,
      description: trigger.description,
    };
  }, [
    apps,
    trigger.appId,
    trigger.description,
    trigger.name,
    trigger.triggerId,
  ]);

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <WorkflowNodePopover
          projectId={projectId}
          agentId={agent.id}
          executionId={undefined}
          workflowId={undefined}
          nodeStatus={{ isComplete: true, messages: [], status: 'good' }}
          defaultOpen={defaultOpen}
          noPopover
          asChild
          className="!shadow-none"
          {...(nodeData as unknown as NodeProps)}
        >
          <Button variant={'outline'} className="space-x-2">
            {fields.icon}
            <span>{fields.name}</span>
          </Button>
        </WorkflowNodePopover>
      </Tooltip.Trigger>
      <Tooltip.Content side="bottom">{fields.description}</Tooltip.Content>
    </Tooltip>
  );
};
