import { Dialog } from '../../../../../components/ui/dialog';
import { StatusIcon } from '../tool-card';

import { ToolComponentProps } from './tool-component-map';

export const SearchKnowledgeTool = ({ tool, fields }: ToolComponentProps) => {
  return (
    <div className="flex justify-between ml-11">
      <div className="flex flex-col items-start">
        <div className="flex space-x-2 items-center">
          <div className="relative border rounded-md p-1.5 mr-1 group-hover:shadow">
            {fields.icon}
            <StatusIcon status={fields.status} />
          </div>
          <div className="flex flex-col items-start text-sm ">
            <span className="font-medium">Searched Knowledge</span>
            <span className="italic text-xs text-muted-foreground">
              {tool.args?.searchQuery}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 mt-4">
          {tool.result?.success?.results?.map((r: string, i: number) => {
            return (
              <Dialog key={i}>
                <Dialog.Trigger className="text-muted-foreground text-xs line-clamp-1 hover:underline hover:text-primary text-left">
                  Result {i + 1}: {r}
                </Dialog.Trigger>
                <Dialog.Content className="text-sm">
                  <Dialog.Header className="p-8 pb-4">
                    <Dialog.Title>Knowledge Result</Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Description className="p-8 pt-0 overflow-y-auto max-h-[calc(80vh-100px)]">
                    {r}
                  </Dialog.Description>
                </Dialog.Content>
              </Dialog>
            );
          })}
        </div>
      </div>
    </div>
  );
};
