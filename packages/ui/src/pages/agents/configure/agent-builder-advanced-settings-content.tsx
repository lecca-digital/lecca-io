import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { api } from '../../../api/api-library';
import useApiMutation from '../../../api/use-api-mutation';
import useApiQuery from '../../../api/use-api-query';
import { CreateConnectionForm } from '../../../components/forms/create-connection-form';
import { Icons } from '../../../components/icons';
import { Button } from '../../../components/ui/button';
import { Dialog } from '../../../components/ui/dialog';
import { Form } from '../../../components/ui/form';
import { Select } from '../../../components/ui/select';
import { Skeleton } from '../../../components/ui/skeleton';
import { Slider } from '../../../components/ui/slider';
import { Textarea } from '../../../components/ui/textarea';
import { Tooltip } from '../../../components/ui/tooltip';
import { useToast } from '../../../hooks/useToast';
import { useUser } from '../../../hooks/useUser';
import {
  Agent,
  UpdateAgentType,
  createAgentSchema,
} from '../../../models/agent/agent-model';
import {
  AiLanguageModelData,
  AiProvider,
} from '../../../models/ai-provider-model';
import { Connection } from '../../../models/connections-model';
import { cn } from '../../../utils/cn';
import { debounce } from '../../../utils/debounce';

type PropType = {
  agent: Agent;
};

export function AgentBuilderAdvancedSettingsContent({ agent }: PropType) {
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

  const saveAgentMutation = useApiMutation({
    service: 'agents',
    method: 'update',
  });

  const form = useForm<UpdateAgentType>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: agent.name,
      description: agent.description,
      instructions: agent.instructions,
      taskNamingInstructions: agent.taskNamingInstructions,
      connectionIds: agent.connections?.map((c) => c.id) ?? [], //Legacy
      knowledgeIds: agent.agentKnowledge?.map((k) => k.id) ?? [], //Legacy
      actionIds: agent.agentActions?.map((a) => a.id) ?? [], //Legacy
      workflowIds: agent.agentWorkflows?.map((w) => w.id) ?? [], //Legacy
      agentIds: agent.agentSubAgents?.map((a) => a.id) ?? [], //Legacy
      variableIds: agent.agentVariables?.map((v) => v.id) ?? [], //Legacy
      webAccess:
        agent.agentWebAccess?.webSearchEnabled ||
        agent.agentWebAccess?.websiteAccessEnabled ||
        false, //Legacy
      phoneAccess:
        agent.agentPhoneAccess?.inboundCallsEnabled ||
        agent.agentPhoneAccess?.outboundCallsEnabled ||
        false, //Legacy
      llmProvider: agent.llmProvider,
      llmModel: agent.llmModel,
      llmConnectionId: agent.llmConnection?.id ?? null,
      maxToolRoundtrips: agent.maxToolRoundtrips,
      frequencyPenalty: agent.frequencyPenalty,
      presencePenalty: agent.presencePenalty,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      messageLookbackLimit: agent.messageLookbackLimit,
      maxRetries: agent.maxRetries,
      seed: agent.seed,
      tools: agent.tools,
      topP: agent.topP,
    },
  });

  const watchProvider = form.watch('llmProvider');
  const watchLlmConnection = form.watch('llmConnectionId');

  useEffect(() => {
    const handleSave = debounce((values) => {
      saveAgentMutation.mutate({
        id: agent.id,
        data: {
          instructions: values.instructions,
          taskNamingInstructions: values.taskNamingInstructions,
          llmProvider: values.llmProvider,
          llmModel: values.llmModel,
          llmConnectionId: values.llmConnectionId,
          maxToolRoundtrips: values.maxToolRoundtrips,
          temperature: values.temperature,
          maxTokens: values.maxTokens,
          frequencyPenalty: values.frequencyPenalty,
          presencePenalty: values.presencePenalty,
          maxRetries: values.maxRetries,
        },
      });
    }, 500);

    const subscription = form.watch(handleSave);

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [agent.id, form, saveAgentMutation]);

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
          providerId: form.getValues('llmProvider') as AiProvider,
          connectionId: form.getValues('llmConnectionId') ?? 'credits',
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
  }, [form, watchProvider, watchLlmConnection, toast]);

  return (
    <Form {...form}>
      <form className="w-full">
        <Form.Content className="space-y-8">
          <div className="flex flex-wrap gap-8">
            <Form.Field
              control={form.control}
              name="llmProvider"
              render={({ field }) => (
                <Form.Item className="space-y-1 flex-1">
                  <Form.Label>AI Provider</Form.Label>
                  <Select
                    onValueChange={(value: AiProvider) => {
                      field.onChange(value);
                      form.setValue('llmConnectionId', null);
                      form.setValue(
                        'llmModel',
                        Object.keys(
                          aiProviders[value]?.languageModels ?? {},
                        )?.[0],
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
                    AI Provider of LLM Model.
                  </Form.Description>
                  <Form.Message />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="llmModel"
              render={({ field }) => (
                <Form.Item className="space-y-1 flex-1">
                  <Form.Label>LLM Model</Form.Label>
                  {isLoadingModels ? (
                    <Skeleton className="h-9 w-full" />
                  ) : (
                    <Select
                      {...form.register('llmModel', {
                        required: 'Please select an LLM model',
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
                              : 'Select an LLM model'
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
                      LLM Model Agent will use.
                    </Form.Description>
                  )}
                  <Form.Message />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="llmConnectionId"
              render={({ field }) => (
                <Form.Item
                  className={cn('space-y-1 flex-1', {
                    hidden:
                      !form.getValues('llmProvider') ||
                      form.getValues('llmProvider') === 'ollama',
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
                                    (connection) =>
                                      connection.id === field.value,
                                  )?.name ?? 'Select an LLM connection')
                                : 'Select an LLM connection'
                            }
                          />
                        </Select.Trigger>
                        <Select.Content>
                          {llmConnectionsForProvider?.map((connection) => (
                            <Select.Item
                              key={connection.id}
                              value={connection.id}
                            >
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
                      <span>Use your API key instead of credits.</span>
                    )}
                    <Tooltip>
                      <Tooltip.Trigger type="button">
                        <Icons.infoCircle className="size-3" />
                      </Tooltip.Trigger>
                      <Tooltip.Content side="bottom" className="max-w-96">
                        Create a connection for the AI Provider you have
                        selected. Once you have created that connection, you
                        should see the connection available within the dropdown.
                      </Tooltip.Content>
                    </Tooltip>
                  </Form.Description>
                  <Form.Message />
                </Form.Item>
              )}
            />
          </div>

          <Form.Field
            control={form.control}
            name="instructions"
            render={({ field }) => (
              <Form.Item>
                <Form.Label tooltip="How should your agent behave? What is it's goal? When should it use certain tools? You may need to tweak these instructions until you get the behavior and outputs you expect from your agent.">
                  Instructions
                </Form.Label>
                <Form.Control>
                  <Textarea
                    placeholder="e.g. You are a helpful assistant. Anytime I receive an email, I want you to draft a response using the tools I provide you."
                    className="placeholder:opacity-70 placeholder:italic"
                    rows={10}
                    {...field}
                  />
                </Form.Control>
                <Form.Message />
              </Form.Item>
            )}
          />

          <Form.Field
            control={form.control}
            name="maxToolRoundtrips"
            render={({ field }) => {
              const defaultValue = 5;

              return (
                <Form.Item>
                  <div className="flex justify-between">
                    <Form.Label tooltip="To prevent your agent from making using too many tools at once, you can set a limit. Set to 0 to disable this and only allow your agent to use one tool per query.">
                      Maximum Tool Roundtrips
                    </Form.Label>
                    <div className="text-muted-foreground text-sm">
                      {field.value ?? defaultValue}
                    </div>
                  </div>
                  <Form.Control>
                    <Slider
                      className="pt-1"
                      min={0}
                      max={50}
                      step={1}
                      onValueChange={(values) => field.onChange(values[0])}
                      value={
                        field.value != null ? [field.value] : [defaultValue]
                      }
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              );
            }}
          />
          <Form.Field
            control={form.control}
            name="temperature"
            render={({ field }) => {
              const defaultValue = 1;

              return (
                <Form.Item>
                  <div className="flex justify-between">
                    <Form.Label tooltip="Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.">
                      Temperature
                    </Form.Label>
                    <div className="text-muted-foreground text-sm">
                      {field.value ?? defaultValue}
                    </div>
                  </div>
                  <Form.Control>
                    <Slider
                      className="pt-1"
                      min={0}
                      max={2}
                      step={0.01}
                      onValueChange={(values) => field.onChange(values[0])}
                      value={
                        field.value != null ? [field.value] : [defaultValue]
                      }
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              );
            }}
          />
          <Form.Field
            control={form.control}
            name="frequencyPenalty"
            render={({ field }) => {
              const defaultValue = 0;

              return (
                <Form.Item>
                  <div className="flex justify-between">
                    <Form.Label tooltip="How much to penalize new tokens based on their existing frequency in the text so far. Decreases the model's likelihood to repeat the same line verbatim.">
                      Frequency Penalty
                    </Form.Label>
                    <div className="text-muted-foreground text-sm">
                      {field.value ?? defaultValue}
                    </div>
                  </div>
                  <Form.Control>
                    <Slider
                      className="pt-1"
                      min={0}
                      max={2}
                      step={0.01}
                      onValueChange={(values) => field.onChange(values[0])}
                      value={
                        field.value != null ? [field.value] : [defaultValue]
                      }
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              );
            }}
          />
          <Form.Field
            control={form.control}
            name="presencePenalty"
            render={({ field }) => {
              const defaultValue = 0;

              return (
                <Form.Item>
                  <div className="flex justify-between">
                    <Form.Label tooltip="How much to penalize new tokens based on whether they appear in the text so far. Increases the model's likelihood to talk about new topics.">
                      Presence Penalty
                    </Form.Label>
                    <div className="text-muted-foreground text-sm">
                      {field.value ?? defaultValue}
                    </div>
                  </div>
                  <Form.Control>
                    <Slider
                      className="pt-1"
                      min={0}
                      max={2}
                      step={0.01}
                      onValueChange={(values) => field.onChange(values[0])}
                      value={
                        field.value != null ? [field.value] : [defaultValue]
                      }
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              );
            }}
          />
          <Form.Field
            control={form.control}
            name="maxRetries"
            render={({ field }) => {
              const defaultValue = 0;

              return (
                <Form.Item>
                  <div className="flex justify-between">
                    <Form.Label tooltip="Maximum number of retries when the AI model fails for an unknown reason. Set to 0 to disable retries.">
                      Maximum Retries
                    </Form.Label>
                    <div className="text-muted-foreground text-sm">
                      {field.value ?? defaultValue}
                    </div>
                  </div>
                  <Form.Control>
                    <Slider
                      className="pt-1"
                      min={0}
                      max={10}
                      step={1}
                      onValueChange={(values) => field.onChange(values[0])}
                      value={
                        field.value != null ? [field.value] : [defaultValue]
                      }
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              );
            }}
          />

          <Form.Field
            control={form.control}
            name="taskNamingInstructions"
            render={({ field }) => (
              <Form.Item>
                <Form.Label tooltip="Your agent will name new tasks (conversations) using the first message as context. You can add extra instructions here to tell your agent how to name the task.">
                  Task Naming Instructions
                </Form.Label>
                <Form.Control>
                  <Textarea
                    placeholder="e.g. When naming a task follow these additional instructions..."
                    className="placeholder:opacity-70 placeholder:italic"
                    rows={5}
                    {...field}
                  />
                </Form.Control>
                <Form.Message />
              </Form.Item>
            )}
          />
        </Form.Content>
      </form>
    </Form>
  );
}
