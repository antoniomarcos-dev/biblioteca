import { Injectable } from '@nestjs/common';
import { Contexto, UsuarioAutenticado } from '../contexto';
import { CatalogoService } from './catalogo.service';
import { ReservaService } from './reservas.service';
import { OcorrenciaDto } from '../../presentation/dto/circulacao.dto';
import { transacao } from '../../infrastructure/database';
import { atualizarExemplar, listarUnidades } from '../../infrastructure/repositories/catalogo';
import { inserirFeriado, listarFeriados } from '../../infrastructure/repositories/calendario';
import { desassociarExemplar } from '../../infrastructure/repositories/reservas';
import * as ocorrencias from '../../infrastructure/repositories/ocorrencias';
import { conflito, naoEncontrado } from '../../domain/erros';

@Injectable()
export class AcervoService {
  constructor(
    private readonly contexto: Contexto,
    private readonly catalogo: CatalogoService,
    private readonly reservas: ReservaService,
  ) {}

  receberTransferencia(id: number, unidadeId: number, hoje = this.contexto.hoje()) {
    return transacao(this.contexto.db, () => {
      const exemplar = this.catalogo.obterExemplar(id);
      this.catalogo.exigirUnidade(unidadeId);
      if (exemplar.situacao !== 'em_transferencia' || exemplar.unidadeOrigemId !== unidadeId) {
        throw conflito('A transferência precisa estar aberta e ser recebida na unidade de origem.');
      }
      atualizarExemplar(this.contexto.db, id, 'disponivel', unidadeId);
      this.reservas.liberarPrimeira(exemplar.livroId, hoje);
      return { exemplarId: id, unidadeId };
    });
  }

  listarUnidades() {
    return listarUnidades(this.contexto.db);
  }

  listarOcorrencias() {
    return ocorrencias.listar(this.contexto.db);
  }

  obterOcorrencia(id: number) {
    const registro = ocorrencias.buscar(this.contexto.db, id);
    if (!registro) throw naoEncontrado('Ocorrência');
    return registro;
  }

  registrarOcorrencia(usuario: UsuarioAutenticado, { exemplarId, tipo, descricao }: OcorrenciaDto, hoje = this.contexto.hoje()) {
    return transacao(this.contexto.db, () => {
      const exemplar = this.catalogo.obterExemplar(exemplarId);
      const id = ocorrencias.inserir(this.contexto.db, exemplarId, usuario.id, tipo, descricao.trim(), hoje);
      atualizarExemplar(this.contexto.db, exemplarId, 'indisponivel', exemplar.unidadeAtualId);
      desassociarExemplar(this.contexto.db, exemplarId);
      this.reservas.liberarPrimeira(exemplar.livroId, hoje);
      return this.obterOcorrencia(id);
    });
  }

  listarFeriados() {
    return listarFeriados(this.contexto.db);
  }

  cadastrarFeriado(unidadeId: number, data: string) {
    this.catalogo.exigirUnidade(unidadeId);
    const feriado = inserirFeriado(this.contexto.db, unidadeId, data);
    if (!feriado) throw conflito('Feriado já cadastrado nesta unidade.');
    return feriado;
  }
}
