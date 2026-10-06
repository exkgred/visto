import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { EventType } from '../../domain/entities/domain-event.entity';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class ProposalItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class CreateProposalDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  clientName!: string;

  @ApiProperty()
  @IsEmail()
  clientEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty()
  @IsDateString()
  validUntil!: string;

  @ApiProperty({ type: [ProposalItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposalItemDto)
  items!: ProposalItemDto[];
}

export class DeclineProposalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

const EVENT_TYPES: EventType[] = [
  'PropostaCriada',
  'PropostaEnviada',
  'PropostaVista',
  'PropostaAceita',
  'PropostaRecusada',
];

export class IngestEventDto {
  @ApiProperty({ enum: EVENT_TYPES })
  @IsEnum(EVENT_TYPES)
  type!: EventType;

  @ApiProperty()
  @IsString()
  sourceApp!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aggregateType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aggregateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiProperty()
  @IsObject()
  payload!: Record<string, unknown>;
}
