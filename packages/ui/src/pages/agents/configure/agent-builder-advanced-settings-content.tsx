import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import useApiMutation from '../../../api/use-api-mutation';
import { LlmFormFields } from '../../../components/forms/llm-model-form-fields';
import { Form } from '../../../components/ui/form';
import { Slider } from '../../../components/ui/slider';
import { Textarea } from '../../../components/ui/textarea';
import {
  Agent,
  UpdateAgentType,
  createAgentSchema,
} from '../../../models/agent/agent-model';
import { debounce } from '../../../utils/debounce';

type PropType = {
  agent: Agent;
};

export function AgentBuilderAdvancedSettingsContent({ agent }: PropType) {
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
      taskNamingInstructions: agent.taskNamingInstructions ?? '',
      taskNamingLlmProvider: agent.taskNamingLlmProvider ?? null,
      taskNamingLlmModel: agent.taskNamingLlmModel ?? null,
      taskNamingLlmConnectionId: agent.taskNamingLlmConnection?.id ?? null,
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

  useEffect(() => {
    const handleSave = debounce((values) => {
      saveAgentMutation.mutate({
        id: agent.id,
        data: {
          instructions: values.instructions,
          llmProvider: values.llmProvider,
          llmModel: values.llmModel,
          llmConnectionId: values.llmConnectionId,
          taskNamingInstructions: values.taskNamingInstructions,
          taskNamingLlmProvider: values.taskNamingLlmProvider,
          taskNamingLlmModel: values.taskNamingLlmModel,
          taskNamingLlmConnectionId: values.taskNamingLlmConnectionId,
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

  return (
    <Form {...form}>
      <form className="w-full">
        <Form.Content className="space-y-8">
          <LlmFormFields
            form={form}
            llmProviderFieldName="llmProvider"
            llmProviderFieldLabel="AI Provider"
            llmProviderFieldDescription="AI Provider of LLM"
            llmModelFieldName="llmModel"
            llmModelFieldLabel="Agent LLM"
            llmModelFieldDescription="LLM that powers agent"
            llmConnectionIdFieldName="llmConnectionId"
          />

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

          <LlmFormFields
            form={form}
            llmProviderFieldName="taskNamingLlmProvider"
            llmProviderFieldLabel="Task Naming Provider"
            llmProviderFieldDescription="AI Provider of LLM"
            llmModelFieldName="taskNamingLlmModel"
            llmModelFieldLabel="Task Naming LLM"
            llmModelFieldDescription="LLM used to name tasks"
            llmConnectionIdFieldName="taskNamingLlmConnectionId"
          />
        </Form.Content>
      </form>
    </Form>
  );
}
