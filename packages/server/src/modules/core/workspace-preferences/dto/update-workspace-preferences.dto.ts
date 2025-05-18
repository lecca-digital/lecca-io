import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateWorkspacePreferencesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabledFeatures?: string[];

  @IsOptional()
  @IsString()
  defaultAgentLlmProvider?: string;

  @IsOptional()
  @IsString()
  defaultAgentLlmModel?: string;

  @IsOptional()
  @IsUUID()
  defaultAgentLlmConnectionId?: string;

  @IsOptional()
  @IsString()
  defaultTaskNamingInstructions?: string;

  @IsOptional()
  @IsString()
  defaultTaskNamingLlmProvider?: string;

  @IsOptional()
  @IsString()
  defaultTaskNamingLlmModel?: string;

  @IsOptional()
  @IsUUID()
  defaultTaskNamingLlmConnectionId?: string;
}
