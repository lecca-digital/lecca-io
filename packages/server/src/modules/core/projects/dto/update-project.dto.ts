import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
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
