import React, { useMemo } from 'react';

import useApiQuery from '../../../../api/use-api-query';
import { Icons } from '../../../../components/icons';
import { Dialog } from '../../../../components/ui/dialog';
import { Agent } from '../../../../models/agent/agent-model';
import { Knowledge } from '../../../../models/knowledge-model';
import { StreamedTaskAssistantMessageToolInvocation } from '../../../../models/task/streamed-task-message-model';
import { WorkflowAppActionType } from '../../../../models/workflow/workflow-app-action-model';
import { WorkflowApp } from '../../../../models/workflow/workflow-app-model';
import { Workflow } from '../../../../models/workflow/workflow-model';
import { cn } from '../../../../utils/cn';

import { ToolInfoDialog } from './tool-info-dialog';
import { toolComponentsMap } from './tools/tool-component-map';

type Props = {
  tool: StreamedTaskAssistantMessageToolInvocation;
  knowledge: Knowledge[];
  workflows: Workflow[];
  agents: Agent[];
  mappedApps: { [key: string]: WorkflowApp };
  agentId: string;
};

export function MessageToolCard({
  agentId,
  tool,
  knowledge,
  agents,
  workflows,
  mappedApps,
}: Props) {
  const { data: agent } = useApiQuery({
    service: 'agents',
    method: 'getById',
    apiLibraryArgs: {
      id: agentId,
    },
  });

  const fields = useMemo((): ToolRenderFields => {
    console.log('processing fields');
    const toolName = tool.toolName;
    const toolType = getToolType({
      toolName: tool.toolName,
    });

    const toolFields: ToolRenderFields = {
      entity: {},
      name: 'tool',
      verb: 'Used',
      icon: <Icons.app className="size-5" />,
      status: getToolStatus({ result: tool.result }),
    };

    switch (toolType) {
      /**
       * deprecated
       */
      case 'workflow':
        toolFields.entity.workflow = workflows?.find(
          (workflow) => workflow.id === toolName.split('workflow-')[1],
        );
        toolFields.verb = 'Ran';
        toolFields.name = toolFields.entity.workflow?.name ?? 'workflow';
        toolFields.icon = <Icons.workflow className="size-5" />;
        break;
      /**
       * deprecated
       */
      case 'knowledge':
        toolFields.entity.knowledge = knowledge?.find(
          (k) => k.id === toolName.split('knowledge-')[1],
        );
        toolFields.verb = 'Searched';
        toolFields.name = toolFields.entity.knowledge?.name ?? 'knowledge';
        toolFields.icon = <Icons.knowledge className="size-5" />;
        break;
      /**
       * deprecated
       */
      case 'subagent':
        toolFields.entity.subagent = agents?.find(
          (subagent) => subagent.id === toolName.split('subagent-')[1],
        );
        toolFields.verb = 'Messaged';
        toolFields.name = toolFields.entity.subagent?.name ?? 'sub-agent';
        toolFields.icon = <Icons.messageAgent className="size-5" />;
        break;
      /**
       * deprecated
       */
      case 'action':
        {
          const appId = toolName.split('_action_')[0];

          const app = mappedApps[appId];
          toolFields.entity.action = app?.actions?.find(
            (a) => a.id === toolName,
          );
          toolFields.verb = `Used ${app?.name} to `;
          toolFields.name = toolFields.entity.action?.name ?? 'quick action';
          toolFields.icon = (
            <img
              src={toolFields.entity.action?.iconUrl ?? app?.logoUrl}
              alt={toolFields.entity.action?.name ?? app?.name}
              className={cn('size-5 rounded p-0.5', {
                'dark:invert': toolFields.entity.action?.iconUrl != null,
              })}
            />
          );
        }
        break;
      /**
       * deprecated
       */
      case 'web':
        {
          const webToolName = toolName.split('web-')[1] as
            | 'extract-website-content'
            | 'extract-static-website-content'
            | 'google-search';

          if (
            webToolName === 'extract-website-content' ||
            webToolName === 'extract-static-website-content'
          ) {
            toolFields.entity.webTool = 'extract';
            toolFields.verb = 'Extracted';
            toolFields.name = 'Web Content';
            toolFields.icon = <Icons.globe className="size-5" />;
          } else if (webToolName === 'google-search') {
            toolFields.entity.webTool = 'search';
            toolFields.verb = 'Searched';
            toolFields.name = 'Google';
            toolFields.icon = <Icons.googleSearch className="size-5" />;
          }
        }
        break;
      /**
       * deprecated
       */
      case 'phone':
        {
          const phoneToolName = toolName.replace('phone-', '');
          if (phoneToolName === 'make-phone-call') {
            toolFields.entity.phoneTool = 'outbound';
            toolFields.verb = 'Made a';
            toolFields.name = 'Phone Call';
            toolFields.icon = <Icons.phone className="size-5 dark:invert" />;
          }
        }
        break;
      case 'tool': {
        const toolIdFromToolName = toolName.split('tool-')?.[1];
        const existingTool = agent?.tools?.find(
          (tool) => tool.id === toolIdFromToolName,
        );

        let appId = tool.data?.appId;
        let actionId = tool.data?.actionId;

        if (existingTool) {
          appId = existingTool.appId;
          actionId = existingTool.actionId;
        }

        const app = mappedApps[appId ?? ''];
        const action = app?.actions.find((a) => a.id === actionId);

        if (!app || !action) {
          toolFields.verb = 'Used';
          toolFields.name = 'Unknown Tool';
          toolFields.icon = <Icons.app className="size-5" />;
        } else {
          if (actionId === 'ai_action_message-agent') {
            toolFields.verb = `Started conversation using`;
            toolFields.name = existingTool?.name ?? action.name;
          } else if (actionId?.includes('web_action_')) {
            toolFields.verb = `Used`;
            toolFields.name = existingTool?.name ?? action.name;
          } else {
            toolFields.verb = `Used ${app.name} to `;
            toolFields.name = existingTool?.name ?? action.name;
          }

          toolFields.icon = (
            <img
              src={action?.iconUrl ?? app?.logoUrl}
              alt={action?.name ?? app?.name}
              className={cn('size-5 rounded p-0.5', {
                'dark:invert':
                  action?.id !== 'web_action_google-search' &&
                  action?.iconUrl != null,
              })}
            />
          );
        }

        break;
      }
    }

    return toolFields;
  }, [agent?.tools, agents, knowledge, mappedApps, tool, workflows]);

  // Extract toolId from toolName
  const toolId = tool.data?.actionId;

  console.log('tool.data', tool.data);
  console.log('toolId', toolId);
  // Check if a component exists for this toolId in the toolComponentsMap
  const ToolComponent = toolId ? toolComponentsMap[toolId] : undefined;
  console.log('ToolComponent', ToolComponent);

  // If we have a matching component, render it
  if (ToolComponent) {
    return <ToolComponent tool={tool} fields={fields} />;
  }

  // Otherwise, render the default UI
  return (
    <Dialog>
      <Dialog.Trigger className="group">
        <div className="flex justify-between ml-11">
          <div className="flex space-x-2 items-center">
            <div className="relative border rounded-md p-1.5 mr-1 group-hover:shadow">
              {fields.icon}
              <StatusIcon status={fields.status} />
            </div>
            <div className="flex items-center space-x-1.5 text-sm ">
              <span className="text-muted-foreground group-hover:text-primary/90">
                {fields.verb}
              </span>
              <span className="font-medium">{fields.name}</span>
            </div>
          </div>
        </div>
      </Dialog.Trigger>
      <ToolInfoDialog tool={tool} label={fields.name} />
    </Dialog>
  );
}

export function StatusIcon({ status }: { status: ToolStatus }) {
  return (
    <div
      className={cn(
        'absolute -bottom-1 -right-1  p-0.5 rounded-full text-primary-foreground dark:text-white',
        {
          'bg-yellow-500': status === 'loading',
          'bg-green-500': status === 'success',
          'bg-red-500': status === 'error',
        },
      )}
    >
      {status === 'loading' && (
        <Icons.spinner className="size-3 animate-spin" />
      )}
      {status === 'success' && <Icons.check className="size-3 " />}
      {status === 'error' && <Icons.x className="size-3" />}
    </div>
  );
}

function getToolType({ toolName }: { toolName: string }): ToolType {
  let toolType: ToolType;

  if (toolName.startsWith('workflow-')) {
    toolType = 'workflow';
  } else if (toolName.startsWith('knowledge-')) {
    toolType = 'knowledge';
  } else if (toolName.startsWith('subagent-')) {
    toolType = 'subagent';
  } else if (toolName.includes('_action_')) {
    toolType = 'action';
  } else if (toolName.startsWith('web-')) {
    toolType = 'web';
  } else if (toolName.startsWith('phone-')) {
    toolType = 'phone';
  } else if (toolName.startsWith('tool-')) {
    toolType = 'tool';
  } else {
    throw new Error(`Unknown tool type for toolName: ${toolName}`);
  }
  return toolType;
}

function getToolStatus({ result }: { result: any }): ToolStatus {
  if (result == null) {
    return 'loading';
  } else if (result?.success != null) {
    return result.success ? 'success' : 'error';
  } else if (result?.failure != null) {
    return 'error';
  } else {
    throw new Error(`Unknown tool status for result: ${result}`);
  }
}

type ToolStatus = 'success' | 'error' | 'loading';

type ToolType =
  | 'action'
  | 'workflow'
  | 'subagent'
  | 'knowledge'
  | 'web'
  | 'phone'
  | 'tool';

export type ToolRenderFields = {
  entity: {
    action?: WorkflowAppActionType;
    workflow?: Workflow;
    knowledge?: Knowledge;
    subagent?: Agent;
    webTool?: 'extract' | 'search';
    phoneTool?: 'outbound';
  };
  name: string;
  verb: string;
  link?: string;
  icon?: React.ReactNode;
  status: ToolStatus;
};
