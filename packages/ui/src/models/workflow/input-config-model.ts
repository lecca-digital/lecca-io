import { z } from 'zod';

//Separating the list into common and unique so I can iterate over common for the config builder forms
export const COMMON_INPUT_TYPES = [
  'text',
  'number',
  'select',
  'date',
  'date-time',
] as const;

export const UNIQUE_INPUT_TYPES = [
  'file',
  'dynamic-select',
  'dynamic-multi-select',
  'date-range',
  'switch',
  'map',
  'markdown',
  'dynamic-workflow-webhook-url',
  'conditional-paths',
  'ab-test-paths',
  'resume-execution',
  'decide-paths',
  'config-builder',
  'dynamic-input-config',
  'static-input-config',
  'multi-select', //Not putting this into common until we have a better multi select
  'json',
  'code',
] as const;

export const inputTypeSchema = z.enum([
  ...UNIQUE_INPUT_TYPES,
  ...COMMON_INPUT_TYPES,
]);

export type CommonInputType = (typeof COMMON_INPUT_TYPES)[number];
export type UniqueInputType = (typeof UNIQUE_INPUT_TYPES)[number];
export type InputType = z.infer<typeof inputTypeSchema>;

export const fieldConfigSchema = z.object({
  id: z.string(),
  label: z.string(),
  inputType: inputTypeSchema,
  occurenceType: z.enum(['single', 'multiple', 'dynamic']).optional(),
  selectOptions: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  switchOptions: z
    .object({
      checked: z.string(),
      unchecked: z.string(),
      defaultChecked: z.boolean(),
    })
    .optional(),
  numberOptions: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      step: z.number().optional(),
    })
    .optional(),
  mapOptions: z
    .object({
      keyPlaceholder: z.string().optional(),
      valuePlaceholder: z.string().optional(),
      disableKeyInput: z.boolean().optional(),
      disableValueInput: z.boolean().optional(),
    })
    .optional(),
  placeholder: z.string().optional(),
  description: z.string(),
  hideCustomTab: z.boolean().optional(),
  value: z.any().optional(),
  raw: z.any().optional(),
  markdown: z.string().optional(),
  defaultValue: z.any(),
  required: z
    .object({
      missingMessage: z.string(),
      missingStatus: z.string(),
    })
    .optional(),
  loadOptions: z
    .object({
      dependsOn: z.array(
        z.union([
          z.string(),
          z.object({
            id: z.string(),
            value: z.string(), // z.array(z.string()).optional(),
          }),
        ]),
      ),
      executionOnly: z.boolean().optional(),
      workflowOnly: z.boolean().optional(),
      forceRefresh: z.boolean().optional(),
      hideRefreshButton: z.boolean().optional(),
    })
    .optional(),
});
export type FieldConfig = z.infer<typeof fieldConfigSchema>;

export const inputConfigSchema = z.array(
  z.union([
    fieldConfigSchema,
    z.object({
      id: z.string(),
      occurenceType: z.enum(['single', 'multiple', 'dynamic']).optional(),
      label: z.string(),
      description: z.string(),
      inputConfig: z.array(fieldConfigSchema),
    }),
  ]),
);
export type InputConfig = z.infer<typeof inputConfigSchema>;

export const createFieldConfigSchema = fieldConfigSchema.pick({
  id: true,
  label: true,
  inputType: true,
  occurenceType: true,
  selectOptions: true,
  switchOptions: true,
  placeholder: true,
  description: true,
  required: true,
  defaultValue: true,
});

export type CreateFieldConfigType = z.infer<typeof createFieldConfigSchema>;
