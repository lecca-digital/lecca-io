import { Link } from 'react-router-dom';

import { Icons } from '../../../../components/icons';
import { MarkdownViewer } from '../../../../components/markdown-viewer';
import { Avatar } from '../../../../components/ui/avatar';
import { Agent } from '../../../../models/agent/agent-model';

import { MessageCardWrapper } from './message-card-wrapper';

export const MessageAgentCard = ({
  agent,
  textContent,
  status,
  createdAt,
}: {
  agent: Agent;
  textContent: string;
  status: 'loading' | 'idle';
  createdAt: Date | undefined;
}) => {
  if (textContent === '' && status === 'idle') {
    return null;
  }

  // Process the textContent to remove the thinking content
  const processedContent = textContent.replace(/<think>[\s\S]*?<\/think>/g, '');

  return (
    <MessageCardWrapper text={textContent} createdAt={createdAt}>
      <Link to={`/redirect?redirect=/agents/${agent.id}`}>
        <div className="flex items-center space-x-2">
          {agent.profileImageUrl ? (
            <Avatar className="size-9 border mr-1">
              <Avatar.Image
                src={agent.profileImageUrl ?? undefined}
                alt="Agent icon url"
              />
              <Avatar.Fallback className="text-lg">
                {agent.name![0].toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
          ) : (
            <div className="border rounded-md p-1.5 mr-1">
              <Icons.messageAgent className="size-5" />
            </div>
          )}
          <div className="flex items-center space-x-1.5 text-sm">
            <span className="font-medium">{agent.name}</span>
            {status === 'loading' && (
              <span className="text-muted-foreground">is working...</span>
            )}
          </div>
        </div>
      </Link>
      <div className="ml-12">
        <MarkdownViewer>{processedContent}</MarkdownViewer>
      </div>
    </MessageCardWrapper>
  );
};
