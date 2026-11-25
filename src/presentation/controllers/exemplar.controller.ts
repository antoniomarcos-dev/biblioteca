import { Body, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { CatalogoService } from '../../application/services/catalogo.service';
import { AcervoService } from '../../application/services/acervo.service';
import { ExemplarDto } from '../dto/exemplar.dto';
import { RecebimentoDto } from '../dto/circulacao.dto';
import { Perfis } from '../http/acesso';
import { IdPositivo, RecebeJson } from '../http/parametros';
import * as s from '../dto/respostas';

@Controller('exemplares')
export class ExemplarController {
  constructor(private readonly service: CatalogoService, private readonly acervo: AcervoService) {}

  @Get()
  @ApiQuery({ name: 'livroId', type: Number, required: false })
  @ApiResponse({ status: 200, schema: s.lista(s.exemplarComLivro) })
  listarExemplares(@Query('livroId', IdPositivo) livroId?: number) {
    return this.service.listarExemplares(livroId);
  }

  @Get(':id')
  @ApiResponse({ status: 200, schema: s.exemplarComLivro })
  consultarExemplar(@Param('id', IdPositivo) id: number) {
    return this.service.consultarExemplar(id);
  }

  @Post()
  @Perfis('bibliotecario', 'gestor')
  @RecebeJson()
  @ApiResponse({ status: 201, schema: s.exemplarComLivro })
  criarExemplar(@Body() dados: ExemplarDto, @Res({ passthrough: true }) res: Response) {
    const registro = this.service.criarExemplar(dados);
    res.location('/exemplares/' + registro.id);
    return registro;
  }

  @Put(':id')
  @Perfis('bibliotecario', 'gestor')
  @RecebeJson()
  @ApiResponse({ status: 200, schema: s.exemplarComLivro })
  editarExemplar(@Param('id', IdPositivo) id: number, @Body() dados: ExemplarDto) {
    return this.service.editarExemplar(id, dados);
  }

  @Delete(':id')
  @Perfis('bibliotecario', 'gestor')
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Recurso excluído' })
  excluirExemplar(@Param('id', IdPositivo) id: number) {
    return this.service.excluirExemplar(id);
  }

  @Patch(':id/recebimento')
  @Perfis('bibliotecario')
  @RecebeJson()
  @ApiResponse({ status: 200, schema: s.transferenciaRecebida })
  receberTransferencia(@Param('id', IdPositivo) id: number, @Body() dados: RecebimentoDto) {
    return this.acervo.receberTransferencia(id, dados.unidadeId);
  }
}
