import { IsBoolean, IsOptional } from 'class-validator';

export class AgentExpansionDto {
  @IsOptional()
  @IsBoolean()
  createdAt?: boolean;

  @IsOptional()
  @IsBoolean()
  updatedAt?: boolean;

  @IsOptional()
  @IsBoolean()
  description?: boolean;

  @IsOptional()
  @IsBoolean()
  profileImageUrl?: boolean;

  @IsOptional()
  @IsBoolean()
  instructions?: boolean;

  @IsOptional()
  @IsBoolean()
  temperature?: boolean;

  @IsOptional()
  @IsBoolean()
  maxTokens?: boolean;

  @IsOptional()
  @IsBoolean()
  topP?: boolean;

  @IsOptional()
  @IsBoolean()
  frequencyPenalty?: boolean;

  @IsOptional()
  @IsBoolean()
  presencePenalty?: boolean;

  @IsOptional()
  @IsBoolean()
  maxRetries?: boolean;

  @IsOptional()
  @IsBoolean()
  seed?: boolean;

  @IsOptional()
  @IsBoolean()
  maxToolRoundtrips?: boolean;

  @IsOptional()
  @IsBoolean()
  messageLookbackLimit?: boolean;

  @IsOptional()
  @IsBoolean()
  project?: boolean;

  @IsOptional()
  @IsBoolean()
  tools?: boolean;

  @IsOptional()
  @IsBoolean()
  triggers?: boolean;

  @IsOptional()
  @IsBoolean()
  knowledge?: boolean;

  @IsOptional()
  @IsBoolean()
  connections?: boolean;

  @IsOptional()
  @IsBoolean()
  actions?: boolean;

  @IsOptional()
  @IsBoolean()
  variables?: boolean;

  @IsOptional()
  @IsBoolean()
  workflows?: boolean;

  @IsOptional()
  @IsBoolean()
  subAgents?: boolean;

  @IsOptional()
  @IsBoolean()
  webAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  phoneAccess?: boolean;

  @IsOptional()
  @IsBoolean()
  llmConnection?: boolean;

  @IsOptional()
  @IsBoolean()
  llmModel?: boolean;

  @IsOptional()
  @IsBoolean()
  llmProvider?: boolean;

  @IsOptional()
  @IsBoolean()
  toolIds?: boolean;

  @IsOptional()
  @IsBoolean()
  triggerIds?: boolean;

  @IsOptional()
  @IsBoolean()
  taskNamingInstructions?: boolean;

  @IsOptional()
  @IsBoolean()
  taskNamingLlmConnection?: boolean;

  @IsOptional()
  @IsBoolean()
  taskNamingLlmProvider?: boolean;

  @IsOptional()
  @IsBoolean()
  taskNamingLlmModel?: boolean;
}
