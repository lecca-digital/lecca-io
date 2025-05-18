import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import useApiMutation from '../../api/use-api-mutation';
import { LlmFormFields } from '../../components/forms/llm-model-form-fields';
import { Button } from '../../components/ui/button';
import { Form } from '../../components/ui/form';
import { Separator } from '../../components/ui/separator';
import { Textarea } from '../../components/ui/textarea';
import { toast } from '../../hooks/useToast';
import { useUser } from '../../hooks/useUser';
import {
  UpdateWorkspacePreferencesType,
  updateWorkspacePreferencesSchema,
} from '../../models/workspace-preferences-model';

export function WorkspaceAgentsPage() {
  const { workspacePreferences, setWorkspacePreferences } = useUser();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UpdateWorkspacePreferencesType>({
    resolver: zodResolver(updateWorkspacePreferencesSchema),
    defaultValues: {
      defaultAgentLlmProvider:
        workspacePreferences?.defaultAgentLlmProvider ?? null,
      defaultAgentLlmModel: workspacePreferences?.defaultAgentLlmModel ?? null,
      defaultAgentLlmConnectionId:
        workspacePreferences?.defaultAgentLlmConnection?.id ?? null,
      defaultTaskNamingInstructions:
        workspacePreferences?.defaultTaskNamingInstructions ?? '',
      defaultTaskNamingLlmProvider:
        workspacePreferences?.defaultTaskNamingLlmProvider ?? null,
      defaultTaskNamingLlmModel:
        workspacePreferences?.defaultTaskNamingLlmModel ?? null,
      defaultTaskNamingLlmConnectionId:
        workspacePreferences?.defaultTaskNamingLlmConnection?.id ?? null,
    },
  });

  const mutation = useApiMutation({
    service: 'workspacePreferences',
    method: 'updateMe',
  });

  const onSubmit = async (data: UpdateWorkspacePreferencesType) => {
    setIsSubmitting(true);

    await mutation.mutateAsync(
      {
        data,
      },
      {
        onSuccess: (data) => {
          setWorkspacePreferences(data);
          toast({
            title: 'Settings saved',
            description: 'Your agent defaults have been updated.',
          });
        },
        onSettled: () => {
          setIsSubmitting(false);
        },
      },
    );
  };

  useEffect(() => {
    form.reset({
      defaultAgentLlmProvider:
        workspacePreferences?.defaultAgentLlmProvider ?? null,
      defaultAgentLlmModel: workspacePreferences?.defaultAgentLlmModel ?? null,
      defaultAgentLlmConnectionId:
        workspacePreferences?.defaultAgentLlmConnection?.id ?? null,
      defaultTaskNamingInstructions:
        workspacePreferences?.defaultTaskNamingInstructions ?? '',
      defaultTaskNamingLlmProvider:
        workspacePreferences?.defaultTaskNamingLlmProvider ?? null,
      defaultTaskNamingLlmModel:
        workspacePreferences?.defaultTaskNamingLlmModel ?? null,
      defaultTaskNamingLlmConnectionId:
        workspacePreferences?.defaultTaskNamingLlmConnection?.id ?? null,
    });
    form.getValues(); // DO NOT DELETE. HACK TO GET THE FORM TO RE-RENDER AND KEEP THE UPDATED VALUES AFTER SAVING. SUPER WEIRD
  }, [form, workspacePreferences]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Workspace Agent Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure default agent settings for all projects. <br />
          Projects can override these settings, but will default to these
          values.
        </p>
      </div>
      <Separator />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 overflow-y-auto h-[calc(100dvh-180px)]"
        >
          <div className="space-y-4">
            <h4 className="text-md font-medium">Default Agent Model</h4>
            <p className="text-sm text-muted-foreground">
              Set the default AI provider and model for new agents.
            </p>
            <LlmFormFields
              form={form}
              llmProviderFieldName="defaultAgentLlmProvider"
              llmProviderFieldLabel="Default Agent AI Provider"
              llmProviderFieldDescription="AI Provider used for new agents"
              llmModelFieldName="defaultAgentLlmModel"
              llmModelFieldLabel="Default Agent LLM"
              llmModelFieldDescription="LLM used for new agents"
              llmConnectionIdFieldName="defaultAgentLlmConnectionId"
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-md font-medium">Default Task Naming</h4>
            <p className="text-sm text-muted-foreground">
              Configure how agents name tasks by default.
            </p>

            <Form.Field
              control={form.control}
              name="defaultTaskNamingInstructions"
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
                      onChange={field.onChange}
                      value={field.value ?? undefined}
                    />
                  </Form.Control>
                  <Form.Message />
                </Form.Item>
              )}
            />

            <LlmFormFields
              form={form}
              llmProviderFieldName="defaultTaskNamingLlmProvider"
              llmProviderFieldLabel="Task Naming Provider"
              llmProviderFieldDescription="Default AI Provider for task naming"
              llmModelFieldName="defaultTaskNamingLlmModel"
              llmModelFieldLabel="Task Naming LLM"
              llmModelFieldDescription="Default LLM used to name tasks"
              llmConnectionIdFieldName="defaultTaskNamingLlmConnectionId"
            />
          </div>

          <Button loading={isSubmitting} type="submit">
            Save changes
          </Button>
        </form>
      </Form>
    </div>
  );
}
