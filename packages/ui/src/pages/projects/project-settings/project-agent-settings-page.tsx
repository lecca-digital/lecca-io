import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import useApiMutation from '../../../api/use-api-mutation';
import useApiQuery from '../../../api/use-api-query';
import { LlmFormFields } from '../../../components/forms/llm-model-form-fields';
import { Loader } from '../../../components/loaders/loader';
import { Button } from '../../../components/ui/button';
import { Form } from '../../../components/ui/form';
import { Separator } from '../../../components/ui/separator';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from '../../../hooks/useToast';
import {
  UpdateProjectType,
  updateProjectSchema,
} from '../../../models/project/project-model';

export default function ProjectAgentSettingsPage() {
  const { projectId } = useParams();
  const { data: project, isLoading: isLoadingProject } = useApiQuery({
    service: 'projects',
    method: 'getById',
    apiLibraryArgs: {
      id: projectId!,
    },
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<UpdateProjectType>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      defaultAgentLlmProvider: null,
      defaultAgentLlmModel: null,
      defaultAgentLlmConnectionId: null,
      defaultTaskNamingInstructions: '',
      defaultTaskNamingLlmProvider: null,
      defaultTaskNamingLlmModel: null,
      defaultTaskNamingLlmConnectionId: null,
    },
  });

  const updateMutation = useApiMutation({
    service: 'projects',
    method: 'update',
  });

  const onSubmit = async (data: UpdateProjectType) => {
    setIsSubmitting(true);

    await updateMutation.mutateAsync(
      {
        id: projectId,
        data,
      },
      {
        onSuccess: () => {
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
    if (project) {
      form.reset({
        defaultAgentLlmProvider: project.defaultAgentLlmProvider ?? null,
        defaultAgentLlmModel: project.defaultAgentLlmModel ?? null,
        defaultAgentLlmConnectionId:
          project.defaultAgentLlmConnection?.id ?? null,
        defaultTaskNamingInstructions:
          project.defaultTaskNamingInstructions ?? '',
        defaultTaskNamingLlmProvider:
          project.defaultTaskNamingLlmProvider ?? null,
        defaultTaskNamingLlmModel: project.defaultTaskNamingLlmModel ?? null,
        defaultTaskNamingLlmConnectionId:
          project.defaultTaskNamingLlmConnection?.id ?? null,
      });
      form.getValues(); // DO NOT DELETE. HACK TO GET THE FORM TO RE-RENDER AND KEEP THE UPDATED VALUES AFTER SAVING. SUPER WEIRD
    }
  }, [form, project]);

  if (isLoadingProject) {
    return <Loader />;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Project Agent Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure default agent settings for this project.
          <br />
          Agents can override these settings, but will default to these values.
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
              Set the default AI provider and model for new agents in this
              project.
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
              Configure how agents name tasks by default in this project.
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
