import React, { useCallback, useEffect } from 'react';

import { Icons } from '../../../../components/icons';
import { AutosizeTextarea } from '../../../../components/ui/autosize-textarea';
import { Button } from '../../../../components/ui/button';
import { Dialog } from '../../../../components/ui/dialog';
import { DropdownMenu } from '../../../../components/ui/dropdown-menu';
import { Label } from '../../../../components/ui/label';
import { Tooltip } from '../../../../components/ui/tooltip';
import { cn } from '../../../../utils/cn';
import { getUploadUrlForTempFile } from '../utils/get-upload-url';
import { resizeFile } from '../utils/resize-file';

import { MessageImageUrlForm } from './message-image-url-form';
import { UploadImageForMessageForm } from './upload-image-for-message-form';

export const ChatInput = ({
  handleInputChange,
  handleSubmit,
  isLoading,
  input,
  setInput,
  setImageData,
  imageData,
  stop,
  hasToolsButCannotUseThem,
}: {
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>,
  ) => void;
  handleSubmit: () => void;
  isLoading: boolean;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setImageData: React.Dispatch<React.SetStateAction<string[]>>;
  imageData: string[];
  stop: () => void;
  hasToolsButCannotUseThem: boolean;
}) => {
  const [initialRender, setInitialRender] = React.useState(true);

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }

      if (event.key === 'Enter' && event.shiftKey) {
        event.preventDefault();
        setInput((prev) => prev + '\n');
      }
    },
    [handleSubmit, setInput],
  );

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = event.clipboardData.items;
      const imageItem = Array.from(items).find((item) =>
        item.type.startsWith('image'),
      );

      if (imageItem) {
        event.preventDefault();
        const blob = imageItem.getAsFile();

        if (!blob) return;

        // Generate a unique filename
        const fileName = `pasted-image-${Date.now()}.jpg`;

        let file = blob as any;
        //Resize file if it's not a svg
        if (blob.type !== 'image/svg+xml') {
          file = (await resizeFile(blob)) as Blob;
        }

        const uploadUrlData = await getUploadUrlForTempFile({
          fileName: fileName,
        });

        if (!uploadUrlData) {
          return;
        }

        const { presignedPostData, imageUrl } = uploadUrlData;

        try {
          const formData = new FormData();
          Object.entries(presignedPostData.fields).forEach(([key, value]) => {
            formData.append(key, value);
          });
          formData.append('file', file);

          const result = await fetch(presignedPostData.url, {
            method: 'POST',
            body: formData,
          });

          if (!result.ok) {
            // Handle error - add your toast notification here
            console.error('Upload failed');
          } else {
            setImageData((prev) => [...prev, imageUrl!]);
          }
        } catch (err) {
          // Handle error - add your toast notification here
          console.error('Upload failed:', err);
        }
      }
    },
    [setImageData],
  );

  useEffect(() => {
    setTimeout(() => {
      /**
       * A hack to prevent the chat input to take focus when it it rerendered.
       * It is rerendered when the user is updating the name, description, avatar, or
       * any advanced settings on the agent. We don't the the focus to be taken away
       * while they're in the middle of typing something not in the chat input.
       */
      setInitialRender(false);
    }, 100);
  }, []);

  return (
    <div
      className={cn('', {
        'bg-gradient-to-t from-background via-background/80 via-80% to-bg-background':
          true,
      })}
    >
      <div className={cn(`relative`)}>
        <Label htmlFor="message" className="sr-only">
          Message
        </Label>
        <div className="absolute flex items-center bottom-2 left-2">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Tooltip>
                <Tooltip.Trigger id="onboarding-agents-overview-add-content">
                  <Button variant={'ghost'} size="icon" disabled={!!imageData}>
                    <Icons.plusCircled className={cn('size-6')} />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Add Content</Tooltip.Content>
              </Tooltip>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content side="top" sideOffset={14}>
              <UploadImageForMessageForm setImageData={setImageData}>
                <DropdownMenu.Item
                  className="flex items-center space-x-3"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Icons.uploadFile className="size-4" />
                  <span>Upload from Device</span>
                </DropdownMenu.Item>
              </UploadImageForMessageForm>
              <Dialog>
                <Dialog.Trigger asChild>
                  <DropdownMenu.Item
                    className="flex items-center justify-start space-x-3"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Icons.link className="size-4" />
                    <span>Image Address</span>
                  </DropdownMenu.Item>
                </Dialog.Trigger>
                <Dialog.Content>
                  <MessageImageUrlForm setImageData={setImageData} />
                </Dialog.Content>
              </Dialog>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
        {imageData.length ? (
          <ChatImageContainer
            imageData={imageData}
            setImageData={setImageData}
          />
        ) : null}
        {hasToolsButCannotUseThem && (
          <div className="flex items-center justify-center text-muted-foreground text-sm animate-pulse mb-2 text-center mt-1">
            This AI model does not support using tools. Remove all tools before
            messaging your agent.
          </div>
        )}
        <AutosizeTextarea
          autoComplete="off"
          autoFocus={initialRender}
          disabled={isLoading}
          value={input}
          onChange={handleInputChange}
          onPaste={handlePaste}
          placeholder={`How can I help you today?`}
          onKeyDown={handleKeyPress}
          maxHeight={200}
          minHeight={1}
          rows={1}
          className="px-14 py-4 bg-muted/80 border border-muted-foreground/20 rounded-3xl"
        />
        <div className="absolute flex items-center bottom-2 right-2">
          <Button
            variant={'ghost'}
            onClick={() => {
              if (isLoading) {
                stop();
              } else {
                handleSubmit();
              }
            }}
            disabled={!input.trim() && !isLoading}
            size="icon"
            className={cn('', {
              'text-muted-foreground': !isLoading && !input.trim(),
              'text-primary': isLoading || input.trim(),
              'hover:text-primary': isLoading || input.trim(),
              'cursor-not-allowed': !isLoading && !input.trim(),
              'cursor-pointer': isLoading || input.trim(),
            })}
          >
            {isLoading ? (
              <Icons.pause className="size-6" />
            ) : (
              <Icons.send className={cn('size-6')} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

function ChatImageContainer({
  imageData,
  setImageData,
}: {
  imageData: string[];
  setImageData: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <div className="absolute bottom-full -translate-y-2 flex space-x-3">
      {imageData.map((image, index) => (
        <div
          key={image + index}
          className="relative bg-muted border rounded h-16"
        >
          <img
            src={image}
            alt="Uploaded"
            className="w-full h-full max-w-16 rounded object-cover shadow"
          />
          <Button
            className="absolute right-0 top-0 rounded-full size-4 p-0.5 translate-x-1 -translate-y-1.5"
            size={'icon'}
          >
            <Icons.x
              className="size-4"
              onClick={() => {
                setImageData((prev) => prev.filter((_, i) => i !== index));
              }}
            />
          </Button>
        </div>
      ))}
    </div>
  );
}
