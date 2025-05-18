import { z } from 'zod';

export const FEATURES_THAT_CAN_BE_DISABLED = [
  {
    value: 'workflow',
    label: 'Workflows',
  },
  {
    value: 'agent',
    label: 'Agents',
  },
  {
    value: 'connection',
    label: 'Connections',
  },
  {
    value: 'knowledge',
    label: 'Knowledge',
  },
  {
    value: 'variable',
    label: 'Variables',
  },
];

export type FeatureThatCanBeDisabled =
  (typeof FEATURES_THAT_CAN_BE_DISABLED)[number];

export const workspacePreferencesSchema = z.object({
  id: z.string().uuid(),
  disabledFeatures: z.array(
    z.enum(['workflow', 'agent', 'connection', 'knowledge', 'variable']),
  ),

  //AGENT TASK NAMING DEFAULTS
  defaultAgentLlmConnection: z
    .object({
      id: z.string().uuid(),
      connectionId: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  defaultAgentLlmProvider: z.string().nullable().optional(),
  defaultAgentLlmModel: z.string().nullable().optional(),

  //AGENT TASK NAMING DEFAULTS
  defaultTaskNamingInstructions: z.string().nullable().optional(),
  defaultTaskNamingLlmConnection: z
    .object({
      id: z.string().uuid(),
      connectionId: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  defaultTaskNamingLlmProvider: z.string().nullable().optional(),
  defaultTaskNamingLlmModel: z.string().nullable().optional(),
});
export type WorkspacePreferences = z.infer<typeof workspacePreferencesSchema>;

export const updateWorkspacePreferencesSchema = workspacePreferencesSchema
  .pick({
    disabledFeatures: true,
    defaultAgentLlmProvider: true,
    defaultAgentLlmModel: true,
    defaultTaskNamingInstructions: true,
    defaultTaskNamingLlmProvider: true,
    defaultTaskNamingLlmModel: true,
  })
  .extend({
    defaultAgentLlmConnectionId: z.string().uuid().nullable().optional(),
    defaultTaskNamingLlmConnectionId: z.string().uuid().nullable().optional(),
  })
  .partial();

export type UpdateWorkspacePreferencesType = z.infer<
  typeof updateWorkspacePreferencesSchema
>;
