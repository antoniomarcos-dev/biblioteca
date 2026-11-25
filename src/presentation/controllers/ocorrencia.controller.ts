import { Body, Get, Param, Post, Res } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AcervoService } from '../../application/services/acervo.service';
import { UsuarioAutenticado } from '../../application/contexto';
import { OcorrenciaDto } from '../dto/circulacao.dto';
import { Perfis, UsuarioAtual } from '../http/acesso';
import { IdPositivo, RecebeJson } from '../http/parametros';
import * as s from '../dto/respostas';

@Controller('ocorrencias')
export class OcorrenciaController {
  constructor(private readonly service: AcervoService) {}

  @Get()
  @Perfis('bibliotecario', 'gestor')
  @ApiResponse({ status: 200, schema: s.lista(s.ocorrencia) })
  listarOcorrencias() {
    return this.service.listarOcorrencias();
  }

  @Post()
  @Perfis('gestor')
  @RecebeJson()
  @ApiResponse({ status: 201, schema: s.ocorrencia })
  registrarOcorrencia(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dados: OcorrenciaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const registro = this.service.registrarOcorrencia(usuario, dados);
    res.location('/ocorrencias/' + registro.id);
    return registro;
  }

  @Get(':id')
  @Perfis('gestor')
  @ApiResponse({ status: 200, schema: s.ocorrencia })
  obterOcorrencia(@Param('id', IdPositivo) id: number) {
    return this.service.obterOcorrencia(id);
  }
}
