import { IsBoolean, IsOptional } from 'class-validator';

export class ProjectExpansionDto {
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
  workflows?: boolean;

  @IsOptional()
  @IsBoolean()
  createdByWorkspaceUser?: boolean;

  @IsOptional()
  @IsBoolean()
  workspaceUsers?: boolean;

  @IsOptional()
  @IsBoolean()
  countAgents?: boolean;

  @IsOptional()
  @IsBoolean()
  countConnections?: boolean;

  @IsOptional()
  @IsBoolean()
  countKnowledge?: boolean;

  @IsOptional()
  @IsBoolean()
  countVariables?: boolean;

  @IsOptional()
  @IsBoolean()
  countWorkflows?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultAgentLlmConnection?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultAgentLlmModel?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultAgentLlmProvider?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultTaskNamingInstructions?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultTaskNamingLlmConnection?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultTaskNamingLlmModel?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultTaskNamingLlmProvider?: boolean;
}
