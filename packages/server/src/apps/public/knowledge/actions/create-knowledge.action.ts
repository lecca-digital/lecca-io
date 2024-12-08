import { z } from 'zod';

import { Action, RunActionArgs } from '@/apps/lib/action';
import { InputConfig } from '@/apps/lib/input-config';
import { ServerConfig } from '@/config/server.config';

import { Knowledge } from '../knowledge.app';

export class CreateKnowledge extends Action {
  app: Knowledge;
  id = 'knowledge_action_create-knowledge';
  needsConnection = false;
  name = 'Create Knowledge Notebook';
  iconUrl: null | string =
    `${ServerConfig.INTEGRATION_ICON_BASE_URL}/actions/${`knowledge_action_search-knowledge`}.svg`;
  description = 'Creates a new knowledge notebook';
  aiSchema = z.object({
    name: z.string().min(1).describe('The name of the new notebook'),
    description: z
      .string()
      .nullable()
      .optional()
      .describe('Description of the new notebook'),
    saveToOption: z
      .enum(['project', 'workspace'])
      .describe(
        'Select whether to save the notebook to the workspace or project',
      ),
  });
  inputConfig: InputConfig[] = [
    {
      id: 'name',
      label: 'Name',
      description: 'The name of the new notebook',
      inputType: 'text',
      placeholder: 'Add a name',
      required: {
        missingMessage: 'Name is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'description',
      label: 'Description',
      description: 'The description of the new notebook',
      inputType: 'text',
      placeholder: 'Add optional description',
    },
    {
      id: 'saveToOption',
      label: 'Save to?',
      description:
        'Select whether to save the notebook to the workspace or project',
      inputType: 'select',
      hideCustomTab: true,
      selectOptions: [
        {
          label: 'Save to Project',
          value: 'project',
        },
        {
          label: 'Save to Workspace',
          value: 'workspace',
        },
      ],
      required: {
        missingMessage: 'Must select where to save',
        missingStatus: 'warning',
      },
    },
  ];

  async run({
    configValue,
    projectId,
    workspaceId,
  }: RunActionArgs<ConfigValue>): Promise<Response> {
    const newNotebook = await this.app.knowledge.create({
      data: {
        name: configValue.name,
        description: configValue.description,
        projectId:
          configValue.saveToOption === 'project' ? projectId : undefined,
      },
      workspaceId,
      expansion: {
        project: true,
        description: true,
      },
    });

    return {
      notebook: newNotebook,
    };
  }

  async mockRun(): Promise<Response> {
    return {
      notebook: {
        id: '123',
        name: 'New Notebook',
        description: 'New Notebook Description',
      },
    };
  }
}

type ConfigValue = z.infer<CreateKnowledge['aiSchema']>;

type Response = any;
