import { Body, Delete, Get, HttpCode, Param, Post, Put, Res } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { CatalogoService } from '../../application/services/catalogo.service';
import { LivroDto } from '../dto/livro.dto';
import { Perfis } from '../http/acesso';
import { IdPositivo, RecebeJson } from '../http/parametros';
import * as s from '../dto/respostas';

@Controller('livros')
export class LivroController {
  constructor(private readonly service: CatalogoService) {}

  @Get()
  @ApiResponse({ status: 200, schema: s.lista(s.livro) })
  listarLivros() {
    return this.service.listarLivros();
  }

  @Get(':id')
  @ApiResponse({ status: 200, schema: s.livro })
  obterLivro(@Param('id', IdPositivo) id: number) {
    return this.service.obterLivro(id);
  }

  @Post()
  @Perfis('bibliotecario', 'gestor')
  @RecebeJson()
  @ApiResponse({ status: 201, schema: s.livro })
  criarLivro(@Body() dados: LivroDto, @Res({ passthrough: true }) res: Response) {
    const registro = this.service.criarLivro(dados);
    res.location('/livros/' + registro.id);
    return registro;
  }

  @Put(':id')
  @Perfis('bibliotecario', 'gestor')
  @RecebeJson()
  @ApiResponse({ status: 200, schema: s.livro })
  editarLivro(@Param('id', IdPositivo) id: number, @Body() dados: LivroDto) {
    return this.service.editarLivro(id, dados);
  }

  @Delete(':id')
  @Perfis('bibliotecario', 'gestor')
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Recurso excluído' })
  excluirLivro(@Param('id', IdPositivo) id: number) {
    return this.service.excluirLivro(id);
  }
}
