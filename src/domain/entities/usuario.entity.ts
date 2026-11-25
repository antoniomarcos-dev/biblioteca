export class Usuario {
  readonly id!: number;
  readonly nome!: string;
  readonly perfil!: string;

  constructor(dados: Usuario) {
    this.id = dados.id;
    this.nome = dados.nome;
    this.perfil = dados.perfil;
  }
}
