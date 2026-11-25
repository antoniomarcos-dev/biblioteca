export class Livro {
  readonly id!: number;
  readonly titulo!: string;
  readonly autor!: string;

  constructor(dados: Livro) {
    this.id = dados.id;
    this.titulo = dados.titulo;
    this.autor = dados.autor;
  }
}

export class Exemplar {
  readonly id!: number;
  readonly livroId!: number;
  readonly unidadeOrigemId!: number;
  readonly unidadeAtualId!: number;
  readonly situacao!: string;

  constructor(dados: Exemplar) {
    this.id = dados.id;
    this.livroId = dados.livroId;
    this.unidadeOrigemId = dados.unidadeOrigemId;
    this.unidadeAtualId = dados.unidadeAtualId;
    this.situacao = dados.situacao;
  }
}

export class Unidade {
  readonly id!: number;
  readonly nome!: string;

  constructor(dados: Unidade) {
    this.id = dados.id;
    this.nome = dados.nome;
  }
}

export class Feriado {
  readonly unidadeId!: number;
  readonly data!: string;

  constructor(dados: Feriado) {
    this.unidadeId = dados.unidadeId;
    this.data = dados.data;
  }
}
