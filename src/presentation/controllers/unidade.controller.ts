import { Body, Get, Param, Post } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { AcervoService } from '../../application/services/acervo.service';
import { FeriadoDto } from '../dto/circulacao.dto';
import { Perfis } from '../http/acesso';
import { IdPositivo, RecebeJson } from '../http/parametros';
import * as s from '../dto/respostas';

@Controller('unidades')
export class UnidadeController {
  constructor(private readonly service: AcervoService) {}

  @Get()
  @ApiResponse({ status: 200, schema: s.lista(s.unidade) })
  listarUnidades() {
    return this.service.listarUnidades();
  }

  @Get('feriados')
  @ApiResponse({ status: 200, schema: s.lista(s.feriado) })
  listarFeriados() {
    return this.service.listarFeriados();
  }

  @Post(':id/feriados')
  @Perfis('bibliotecario')
  @RecebeJson()
  @ApiResponse({ status: 201, schema: s.feriado })
  cadastrarFeriado(@Param('id', IdPositivo) id: number, @Body() dados: FeriadoDto) {
    return this.service.cadastrarFeriado(id, dados.data);
  }
}
