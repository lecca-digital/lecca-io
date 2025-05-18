import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { api } from '../../api/api-library';
import useApiQuery from '../../api/use-api-query';
import { useToast } from '../../hooks/useToast';
import { useUser } from '../../hooks/useUser';
import {
  AiLanguageModelData,
  AiProvider,
} from '../../models/ai-provider-model';
import { Connection } from '../../models/connections-model';
import { cn } from '../../utils/cn';
import { Icons } from '../icons';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Form } from '../ui/form';
import { Select } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Tooltip } from '../ui/tooltip';

import { CreateConnectionForm } from './create-connection-form';

type Props = {
  form: UseFormReturn;
  llmProviderFieldLabel: string;
  llmProviderFieldName: string; //llmProvider, defaultTaskNamingLlmProvider, .etc
  llmProviderFieldDescription: string;
  llmModelFieldLabel: string;
  llmModelFieldName: string; //llmModel, defaultTaskNamingLlmModel, .etc
  llmModelFieldDescription: string;
  llmConnectionIdFieldName: string; //llmConnectionId, taskNamingLlmConnectionId, defaultTaskNamingLlmConnectionId, .etc
};

export function LlmFormFields({
  form,
  llmProviderFieldName,
  llmProviderFieldLabel,
  llmProviderFieldDescription,
  llmModelFieldName,
  llmModelFieldLabel,
  llmModelFieldDescription,
  llmConnectionIdFieldName,
}: Props) {
  const { aiProviders } = useUser();
  const { toast } = useToast();
  const [loadedModels, setLoadedModels] = useState<Record<
    string,
    AiLanguageModelData
  > | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const { data: connections, isLoading: isLoadingConnections } = useApiQuery({
    service: 'connections',
    method: 'getList',
    apiLibraryArgs: {},
  });

  const [llmConnectionsForProvider, setLlmConnectionsForProvider] = useState<
    Connection[]
  >([]);

  const watchProvider = form.watch(llmProviderFieldName);
  const watchLlmConnection = form.watch(llmConnectionIdFieldName);

  useEffect(() => {
    if (connections?.length && watchProvider) {
      const provider = aiProviders[watchProvider as AiProvider];
      const providerConnectionId = provider?.appConnectionId;

      if (providerConnectionId) {
        setLlmConnectionsForProvider(
          connections.filter((connection) => {
            return connection.connectionId === providerConnectionId;
          }),
        );
      } else {
        setLlmConnectionsForProvider([]);
      }
    }
  }, [aiProviders, connections, watchProvider]);

  useEffect(() => {
    if (watchProvider) {
      setIsLoadingModels(true);

      api.aiProviders
        .getProviderModels({
          providerId: form.getValues(llmProviderFieldName) as AiProvider,
          connectionId: form.getValues(llmConnectionIdFieldName) ?? 'credits',
        })
        .then(({ data, error }) => {
          if (data) {
            setLoadedModels(data);
          } else if (error) {
            toast({
              title: error,
              variant: 'destructive',
            });
          }
        })
        .finally(() => {
          setIsLoadingModels(false);
        });
    }
  }, [
    form,
    watchProvider,
    watchLlmConnection,
    toast,
    llmProviderFieldName,
    llmConnectionIdFieldName,
  ]);

  return (
    <div className="flex flex-wrap gap-8">
      <Form.Field
        control={form.control}
        name={llmProviderFieldName}
        render={({ field }) => (
          <Form.Item className="space-y-1 flex-1">
            <Form.Label>{llmProviderFieldLabel}</Form.Label>
            <Select
              onValueChange={(value: AiProvider) => {
                field.onChange(value);
                form.setValue(llmConnectionIdFieldName, null);
                form.setValue(
                  llmModelFieldName,
                  Object.keys(aiProviders[value]?.languageModels ?? {})?.[0],
                );
              }}
            >
              <Select.Trigger>
                <Select.Value
                  placeholder={
                    field.value
                      ? Object.keys(aiProviders).find(
                          (provider) => provider === field.value,
                        )
                      : 'Select an AI Provider'
                  }
                />
              </Select.Trigger>
              <Select.Content>
                {Object.keys(aiProviders)?.map((provider) => (
                  <Select.Item key={provider} value={provider}>
                    {provider}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Form.Description className="pt-1 ml-1">
              {llmProviderFieldDescription}
            </Form.Description>
            <Form.Message />
          </Form.Item>
        )}
      />
      <Form.Field
        control={form.control}
        name={llmModelFieldName}
        render={({ field }) => (
          <Form.Item className="space-y-1 flex-1">
            <Form.Label>{llmModelFieldLabel}</Form.Label>
            {isLoadingModels ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                {...form.register(llmModelFieldName, {
                  required: 'Please select a language model',
                })}
                onValueChange={(value) => {
                  field.onChange(value);
                }}
              >
                <Select.Trigger>
                  <Select.Value
                    placeholder={
                      field.value
                        ? Object.keys(loadedModels ?? {}).find(
                            (model) => model === field.value,
                          )
                        : 'Select a language model'
                    }
                  />
                </Select.Trigger>
                <Select.Content>
                  {Object.keys(loadedModels ?? {})?.map((model) => (
                    <Select.Item key={model} value={model}>
                      {model}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            )}
            {loadedModels &&
            Object.keys(loadedModels).length === 0 &&
            !aiProviders[watchProvider as AiProvider]
              ?.platformCredentialsEnabled ? (
              <Form.Description className="pt-1 ml-1">
                Add your API key to list available models.
              </Form.Description>
            ) : (
              <Form.Description className="pt-1 ml-1">
                {llmModelFieldDescription}
              </Form.Description>
            )}
            <Form.Message />
          </Form.Item>
        )}
      />
      <Form.Field
        control={form.control}
        name={llmConnectionIdFieldName}
        render={({ field }) => (
          <Form.Item
            className={cn('space-y-1 flex-1', {
              hidden:
                !form.getValues(llmProviderFieldName) ||
                form.getValues(llmProviderFieldName) === 'ollama',
            })}
          >
            <Form.Label>LLM Connection</Form.Label>
            {isLoadingConnections ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <div className="flex space-x-2">
                <Select
                  key={`llm-connection-${field.value}`}
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
                >
                  <Select.Trigger>
                    <Select.Value
                      placeholder={
                        field.value
                          ? (llmConnectionsForProvider.find(
                              (connection) => connection.id === field.value,
                            )?.name ?? 'Select an LLM connection')
                          : 'Select an LLM connection'
                      }
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {llmConnectionsForProvider?.map((connection) => (
                      <Select.Item key={connection.id} value={connection.id}>
                        {connection.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                {field.value ? (
                  <Button
                    className="flex space-x-1"
                    type="button"
                    variant="ghost"
                    size={'sm'}
                    onClick={() => {
                      field.onChange(null);
                    }}
                  >
                    <span className="text-xs">Clear</span>
                    <Icons.x className="size-3" />
                  </Button>
                ) : (
                  <Dialog>
                    <Dialog.Trigger>
                      <Icons.plusCircled className="h-7 w-6 p-1" />{' '}
                    </Dialog.Trigger>
                    <Dialog.Content>
                      <CreateConnectionForm />
                    </Dialog.Content>
                  </Dialog>
                )}
              </div>
            )}
            <Form.Description className="pt-1 ml-1 space-x-1 items-center">
              {!aiProviders[watchProvider as AiProvider]
                ?.platformCredentialsEnabled ? (
                <span className={cn({ 'text-red-500': !field.value })}>
                  This provider requires an API key.
                </span>
              ) : (
                <span>Use an API key instead of credits.</span>
              )}
              <Tooltip>
                <Tooltip.Trigger type="button">
                  <Icons.infoCircle className="size-3" />
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom" className="max-w-96">
                  Create a connection for the AI Provider you have selected.
                  Once you have created that connection, you should see the
                  connection available within the dropdown.
                </Tooltip.Content>
              </Tooltip>
            </Form.Description>
            <Form.Message />
          </Form.Item>
        )}
      />
    </div>
  );
}
