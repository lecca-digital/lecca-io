import { z } from 'zod';

import { workflowSchema } from '../workflow/workflow-model';

export const projectSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  workflows: z.array(workflowSchema).optional(),

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

  createdByWorkspaceUser: z
    .object({
      id: z.string().uuid(),
      user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        name: z.string(),
      }),
    })
    .optional(),
  _count: z
    .object({
      agents: z.number().optional(),
      connections: z.number().optional(),
      knowledge: z.number().optional(),
      variables: z.number().optional(),
      workflows: z.number().optional(),
    })
    .optional(),
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = projectSchema
  .pick({
    name: true,
  })
  .extend({
    description: z.string().optional(),
    defaultAgentLlmConnectionId: z.string().uuid().nullable().optional(),
    defaultAgentLlmProvider: z.string().nullable().optional(),
    defaultAgentLlmModel: z.string().nullable().optional(),
    defaultTaskNamingInstructions: z.string().nullable().optional(),
    defaultTaskNamingLlmConnectionId: z.string().uuid().nullable().optional(),
    defaultTaskNamingLlmProvider: z.string().nullable().optional(),
    defaultTaskNamingLlmModel: z.string().nullable().optional(),
  });

export type CreateProjectType = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = projectSchema
  .pick({
    name: true,
    description: true,
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

export type UpdateProjectType = z.infer<typeof updateProjectSchema>;
