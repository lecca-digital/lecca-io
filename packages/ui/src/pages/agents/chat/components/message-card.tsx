import { useMemo } from 'react';

import { Icons } from '../../../../components/icons';
import { MarkdownViewer } from '../../../../components/markdown-viewer';
import { useUser } from '../../../../hooks/useUser';
import { Agent } from '../../../../models/agent/agent-model';
import { Knowledge } from '../../../../models/knowledge-model';
import {
  FormattedTaskAssistantMessage,
  FormattedTaskMessage,
} from '../../../../models/task/formatted-task-message-model';
import { WorkflowApp } from '../../../../models/workflow/workflow-app-model';
import { Workflow } from '../../../../models/workflow/workflow-model';
import { WorkspaceUser } from '../../../../models/workspace-user-model';
import { cn } from '../../../../utils/cn';
import { MessageMeta } from '../utils/message-meta';

import { MessageAgentCard } from './message-agent-card';
import { MessageSystemCard } from './message-system-card';
import { MessageUserCard } from './message-user-card';
import { MessageToolCard } from './tool-card';

type Props = {
  message: FormattedTaskMessage;
  agent: Agent;
  knowledge: Knowledge[];
  workflows: Workflow[];
  mappedApps: { [key: string]: WorkflowApp };
  agents: Agent[];
  workspaceUsers: WorkspaceUser[];
  messageIndex: number;
  messageMeta: MessageMeta;
};

export function MessageGroup({
  message,
  agent,
  workspaceUsers,
  knowledge,
  workflows,
  agents,
  mappedApps,
  messageIndex,
  messageMeta,
}: Props) {
  const { workspaceUser } = useUser();

  return (
    <div className={cn('animate-fade-in w-full px-4 sm:px-10')}>
      {message.parts.map((part, partIndex) => {
        return (
          <MessageCard
            key={`${messageIndex + partIndex}`}
            part={part}
            partIndex={partIndex}
            message={message}
            agent={agent}
            workspaceUsers={workspaceUsers}
            workspaceUser={workspaceUser}
            knowledge={knowledge}
            workflows={workflows}
            agents={agents}
            mappedApps={mappedApps}
            messageIndex={messageIndex}
            messageMeta={messageMeta}
          />
        );
      })}
    </div>
  );
}

function MessageCard({
  part,
  partIndex,
  message,
  agents,
  agent,
  workflows,
  mappedApps,
  knowledge,
  workspaceUsers,
  workspaceUser,
  messageIndex,
  messageMeta,
}: {
  part: FormattedTaskMessage['parts'][number];
  partIndex: number;
  message: FormattedTaskMessage;
  agents: Agent[];
  agent: Agent;
  workflows: Workflow[];
  mappedApps: { [key: string]: WorkflowApp };
  knowledge: Knowledge[];
  workspaceUsers: WorkspaceUser[];
  workspaceUser: WorkspaceUser | undefined | null;
  messageIndex: number;
  messageMeta: MessageMeta;
}) {
  useMemo(() => {
    const exisitingMessageData = messageMeta.data[messageIndex];
    if (!exisitingMessageData) {
      messageMeta.data[messageIndex] = [];
    }

    //Need to check if the previous part is a tool invocation.
    const previousPartInMessage = messageMeta.data[messageIndex][partIndex - 1];

    const lastPartInLastMessage =
      messageMeta.data[messageIndex - 1]?.[
        messageMeta.data[messageIndex - 1].length - 1
      ];

    if (previousPartInMessage) {
      if (previousPartInMessage.type === 'tool-invocation') {
        //If the previous part is a tool invocation, we need to mark this as an between or end.
        messageMeta.data[messageIndex][partIndex] = {
          position: 'between',
          type: part.type,
        };
      } else {
        //If the previous part is not a tool invocation, then this is the start of a new tool group.
        messageMeta.data[messageIndex][partIndex] = {
          position: 'start',
          type: part.type,
        };
      }
    } else if (lastPartInLastMessage) {
      //There was no previous part in the current message, so check parts from the last message
      if (lastPartInLastMessage.type === 'tool-invocation') {
        messageMeta.data[messageIndex][partIndex] = {
          position: 'between',
          type: part.type,
        };
      } else {
        messageMeta.data[messageIndex][partIndex] = {
          position: 'start',
          type: part.type,
        };
      }
    } else {
      messageMeta.data[messageIndex][partIndex] = {
        position: 'start',
        type: part.type,
      };
    }
  }, [messageIndex, messageMeta.data, part.type, partIndex]);

  const Content = useMemo(() => {
    if (part.type === 'text') {
      return getMessageContent({
        content: part.text,
        role: message.role,
        data: message.data,
        createdAt: message.createdAt,
        agent,
        agents,
        mappedApps,
        workflows,
        workspaceUser: workspaceUser!,
        workspaceUsers,
      });
    } else if (part.type === 'tool-invocation') {
      return getToolInvocationContent({
        partIndex,
        messageIndex,
        messageMeta,
        toolInvocations: [part.toolInvocation],
        data: message.data,
        agent,
        agents,
        mappedApps,
        workflows,
        knowledge,
      });
    } else {
      throw Error(`Unknown message part: ${part}`);
    }
  }, [
    agent,
    agents,
    knowledge,
    mappedApps,
    workflows,
    workspaceUser,
    workspaceUsers,
    message.createdAt,
    message.data,
    message.role,
    messageIndex,
    messageMeta,
    part,
    partIndex,
  ]);

  return Content;
}

function getToolInvocationContent({
  messageMeta,
  partIndex,
  messageIndex,
  toolInvocations,
  data,
  agents,
  agent,
  mappedApps,
  workflows,
  knowledge,
}: {
  messageMeta: MessageMeta;
  partIndex: number;
  messageIndex: number;
  toolInvocations: FormattedTaskAssistantMessage['toolInvocations'];
  data: FormattedTaskAssistantMessage['data'];
  agents: Agent[];
  agent: Agent;
  mappedApps: { [key: string]: WorkflowApp };
  workflows: Workflow[];
  knowledge: Knowledge[];
}) {
  const taskMessageAgentId = data?.agentId;
  let taskMessageAgent: Agent | undefined;

  if (taskMessageAgentId) {
    taskMessageAgent = agents?.find((agent) => agent.id === taskMessageAgentId);
  } else {
    taskMessageAgent = agent!;
  }

  return (
    <>
      {messageMeta.data[messageIndex]?.[partIndex]?.position === 'start' && (
        <div className="flex items-center space-x-2 mb-6">
          <div className="border rounded-md p-1.5 mr-1">
            <Icons.app className="size-5" />
          </div>
          <div className="flex items-center space-x-1.5 text-sm">
            <span className="text-muted-foreground">Tool </span>
            <span className="text-muted-foreground">used by</span>
            <span className="font-medium">{agent.name}</span>
          </div>
        </div>
      )}
      <div className="inline-block mb-5">
        {toolInvocations!.map((tool) => {
          return (
            <MessageToolCard
              key={tool.toolCallId}
              tool={tool}
              mappedApps={mappedApps}
              workflows={workflows}
              knowledge={knowledge}
              agents={agents}
              //Passing the id so that the component can fetch the agent by id with it's tools.
              //this is because the getList agents doesn't return the tools. We could add the expansion,
              //but I'd rather not do that.
              agentId={taskMessageAgent!.id!}
            />
          );
        })}
      </div>
    </>
  );
}

function getMessageContent({
  role,
  data,
  content,
  createdAt,
  workflows,
  agent,
  mappedApps,
  workspaceUser,
  workspaceUsers,
  agents,
}: Pick<
  Props,
  'workflows' | 'agent' | 'mappedApps' | 'workspaceUsers' | 'agents'
> & {
  workspaceUser: WorkspaceUser;
  createdAt: FormattedTaskMessage['createdAt'];
  data: FormattedTaskMessage['data'];
  role: FormattedTaskMessage['role'];
  content: FormattedTaskMessage['content'];
}) {
  switch (role) {
    case 'user': {
      /**
       * A workspace user, agent, or workflow can all message an agent.
       * They are all considered "users" in this context.
       */
      const taskMessageWorkspaceUserId = data?.workspaceUserId;
      let taskMessageWorkspaceUser: WorkspaceUser | undefined | null;

      const taskMessageAgentId = data?.agentId;
      let taskMessageAgent: Agent | undefined;

      const taskMessageWorkflowId = data?.workflowId;
      let taskMessageWorkflow: Workflow | undefined;

      if (taskMessageWorkspaceUserId === workspaceUser?.id) {
        taskMessageWorkspaceUser = workspaceUser;
      } else if (taskMessageWorkspaceUserId) {
        taskMessageWorkspaceUser = workspaceUsers?.find(
          (wu) => wu.id === taskMessageWorkspaceUserId,
        );
      } else if (taskMessageWorkflowId) {
        taskMessageWorkflow = workflows?.find(
          (workflow) => workflow.id === taskMessageWorkflowId,
        );
      } else if (taskMessageAgentId) {
        taskMessageAgent = agents?.find(
          (agent) => agent.id === taskMessageAgentId,
        );
      } else {
        //If there is no message data then we will assume it's being streamed.
        //Streamed data can only happen as a user chats. So we will default to the current user.
        taskMessageWorkspaceUser = workspaceUser!;
      }

      return (
        <MessageUserCard
          user={{
            agent: taskMessageAgent,
            workflow: taskMessageWorkflow,
            workspaceUser: taskMessageWorkspaceUser!,
          }}
          agent={agent}
          content={content}
          createdAt={createdAt}
          mappedApps={mappedApps}
        />
      );
    }
    case 'assistant': {
      const taskMessageAgentId = data?.agentId;
      let taskMessageAgent: Agent | undefined;

      if (taskMessageAgentId) {
        taskMessageAgent = agents?.find(
          (agent) => agent.id === taskMessageAgentId,
        );
      } else {
        taskMessageAgent = agent!;
      }

      if (Array.isArray(content)) {
        //This is used when the assistant response is fully generated.
        return (
          <div>
            {content.map((c, i) => {
              switch (c.type) {
                case 'text':
                  return (
                    <MessageAgentCard
                      key={i}
                      agent={taskMessageAgent!}
                      textContent={c.text}
                      status={'idle'}
                      createdAt={createdAt}
                    />
                  );
                default:
                  return 'Unknown type';
              }
            })}
          </div>
        );
      } else {
        //Is is used while the response is generating, it's just a string.
        return (
          <MessageAgentCard
            agent={taskMessageAgent!}
            textContent={content}
            status="idle"
            createdAt={createdAt}
          />
        );
      }
    }
    case 'system':
      return (
        <MessageSystemCard
          createdAt={createdAt}
          textContent={content as string}
        />
      );
    default:
      return <MarkdownViewer>{'Unknown role'}</MarkdownViewer>;
  }
}
