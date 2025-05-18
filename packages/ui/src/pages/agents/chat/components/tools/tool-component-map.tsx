import { StreamedTaskAssistantMessageToolInvocation } from '../../../../../models/task/streamed-task-message-model';
import { ToolRenderFields } from '../tool-card';

import { SearchKnowledgeTool } from './search-knowledge-tool';

export type ToolComponentProps = {
  tool: StreamedTaskAssistantMessageToolInvocation;
  fields: ToolRenderFields;
};

export const toolComponentsMap: {
  [key: string]: ((args: ToolComponentProps) => JSX.Element | null) | undefined;
} = {
  'knowledge_action_search-knowledge': SearchKnowledgeTool,
};
