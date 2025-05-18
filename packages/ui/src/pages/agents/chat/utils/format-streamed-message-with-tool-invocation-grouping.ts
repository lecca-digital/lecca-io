import { v4 } from 'uuid';

import { FormattedTaskMessage } from '../../../../models/task/formatted-task-message-model';
import { StreamedTaskAssistantMessageToolInvocation } from '../../../../models/task/streamed-task-message-model';

/**
 * NOT USING THIS ATM. TO MANY RERENDERS IT WASN'T WORKING. BUT WILL KEEP INCASE WE NEED IN FUTURE
 *
 * Streamed messages separate all teh tool invocations into their own message.
 * So though the tool invocation property is an array, it's always just one tool inside.
 *
 * This function groups all the tools for the same assistant into a single assistant message.
 */

export function formatStreamedMessageWithToolInvocationGrouping({
  messages,
  currentAgentId,
}: {
  messages: FormattedTaskMessage[];
  currentAgentId: string;
}): FormattedTaskMessage[] {
  const formattedMessages: FormattedTaskMessage[] = [];

  let toolInvocationArr: StreamedTaskAssistantMessageToolInvocation[] = [];
  let currentAssistantId: string;

  messages.forEach((message) => {
    if (message.role === 'user') {
      formattedMessages.push(message);
    } else if (message.role === 'assistant') {
      currentAssistantId = message.data?.agentId ?? currentAgentId;

      // 1. If there are tools, add them to the tool array
      if (message.toolInvocations?.length) {
        toolInvocationArr.push(...message.toolInvocations);
      } else {
        //2. If there are no tools and this is just an assistant message
        // then add the tool as a single assistant message with a toolInvocation field
        const messageWithToolInvocations: FormattedTaskMessage = {
          id: v4(),
          role: 'assistant',
          content: '',
          parts: [],
          data: {
            agentId: currentAssistantId,
          },
          toolInvocations: toolInvocationArr.map((tools) => {
            return {
              state: tools.state!,
              toolCallId: tools.toolCallId!,
              toolName: tools.toolName!,
              args: tools.args!,
              result: tools.result!,
            };
          }),
        };

        formattedMessages.push(messageWithToolInvocations);
        formattedMessages.push(message);
        toolInvocationArr = [];
      }
    } else {
      throw new Error('Unknown message role');
    }
  });

  return formattedMessages;
}
