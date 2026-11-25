import { Body, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { EmprestimoService } from '../../application/services/emprestimos.service';
import { UsuarioAutenticado } from '../../application/contexto';
import { DevolucaoDto, EmprestimoDto } from '../dto/circulacao.dto';
import { Perfis, UsuarioAtual } from '../http/acesso';
import { IdPositivo, RecebeJson } from '../http/parametros';
import * as s from '../dto/respostas';

@Controller('emprestimos')
export class EmprestimoController {
  constructor(private readonly service: EmprestimoService) {}

  @Get()
  @Perfis('leitor', 'bibliotecario', 'gestor')
  @ApiResponse({ status: 200, schema: s.lista(s.emprestimo) })
  listarEmprestimos(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.listar(usuario);
  }

  @Post()
  @Perfis('bibliotecario')
  @RecebeJson()
  @ApiResponse({ status: 201, schema: s.emprestimo })
  criarEmprestimo(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dados: EmprestimoDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const registro = this.service.criar(usuario, dados);
    res.location('/emprestimos/' + registro.id);
    return registro;
  }

  @Get(':id')
  @Perfis('leitor', 'bibliotecario')
  @ApiResponse({ status: 200, schema: s.emprestimo })
  obterEmprestimo(@Param('id', IdPositivo) id: number, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.obter(id, usuario);
  }

  @Patch(':id/devolucao')
  @Perfis('bibliotecario')
  @RecebeJson()
  @ApiResponse({ status: 200, schema: s.emprestimo })
  devolver(
    @Param('id', IdPositivo) id: number,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dados: DevolucaoDto,
  ) {
    return this.service.devolver(id, usuario, dados);
  }

  @Patch(':id/renovacao')
  @Perfis('leitor')
  @ApiResponse({ status: 200, schema: s.emprestimo })
  renovar(@Param('id', IdPositivo) id: number, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.renovar(id, usuario);
  }
}
