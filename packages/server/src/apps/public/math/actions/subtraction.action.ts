import { z } from 'zod';

import { Action, RunActionArgs } from '@/apps/lib/action';
import { InputConfig } from '@/apps/lib/input-config';
import { NodeViewOptions } from '@/apps/lib/trigger';
import { ServerConfig } from '@/config/server.config';

import { Math as MathApp } from '../math.app';

export class Subtraction extends Action {
  app: MathApp;
  id = 'math_action_subtraction';
  name = 'Subtraction';
  iconUrl: null | string =
    `${ServerConfig.INTEGRATION_ICON_BASE_URL}/apps/${this.app.id}.svg`;
  needsConnection = false;
  description = 'Subtracts one number from another.';
  viewOptions: null | NodeViewOptions = {
    saveButtonOptions: {
      replaceSaveAndTestButton: {
        label: 'Save & Test',
        type: 'real',
      },
    },
  };
  aiSchema = z.object({
    number1: z.number(),
    number2: z.number(),
  });
  inputConfig: InputConfig[] = [
    {
      id: 'number1',
      label: 'First Number',
      description: '',
      inputType: 'number',
      required: {
        missingMessage: 'First number is required',
        missingStatus: 'warning',
      },
    },
    {
      id: 'number2',
      label: 'Second Number',
      description: '',
      inputType: 'number',
      required: {
        missingMessage: 'Second number is required',
        missingStatus: 'warning',
      },
    },
  ];

  async run({ configValue }: RunActionArgs<ConfigValue>): Promise<Response> {
    const num1 = Number(configValue.number1);
    const num2 = Number(configValue.number2);

    return { result: num1 - num2 };
  }

  async mockRun(): Promise<unknown> {
    return { result: 42 };
  }
}

type ConfigValue = z.infer<Subtraction['aiSchema']>;

type Response = {
  result: number;
};
