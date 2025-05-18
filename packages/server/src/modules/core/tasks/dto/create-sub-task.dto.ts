import { SubTaskStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubTaskDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  taskId: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsEnum(SubTaskStatus)
  @IsOptional()
  status?: SubTaskStatus;
}
