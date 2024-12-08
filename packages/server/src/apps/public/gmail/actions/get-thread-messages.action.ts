import { z } from 'zod';

import { Action, RunActionArgs } from '@/apps/lib/action';
import { InputConfig } from '@/apps/lib/input-config';

import { Gmail } from '../gmail.app';
import { GmailParsedEmail } from '../types/gmail.types';

export class GetThreadMessages extends Action {
  app: Gmail;
  id = 'gmail_action_get-thread-messages';
  name = 'Get Thread Messages';
  description = 'Retrieve messages from a Gmail thread';
  aiSchema = z.object({
    threadId: z
      .string()
      .min(1)
      .describe('The thread ID of the email to retrieve messages from'),
  });
  inputConfig: InputConfig[] = [
    {
      label: 'Thread ID',
      id: 'threadId',
      inputType: 'text',
      placeholder: 'Add the thread ID',
      description: 'The thread ID of the email to retrieve messages from',
      required: {
        missingMessage: 'Thread ID is required',
        missingStatus: 'warning',
      },
    },
  ];

  async run({
    configValue,
    connection,
  }: RunActionArgs<ConfigValue>): Promise<GmailParsedEmail[]> {
    const gmail = await this.app.gmail({
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
    });

    const messagesResponse = await gmail.users.threads.get({
      userId: 'me',
      id: configValue.threadId,
    });

    const messages = messagesResponse.data.messages || [];

    const parsedMessages: GmailParsedEmail[] = [];
    for (const message of messages) {
      if (message.id) {
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        parsedMessages.push(
          this.app.parseEmail(messageResponse, { htmlOrText: 'both' }),
        );
      }
    }

    return parsedMessages;
  }

  async mockRun(): Promise<GmailParsedEmail[]> {
    return [this.app.mockEmail];
  }
}

type ConfigValue = z.infer<GetThreadMessages['aiSchema']>;
