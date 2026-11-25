import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export const Id = (): PropertyDecorator => applyDecorators(
  ApiProperty({ type: 'integer', minimum: 1, example: 1 }),
  IsInt(), Min(1), Max(Number.MAX_SAFE_INTEGER),
);

export const Texto = (exemplo: string, limite = 300): PropertyDecorator => applyDecorators(
  ApiProperty({ type: String, example: exemplo, maxLength: limite }),
  IsString(), Matches(/\S/), MaxLength(limite),
);
