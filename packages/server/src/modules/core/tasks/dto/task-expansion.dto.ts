import { IsBoolean, IsOptional } from 'class-validator';

export class TaskExpansionDto {
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
  agent?: boolean;

  @IsOptional()
  @IsBoolean()
  project?: boolean;

  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @IsOptional()
  @IsBoolean()
  messageCreatedAt?: boolean;

  @IsOptional()
  @IsBoolean()
  messageUsage?: boolean;

  @IsOptional()
  @IsBoolean()
  finishReason?: boolean;

  @IsOptional()
  @IsBoolean()
  customIdentifier?: boolean;

  @IsOptional()
  @IsBoolean()
  subTasks?: boolean;
}
