import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { WorkflowNodeForRunner } from '../../workflow-runner/workflow-runner.service';
import { PartialOrSavedAgentTrigger } from '../agents.service';

export class CreateAgentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  profileImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  instructions: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4095)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  frequencyPenalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  presencePenalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @IsNumber()
  seed?: number;

  @IsOptional()
  @IsNumber()
  maxToolRoundtrips?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  messageLookbackLimit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  connectionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actionIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowledgeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variableIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workflowIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  agentIds?: string[];

  @IsOptional()
  @IsBoolean()
  webAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  phoneAccess?: boolean;

  @IsOptional()
  @IsString()
  llmConnectionId?: string;

  @IsOptional()
  @IsString()
  llmModel?: string;

  @IsOptional()
  @IsString()
  llmProvider?: string;

  @IsOptional()
  @IsArray()
  tools?: WorkflowNodeForRunner[];

  @IsOptional()
  @IsArray()
  triggers?: PartialOrSavedAgentTrigger[];

  @IsOptional()
  @IsString()
  taskNamingLlmConnectionId?: string;

  @IsOptional()
  @IsString()
  taskNamingLlmModel?: string;

  @IsOptional()
  @IsString()
  taskNamingLlmProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  taskNamingInstructions: string;
}
