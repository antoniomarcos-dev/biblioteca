import { Injectable } from '@nestjs/common';
import { Contexto, UsuarioAutenticado } from '../contexto';
import { CatalogoService } from './catalogo.service';
import { ReservaService } from './reservas.service';
import { EmprestimoDto } from '../../presentation/dto/circulacao.dto';
import { DevolucaoDto } from '../../presentation/dto/circulacao.dto';
import { transacao } from '../../infrastructure/database';
import { atualizarExemplar } from '../../infrastructure/repositories/catalogo';
import { existeLeitor } from '../../infrastructure/repositories/usuarios';
import * as fila from '../../infrastructure/repositories/reservas';
import * as repositorio from '../../infrastructure/repositories/emprestimos';
import { paraEmprestimo } from '../../presentation/mappers/circulacao';
import { conflito, naoEncontrado } from '../../domain/erros';
import { somarDiasUteis } from './calendario';

@Injectable()
export class EmprestimoService {
  constructor(
    private readonly contexto: Contexto,
    private readonly catalogo: CatalogoService,
    private readonly reservas: ReservaService,
  ) {}

  listar(usuario: UsuarioAutenticado) {
    const leitorId = usuario.perfil === 'leitor' ? usuario.id : null;
    return repositorio.listar(this.contexto.db, leitorId)
      .map((reg: { id: number }) => paraEmprestimo(reg, repositorio.historico(this.contexto.db, reg.id)));
  }

  obter(id: number, usuario: UsuarioAutenticado) {
    const registro = repositorio.buscar(this.contexto.db, id);
    if (!registro || (usuario.perfil === 'leitor' && registro.leitorId !== usuario.id)) {
      throw naoEncontrado('Empréstimo');
    }
    return paraEmprestimo(registro, repositorio.historico(this.contexto.db, id));
  }

  criar(usuario: UsuarioAutenticado, { leitorId, exemplarId }: EmprestimoDto, hoje = this.contexto.hoje()) {
    return transacao(this.contexto.db, () => {
      const exemplar = this.catalogo.obterExemplar(exemplarId);
      if (!existeLeitor(this.contexto.db, leitorId)) {
        throw naoEncontrado('Leitor');
      }
      if (exemplar.situacao !== 'disponivel') throw conflito('Exemplar indisponível para empréstimo.');
      const primeira = fila.primeira(this.contexto.db, exemplar.livroId);
      if (primeira) {
        if (primeira.leitorId !== leitorId) throw conflito('O primeiro leitor da fila tem prioridade para este título.');
        if (primeira.retirarAte && hoje > primeira.retirarAte) throw conflito('Prazo de retirada encerrado. Registre a expiração.');
        fila.atender(this.contexto.db, primeira.id, exemplarId);
      }
      const prazo = somarDiasUteis(this.contexto.db, hoje, 7, exemplar.unidadeAtualId);
      const id = repositorio.inserir(this.contexto.db, leitorId, exemplarId, exemplar.unidadeAtualId, hoje, prazo);
      atualizarExemplar(this.contexto.db, exemplarId, 'emprestado', exemplar.unidadeAtualId);
      this.reservas.liberarPrimeira(exemplar.livroId, hoje);
      return this.obter(id, usuario);
    });
  }

  devolver(id: number, usuario: UsuarioAutenticado, { exemplarId, unidadeDevolucaoId }: DevolucaoDto, hoje = this.contexto.hoje()) {
    return transacao(this.contexto.db, () => {
      const registro = this.obter(id, usuario);
      if (registro.exemplarId !== exemplarId) throw conflito('O exemplar informado difere do exemplar emprestado.');
      if (registro.dataDevolucao) throw conflito('Este empréstimo já foi devolvido.');
      this.catalogo.exigirUnidade(unidadeDevolucaoId);
      const exemplar = this.catalogo.obterExemplar(exemplarId);
      let situacao = exemplar.unidadeOrigemId === unidadeDevolucaoId ? 'disponivel' : 'em_transferencia';
      if (exemplar.situacao === 'indisponivel') situacao = 'indisponivel';
      repositorio.registrarDevolucao(this.contexto.db, id, unidadeDevolucaoId, hoje);
      atualizarExemplar(this.contexto.db, exemplarId, situacao, unidadeDevolucaoId);
      this.reservas.liberarPrimeira(exemplar.livroId, hoje);
      return this.obter(id, usuario);
    });
  }

  renovar(id: number, usuario: UsuarioAutenticado, hoje = this.contexto.hoje()) {
    return transacao(this.contexto.db, () => {
      const registro = this.obter(id, usuario);
      if (registro.dataDevolucao || hoje > registro.prazoDevolucao) {
        throw conflito('A renovação exige um empréstimo ativo e dentro do prazo.');
      }
      const exemplar = this.catalogo.obterExemplar(registro.exemplarId);
      if (fila.primeira(this.contexto.db, exemplar.livroId)) throw conflito('Há uma fila de reservas ativa para o título.');
      const prazo = somarDiasUteis(this.contexto.db, registro.prazoDevolucao, 7, registro.unidadeEmprestimoId);
      repositorio.registrarRenovacao(this.contexto.db, id, hoje, registro.prazoDevolucao, prazo);
      return this.obter(id, usuario);
    });
  }
}
