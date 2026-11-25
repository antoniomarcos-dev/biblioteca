import { Injectable } from '@nestjs/common';
import { Contexto } from '../contexto';
import { ReservaService } from './reservas.service';
import { LivroDto } from '../../presentation/dto/livro.dto';
import { ExemplarDto } from '../../presentation/dto/exemplar.dto';
import * as repositorio from '../../infrastructure/repositories/catalogo';
import { paraCatalogo, paraExemplarComLivro } from '../../presentation/mappers/catalogo';
import { naoEncontrado, conflito } from '../../domain/erros';
import { transacao } from '../../infrastructure/database';

@Injectable()
export class CatalogoService {
  constructor(
    private readonly contexto: Contexto,
    private readonly reservas: ReservaService,
  ) {}

  listarLivros() {
    return paraCatalogo(repositorio.consultarCatalogo(this.contexto.db));
  }

  obterLivro(id: number) {
    const [livro] = paraCatalogo(repositorio.consultarCatalogo(this.contexto.db, id));
    if (!livro) throw naoEncontrado('Livro');
    return livro;
  }

  obterExemplar(id: number) {
    const exemplar = repositorio.buscarExemplar(this.contexto.db, id);
    if (!exemplar) throw naoEncontrado('Exemplar');
    return exemplar;
  }

  exigirUnidade(id: number) {
    if (!repositorio.buscarUnidade(this.contexto.db, id)) throw naoEncontrado('Unidade');
  }

  criarLivro({ titulo, autor }: LivroDto) {
    return transacao(this.contexto.db, () => this.obterLivro(repositorio.inserirLivro(this.contexto.db, titulo.trim(), autor.trim())));
  }

  editarLivro(id: number, { titulo, autor }: LivroDto) {
    return transacao(this.contexto.db, () => {
      if (!repositorio.editarLivro(this.contexto.db, id, titulo.trim(), autor.trim())) throw naoEncontrado('Livro');
      return this.obterLivro(id);
    });
  }

  excluirLivro(id: number) {
    transacao(this.contexto.db, () => {
      if (repositorio.livroPossuiVinculos(this.contexto.db, id)) throw conflito('O livro possui exemplares ou reservas vinculados.');
      if (!repositorio.excluirLivro(this.contexto.db, id)) throw naoEncontrado('Livro');
    });
  }

  listarExemplares(livroId?: number) {
    return repositorio.consultarCatalogo(this.contexto.db, livroId).filter(linha => linha.exemplar).map(paraExemplarComLivro);
  }

  consultarExemplar(id: number) {
    const [registro] = repositorio.consultarCatalogo(this.contexto.db, null, id);
    if (!registro) throw naoEncontrado('Exemplar');
    return paraExemplarComLivro(registro);
  }

  validarCadastroExemplar(livroId: number, unidadeId: number) {
    if (!repositorio.existeLivro(this.contexto.db, livroId)) throw naoEncontrado('Livro');
    this.exigirUnidade(unidadeId);
  }

  criarExemplar({ livroId, unidadeOrigemId }: ExemplarDto, hoje = this.contexto.hoje()) {
    return transacao(this.contexto.db, () => {
      this.validarCadastroExemplar(livroId, unidadeOrigemId);
      const id = repositorio.inserirExemplar(this.contexto.db, livroId, unidadeOrigemId);
      this.reservas.liberarPrimeira(livroId, hoje);
      return this.consultarExemplar(id);
    });
  }

  editarExemplar(id: number, { livroId, unidadeOrigemId }: ExemplarDto, hoje = this.contexto.hoje()) {
    return transacao(this.contexto.db, () => {
      const atual = this.consultarExemplar(id);
      if (atual.livroId === livroId && atual.unidadeOrigemId === unidadeOrigemId) return atual;
      this.validarCadastroExemplar(livroId, unidadeOrigemId);
      if (atual.situacao !== 'disponivel') throw conflito('O exemplar precisa estar disponível para alterar o cadastro.');
      if (atual.livroId !== livroId && repositorio.exemplarPossuiHistorico(this.contexto.db, id)) {
        throw conflito('O histórico deste exemplar está vinculado ao título original.');
      }
      repositorio.editarCadastroExemplar(this.contexto.db, id, livroId, unidadeOrigemId);
      this.reservas.liberarPrimeira(livroId, hoje);
      return this.consultarExemplar(id);
    });
  }

  excluirExemplar(id: number) {
    transacao(this.contexto.db, () => {
      this.obterExemplar(id);
      if (repositorio.exemplarPossuiHistorico(this.contexto.db, id)) throw conflito('O exemplar possui histórico de circulação ou ocorrências.');
      repositorio.excluirExemplar(this.contexto.db, id);
    });
  }
}
