import { Body, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReservaService } from '../../application/services/reservas.service';
import { UsuarioAutenticado } from '../../application/contexto';
import { ReservaDto } from '../dto/circulacao.dto';
import { Perfis, UsuarioAtual } from '../http/acesso';
import { IdPositivo, RecebeJson } from '../http/parametros';
import * as s from '../dto/respostas';

@Controller('reservas')
export class ReservaController {
  constructor(private readonly service: ReservaService) {}

  @Post()
  @Perfis('leitor')
  @RecebeJson()
  @ApiResponse({ status: 201, schema: s.reserva })
  criarReserva(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dados: ReservaDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const registro = this.service.criar(usuario, dados.livroId);
    res.location('/reservas/' + registro.id);
    return registro;
  }

  @Get()
  @Perfis('leitor', 'bibliotecario')
  @ApiQuery({ name: 'livroId', type: Number, required: false })
  @ApiResponse({ status: 200, schema: s.lista(s.reserva) })
  listarReservas(@UsuarioAtual() usuario: UsuarioAutenticado, @Query('livroId', IdPositivo) livroId?: number) {
    return this.service.listar(usuario, livroId);
  }

  @Get(':id')
  @Perfis('leitor', 'bibliotecario')
  @ApiResponse({ status: 200, schema: s.reserva })
  obterReserva(@Param('id', IdPositivo) id: number, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.obter(id, usuario);
  }

  @Patch(':id/expirar')
  @Perfis('bibliotecario')
  @ApiResponse({ status: 200, schema: s.reserva })
  expirarReserva(@Param('id', IdPositivo) id: number, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.encerrar(id, usuario, 'expirada');
  }

  @Patch(':id/cancelamento')
  @Perfis('leitor')
  @ApiResponse({ status: 200, schema: s.reserva })
  cancelarReserva(@Param('id', IdPositivo) id: number, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.encerrar(id, usuario, 'cancelada');
  }
}
