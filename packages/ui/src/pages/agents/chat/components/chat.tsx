import { Message, useChat } from 'ai/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { v4 } from 'uuid';

import { api, appQueryClient } from '../../../../api/api-library';
import useApiQuery from '../../../../api/use-api-query';
import { useUser } from '../../../../hooks/useUser';
import { Agent } from '../../../../models/agent/agent-model';
import { AiProvider } from '../../../../models/ai-provider-model';
import { FormattedTaskMessage } from '../../../../models/task/formatted-task-message-model';
import { WorkflowApp } from '../../../../models/workflow/workflow-app-model';
import { formatSavedMessagesToStreamedMessageFormat } from '../utils/format-saved-messages-to-streamed-message-format';
import { MessageMeta } from '../utils/message-meta';

import { AgentConfigureToolbar } from './agent-configure-toolbar';
import { ChatInput } from './chat-input';
import { MessageAgentCard } from './message-agent-card';
import { MessageGroup } from './message-card';
import { NewChatWelcome } from './new-chat-welcome';

type Props = {
  taskId?: string;
  projectId: string;
  agent: Agent;
  defaultMessages?: FormattedTaskMessage[];
};

export function Chat(props: Props) {
  const { aiProviders } = useUser();
  const [imageData, setImageData] = useState<string[]>([]);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const activeTaskId = useMemo(() => props.taskId ?? v4(), [props.taskId]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setRerender] = useState(0);
  //Used to hold state and manage rendering for some parts of the chat
  const messageMeta = useRef<MessageMeta>(new MessageMeta(setRerender));
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((args?: { force?: boolean }) => {
    const container = messagesEndRef.current;
    if (container && args?.force) {
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }, 0);
    }
  }, []);

  const canStream = useMemo(() => {
    const llmModel =
      aiProviders[props.agent.llmProvider as AiProvider]?.languageModels?.[
        props.agent.llmModel ?? ''
      ];

    if (llmModel?.canStreamText && llmModel.canStreamTools) {
      return true;
    } else if (llmModel?.canStreamText && !llmModel?.canStreamTools) {
      if (
        props.agent.tools?.length ||
        props.agent.agentKnowledge?.length ||
        props.agent.agentActions?.length ||
        props.agent.agentWorkflows?.length ||
        props.agent.agentPhoneAccess?.outboundCallsEnabled ||
        props.agent.agentSubAgents?.length ||
        props.agent.agentWebAccess?.webSearchEnabled ||
        props.agent.agentWebAccess?.websiteAccessEnabled ||
        props.agent.agentVariables?.length
      ) {
        return false;
      } else {
        //If they can stream text and they can't stream tools, but they don't have any, then they can stream.
        return true;
      }
    } else {
      //If they can't stream text and can't stream tools, then they can't stream.
      return false;
    }
  }, [
    aiProviders,
    props.agent.agentActions?.length,
    props.agent.agentKnowledge?.length,
    props.agent.agentPhoneAccess?.outboundCallsEnabled,
    props.agent.agentSubAgents?.length,
    props.agent.agentVariables?.length,
    props.agent.agentWebAccess?.webSearchEnabled,
    props.agent.agentWebAccess?.websiteAccessEnabled,
    props.agent.agentWorkflows?.length,
    props.agent.llmModel,
    props.agent.llmProvider,
    props.agent.tools?.length,
  ]);

  const hasToolsButCannotUseThem = useMemo(() => {
    const llmModel =
      aiProviders[props.agent.llmProvider as AiProvider]?.languageModels?.[
        props.agent.llmModel ?? ''
      ];

    if (llmModel && !llmModel.tools) {
      if (
        props.agent.agentKnowledge?.length ||
        props.agent.agentActions?.length ||
        props.agent.agentWorkflows?.length ||
        props.agent.agentPhoneAccess?.outboundCallsEnabled ||
        props.agent.agentSubAgents?.length ||
        props.agent.agentWebAccess?.webSearchEnabled ||
        props.agent.agentWebAccess?.websiteAccessEnabled ||
        props.agent.agentVariables?.length ||
        props.agent.tools?.length
      ) {
        return true;
      }
    } else if (!llmModel) {
      //If the llmModel is dynamically retrieved, then it's not going to be on the aiProviders[provider] object.
      //Therefore, we can't determine if they can stream tools or not. So we will default to false to hide the has tools but cannot use them popup.
      return false;
    }

    return false;
  }, [
    aiProviders,
    props.agent.agentActions?.length,
    props.agent.agentKnowledge?.length,
    props.agent.agentPhoneAccess?.outboundCallsEnabled,
    props.agent.agentSubAgents?.length,
    props.agent.agentVariables?.length,
    props.agent.agentWebAccess?.webSearchEnabled,
    props.agent.agentWebAccess?.websiteAccessEnabled,
    props.agent.agentWorkflows?.length,
    props.agent.llmModel,
    props.agent.llmProvider,
    props.agent.tools?.length,
  ]);

  const { data: agents } = useApiQuery({
    service: 'agents',
    method: 'getList',
    apiLibraryArgs: {
      config: {
        params: {
          filterBy: [`projectId:${props.projectId}`],
        },
      },
    },
  });

  const { data: workspaceUsers } = useApiQuery({
    service: 'workspaceUsers',
    method: 'getList',
    apiLibraryArgs: {},
  });

  const { data: knowledge } = useApiQuery({
    service: 'knowledge',
    method: 'getList',
    apiLibraryArgs: {
      config: {
        params: {
          filterBy: [`projectAccessId:${props.projectId}`],
        },
      },
    },
  });

  const { data: apps } = useApiQuery({
    service: 'workflowApps',
    method: 'getList',
    apiLibraryArgs: {},
  });

  const { data: workflows } = useApiQuery({
    service: 'workflows',
    method: 'getList',
    apiLibraryArgs: {
      config: {
        params: {
          filterBy: [`projectId:${props.projectId}`],
        },
      },
    },
  });

  const mappedApps = useMemo(() => {
    if (!apps) {
      return {};
    }

    return apps.reduce(
      (acc, app) => {
        acc[app.id] = app;
        return acc;
      },
      {} as { [key: string]: WorkflowApp },
    );
  }, [apps]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: handleSubmitStreamMessage,
    setInput,
    error,
    setMessages,
    stop,
    reload,
  } = useChat({
    onError: (error) => {
      let message = '';
      let statusCode = 200;
      try {
        message =
          JSON.parse(error.message).message ?? JSON.parse(error.message).error;
        statusCode = JSON.parse(error.message).statusCode;
      } catch {
        message = error.message;
      }

      /**
       * If status code is 401, then the error handler useEffect will re-auth and try again.
       * If it's not 401, then it's not an auth issue and the error should be added to the messages so
       * the user can see it.
       */
      if (statusCode !== 401) {
        setMessages([
          ...messages,
          {
            id: v4(),
            role: 'system',
            parts: [{ type: 'text', text: message }],
            content: message,
          },
        ]);
      }
    },
    api: `${import.meta.env.VITE_SERVER_URL}/agents/${props.agent.id}/tasks/${props.taskId ?? activeTaskId}/stream-message`,
    experimental_prepareRequestBody: ({ messages }) => {
      const preparedMessages = prepareMessagesToSend({ messages });
      return { messages: preparedMessages } as any;
    },
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
    onFinish: () => {
      if (!props.taskId) {
        //This is a new task, so we need to update the URL
        window.history.pushState(
          {},
          '',
          `/projects/${props.projectId}/agents/${props.agent.id}/tasks/${activeTaskId}`,
        );

        appQueryClient.invalidateQueries({ queryKey: ['tasks', 'getList'] });
      }
    },
  });

  const prepareMessagesToSend = useCallback(
    ({ messages }: { messages: Message[] }) => {
      const previousMessages = messages.slice(0, messages.length - 1);
      const newMessage = messages[messages.length - 1];

      if (imageData.length) {
        const newMessageWithImage = {
          ...newMessage,
          content: [
            {
              type: 'text',
              text: newMessage.content,
            },
            ...imageData.map((image) => ({
              type: 'image',
              image: new URL(image),
            })),
          ],
        };

        //clear image data state
        setImageData([]);
        setMessages([...previousMessages, newMessageWithImage] as any);

        return [newMessageWithImage] as unknown as Message[];
      } else {
        setMessages(messages as any);
        return [newMessage] as unknown as Message[];
      }
    },
    [imageData, setMessages],
  );

  const handleSendMessage = useCallback(async () => {
    if (canStream) {
      handleSubmitStreamMessage();
      return;
    } else {
      setIsLoadingResponse(true);
      const userMessage = {
        id: v4(),
        role: 'user',
        content: input,
        createdAt: new Date(),
      };

      const tempMessages = [...messages, userMessage];
      setInput('');
      const preparedMessages = prepareMessagesToSend({
        messages: tempMessages as Message[],
      });

      const response = await api.tasks.sendMessage({
        agentId: props.agent.id,
        taskId: props.taskId ?? activeTaskId,
        messages: preparedMessages as FormattedTaskMessage[],
      });

      setIsLoadingResponse(false);

      if (response.error) {
        setMessages([
          ...tempMessages,
          {
            id: v4(),
            role: 'system',
            content: response.error,
          },
        ] as any);
      } else {
        const responseMessages = response.data ?? [];
        const formatToStreamFormat = formatSavedMessagesToStreamedMessageFormat(
          {
            messages: responseMessages,
            currentAgentId: props.agent.id,
          },
        );

        setMessages([...tempMessages, ...formatToStreamFormat] as any);

        if (!props.taskId) {
          //This is a new task, so we need to update the URL
          window.history.pushState(
            {},
            '',
            `/projects/${props.projectId}/agents/${props.agent.id}/tasks/${activeTaskId}`,
          );

          appQueryClient.invalidateQueries({ queryKey: ['tasks', 'getList'] });
        }
      }
    }
  }, [
    activeTaskId,
    canStream,
    handleSubmitStreamMessage,
    input,
    messages,
    prepareMessagesToSend,
    props.agent.id,
    props.projectId,
    props.taskId,
    setInput,
    setMessages,
  ]);

  useEffect(() => {
    if (error as any) {
      try {
        const parsedError = JSON.parse((error as any).message);
        if (parsedError.statusCode === 401) {
          api.auth.refreshToken().then(() => {
            if (messages[messages.length - 1].role !== 'system') {
              reload();
            }
          });
        }
      } catch {
        //Error will be displayed in chat ui as system message
      }
    }
  }, [error, messages, reload]);

  useEffect(() => {
    if (props.defaultMessages) {
      setMessages(props.defaultMessages as Message[]);
    }
    //Only run initially
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.defaultMessages]);

  useEffect(() => {
    scrollToBottom();
    //Add message to the dependency array to auto scroll, but I couldn't figure out how to get it stop scrolling when you scroll up.
    //even with the useEffect below that handle's the scroll.
  }, [scrollToBottom]);

  if (!agents || !workspaceUsers || !knowledge || !apps || !workflows) {
    return null;
  }

  return (
    <div className="flex flex-col justify-between w-full min-h-full h-[calc(100dvh-90px)]">
      <div
        ref={messagesEndRef}
        className="overflow-y-auto flex flex-col h-full w-full overflow-x-hidden"
      >
        <div className="relative flex flex-col h-full w-full max-w-[800px] mx-auto space-y-6 pb-16 sm:pb-20">
          {!messages.length ? (
            <div className="mt-10 space-y-4 pb-20 px-3 sm:px-0">
              <NewChatWelcome agent={props.agent} />
              <div className="space-y-4 sm:px-10 mx-auto w-full">
                <ChatInput
                  hasToolsButCannotUseThem={hasToolsButCannotUseThem}
                  isLoading={isLoadingResponse}
                  handleInputChange={handleInputChange}
                  handleSubmit={() => {
                    scrollToBottom({ force: true });
                    handleSendMessage();
                  }}
                  input={input}
                  setInput={setInput}
                  setImageData={setImageData}
                  imageData={imageData}
                  stop={stop}
                />
                <AgentConfigureToolbar
                  agentId={props.agent.id!}
                  projectId={props.projectId!}
                  selectorContentSide="right"
                  mode="welcome"
                />
              </div>
            </div>
          ) : (
            <div className="py-16 space-y-4 ">
              {messages?.map((m, messageIndex) => (
                <MessageGroup
                  key={messageIndex}
                  message={m as FormattedTaskMessage}
                  agent={props.agent}
                  agents={agents}
                  workspaceUsers={workspaceUsers}
                  knowledge={knowledge}
                  mappedApps={mappedApps}
                  messageIndex={messageIndex}
                  messageMeta={messageMeta.current}
                  workflows={workflows}
                />
              ))}
              {isLoadingResponse && (
                <div className="px-10">
                  <MessageAgentCard
                    agent={props.agent}
                    createdAt={new Date()}
                    status="loading"
                    textContent=""
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {messages.length > 0 && (
        <div className="space-y-4 max-w-[800px] pb-10 sm:pb-0 px-5 sm:px-10 mx-auto w-full">
          <ChatInput
            hasToolsButCannotUseThem={hasToolsButCannotUseThem}
            isLoading={isLoadingResponse}
            handleInputChange={handleInputChange}
            handleSubmit={() => {
              scrollToBottom({ force: true });
              handleSendMessage();
            }}
            input={input}
            setInput={setInput}
            setImageData={setImageData}
            imageData={imageData}
            stop={stop}
          />
          <AgentConfigureToolbar
            agentId={props.agent.id!}
            projectId={props.projectId!}
            selectorContentSide="top"
            mode="chat"
          />
        </div>
      )}
    </div>
  );
}
