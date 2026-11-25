import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, Matches } from 'class-validator';
import { Id, Texto } from './campos';

export class ReservaDto {
  @Id() livroId!: number;
}

export class EmprestimoDto {
  @Id() leitorId!: number;
  @Id() exemplarId!: number;
}

export class DevolucaoDto {
  @Id() exemplarId!: number;
  @Id() unidadeDevolucaoId!: number;
}

export class RecebimentoDto {
  @Id() unidadeId!: number;
}

export class OcorrenciaDto {
  @Id() exemplarId!: number;

  @ApiProperty({ enum: ['avaria', 'extravio'] })
  @IsIn(['avaria', 'extravio'])
  tipo!: 'avaria' | 'extravio';

  @Texto('Capa danificada', 2000)
  descricao!: string;
}

export class FeriadoDto {
  @ApiProperty({ format: 'date', example: '2026-12-25' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  data!: string;
}
