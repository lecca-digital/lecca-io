import { z } from 'zod';

import { newDateOrUndefined } from '../../utils/dates';
import { savedActionNodeSchema } from '../workflow/node/node-model';

import { agentTriggerSchema } from './agent-trigger-model';

export const agentSchema = z.object({
  id: z.string().uuid(),
  createdAt: z
    .string()
    .optional()
    .transform((val) => newDateOrUndefined(val)),
  updatedAt: z
    .string()
    .optional()
    .transform((val) => newDateOrUndefined(val)),
  name: z.string(),
  profileImageUrl: z.string().optional(),
  description: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  topP: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  presencePenalty: z.number().optional(),
  maxRetries: z.number().optional(),
  seed: z.number().optional(),
  maxToolRoundtrips: z.number().optional(),
  messageLookbackLimit: z.number().optional(),
  toolIds: z.array(z.string()).optional(),
  triggerIds: z.array(z.string()).optional(),

  instructions: z.string().optional(),
  llmConnection: z
    .object({
      id: z.string().uuid(),
      connectionId: z.string(),
      name: z.string(),
    })
    .optional(),
  llmProvider: z.string().optional(),
  llmModel: z.string().optional(),

  taskNamingInstructions: z.string().optional(),
  taskNamingLlmConnection: z
    .object({
      id: z.string().uuid(),
      connectionId: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  taskNamingLlmProvider: z.string().nullable().optional(),
  taskNamingLlmModel: z.string().nullable().optional(),

  agentActions: z.array(
    z.object({
      id: z.string().uuid(),
      actionId: z.string(),
    }),
  ),
  connections: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
      }),
    )
    .optional(),
  agentKnowledge: z
    .array(
      z.object({
        id: z.string().uuid(),
        knowledge: z.object({
          id: z.string().uuid(),
          name: z.string(),
        }),
      }),
    )
    .optional(),
  agentVariables: z
    .array(
      z.object({
        id: z.string().uuid(),
        variable: z.object({
          id: z.string().uuid(),
          name: z.string(),
        }),
      }),
    )
    .optional(),
  agentWorkflows: z
    .array(
      z.object({
        id: z.string().uuid(),
        workflow: z.object({
          id: z.string().uuid(),
          name: z.string(),
        }),
      }),
    )
    .optional(),
  agentSubAgents: z
    .array(
      z.object({
        id: z.string().uuid(),
        subagent: z.object({
          id: z.string().uuid(),
          name: z.string(),
        }),
      }),
    )
    .optional(),
  agentWebAccess: z
    .object({
      service: z.enum(['apify']),
      webSearchEnabled: z.boolean(),
      websiteAccessEnabled: z.boolean(),
    })
    .optional(),
  agentPhoneAccess: z
    .object({
      outboundCallsEnabled: z.boolean(),
      inboundCallsEnabled: z.boolean(),
    })
    .optional(),
  tools: z.array(savedActionNodeSchema).nullable().optional(),
  triggers: z.array(agentTriggerSchema).nullable().optional(),
  project: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
    })
    .optional(),
});
export type Agent = z.infer<typeof agentSchema>;

export const createAgentSchema = agentSchema
  .pick({
    name: true,
  })
  .extend({
    description: z.string().optional(),
    profileImageUrl: z.string().optional(),
    instructions: z.string().optional(),
    temperature: z.number().optional(),
    maxTokens: z.number().optional(),
    topP: z.number().optional(),
    frequencyPenalty: z.number().optional(),
    presencePenalty: z.number().optional(),
    maxRetries: z.number().optional(),
    seed: z.number().optional(),
    maxToolRoundtrips: z.number().optional(),
    messageLookbackLimit: z.number().optional(),
    connectionIds: z.array(z.string().uuid()).optional(),
    knowledgeIds: z.array(z.string().uuid()).optional(),
    actionIds: z.array(z.string()).optional(),
    variableIds: z.array(z.string().uuid()).optional(),
    workflowIds: z.array(z.string().uuid()).optional(),
    agentIds: z.array(z.string().uuid()).optional(),
    llmConnectionId: z.string().uuid().optional().nullable(),
    llmProvider: z.string().optional(),
    llmModel: z.string().optional(),
    webAccess: z.boolean().optional(),
    phoneAccess: z.boolean().optional(),
    taskNamingInstructions: z.string().nullable().optional(),
    taskNamingLlmConnectionId: z.string().uuid().nullable().optional(),
    taskNamingLlmProvider: z.string().nullable().optional(),
    taskNamingLlmModel: z.string().nullable().optional(),
  });

export type CreateAgentType = z.infer<typeof createAgentSchema>;

export const updateAgentSchema = agentSchema
  .pick({
    name: true,
    description: true,
    profileImageUrl: true,
    instructions: true,
    temperature: true,
    maxTokens: true,
    topP: true,
    frequencyPenalty: true,
    presencePenalty: true,
    llmProvider: true,
    llmModel: true,
    maxRetries: true,
    seed: true,
    maxToolRoundtrips: true,
    messageLookbackLimit: true,
    tools: true,
    triggers: true,
    taskNamingInstructions: true,
    taskNamingLlmModel: true,
    taskNamingLlmProvider: true,
  })
  .extend({
    connectionIds: z.array(z.string().uuid()).optional(),
    knowledgeIds: z.array(z.string().uuid()).optional(),
    actionIds: z.array(z.string()).optional(),
    variableIds: z.array(z.string().uuid()).optional(),
    workflowIds: z.array(z.string().uuid()).optional(),
    agentIds: z.array(z.string().uuid()).optional(),
    llmConnectionId: z.string().uuid().optional().nullable(),
    webAccess: z.boolean().optional().nullable(),
    phoneAccess: z.boolean().optional().nullable(),
    taskNamingLlmConnectionId: z.string().uuid().nullable().optional(),
  })
  .partial();

export type UpdateAgentType = z.infer<typeof updateAgentSchema>;
