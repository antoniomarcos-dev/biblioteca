export class Reserva {
  readonly id!: number;
  readonly livroId!: number;
  readonly leitorId!: number;
  readonly criadaEm!: string;
  readonly situacao!: string;
  readonly exemplarId!: number | null;
  readonly retirarAte!: string | null;

  constructor(dados: Reserva) {
    this.id = dados.id;
    this.livroId = dados.livroId;
    this.leitorId = dados.leitorId;
    this.criadaEm = dados.criadaEm;
    this.situacao = dados.situacao;
    this.exemplarId = dados.exemplarId;
    this.retirarAte = dados.retirarAte;
  }
}

export class Emprestimo {
  readonly id!: number;
  readonly leitorId!: number;
  readonly exemplarId!: number;
  readonly unidadeEmprestimoId!: number;
  readonly dataEmprestimo!: string;
  readonly prazoDevolucao!: string;
  readonly dataDevolucao!: string | null;
  readonly unidadeDevolucaoId!: number | null;

  constructor(dados: Emprestimo) {
    this.id = dados.id;
    this.leitorId = dados.leitorId;
    this.exemplarId = dados.exemplarId;
    this.unidadeEmprestimoId = dados.unidadeEmprestimoId;
    this.dataEmprestimo = dados.dataEmprestimo;
    this.prazoDevolucao = dados.prazoDevolucao;
    this.dataDevolucao = dados.dataDevolucao;
    this.unidadeDevolucaoId = dados.unidadeDevolucaoId;
  }
}

export class Renovacao {
  readonly id!: number;
  readonly emprestimoId!: number;
  readonly data!: string;
  readonly prazoAnterior!: string;
  readonly novoPrazo!: string;

  constructor(dados: Renovacao) {
    this.id = dados.id;
    this.emprestimoId = dados.emprestimoId;
    this.data = dados.data;
    this.prazoAnterior = dados.prazoAnterior;
    this.novoPrazo = dados.novoPrazo;
  }
}

export class Ocorrencia {
  readonly id!: number;
  readonly exemplarId!: number;
  readonly gestorId!: number;
  readonly tipo!: string;
  readonly descricao!: string;
  readonly data!: string;

  constructor(dados: Ocorrencia) {
    this.id = dados.id;
    this.exemplarId = dados.exemplarId;
    this.gestorId = dados.gestorId;
    this.tipo = dados.tipo;
    this.descricao = dados.descricao;
    this.data = dados.data;
  }
}
