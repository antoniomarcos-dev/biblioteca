import { Injectable } from '@nestjs/common';
import { Contexto, UsuarioAutenticado } from '../contexto';
import { transacao } from '../../infrastructure/database';
import { conflito, naoEncontrado } from '../../domain/erros';
import { somarDiasUteis } from './calendario';
import * as catalogo from '../../infrastructure/repositories/catalogo';
import * as repositorio from '../../infrastructure/repositories/reservas';
import { paraReserva } from '../../presentation/mappers/circulacao';

@Injectable()
export class ReservaService {
  constructor(
    private readonly contexto: Contexto,
  ) {}

  listar(usuario: UsuarioAutenticado, livroId?: number) {
    const leitorId = usuario.perfil === 'leitor' ? usuario.id : null;
    return repositorio.listar(this.contexto.db, leitorId, livroId ?? null).map(paraReserva);
  }

  obter(id: number, usuario: UsuarioAutenticado) {
    const registro = repositorio.buscar(this.contexto.db, id);
    if (!registro || (usuario.perfil === 'leitor' && registro.reserva.leitorId !== usuario.id)) {
      throw naoEncontrado('Reserva');
    }
    return paraReserva(registro);
  }

  // Deve executar na mesma transação que alterou a disponibilidade ou a fila.
  liberarPrimeira(livroId: number, hoje = this.contexto.hoje()) {
    const reserva = repositorio.primeira(this.contexto.db, livroId);
    if (!reserva || reserva.situacao === 'liberada') return;
    const exemplar = catalogo.primeiroDisponivel(this.contexto.db, livroId);
    if (!exemplar) return;
    const prazo = somarDiasUteis(this.contexto.db, hoje, 2, exemplar.unidadeAtualId);
    repositorio.liberar(this.contexto.db, reserva.id, exemplar.id, prazo);
  }

  criar(usuario: UsuarioAutenticado, livroId: number, hoje = this.contexto.hoje()) {
    return transacao(this.contexto.db, () => {
      if (!catalogo.existeLivro(this.contexto.db, livroId)) throw naoEncontrado('Livro');
      const duplicada = repositorio.existeAtiva(this.contexto.db, usuario.id, livroId);
      if (duplicada) throw conflito('Já existe uma reserva ativa deste leitor para o título.');
      const id = repositorio.inserir(this.contexto.db, usuario.id, livroId, hoje);
      this.liberarPrimeira(livroId, hoje);
      return this.obter(id, usuario);
    });
  }

  encerrar(id: number, usuario: UsuarioAutenticado, situacao: 'expirada' | 'cancelada', hoje = this.contexto.hoje()) {
    return transacao(this.contexto.db, () => {
      const reserva = this.obter(id, usuario);
      if (situacao === 'expirada') {
        if (reserva.situacao !== 'liberada' || hoje <= reserva.retirarAte) {
          throw conflito('Somente uma reserva liberada com prazo de retirada encerrado pode expirar.');
        }
      } else if (!['aguardando', 'liberada'].includes(reserva.situacao)) {
        throw conflito('Somente reservas ativas podem ser canceladas.');
      }
      repositorio.encerrar(this.contexto.db, id, situacao);
      this.liberarPrimeira(reserva.livroId, hoje);
      return this.obter(id, usuario);
    });
  }
}
