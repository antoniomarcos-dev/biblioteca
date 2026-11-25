import { Id } from './campos';

export class ExemplarDto {
  @Id()
  livroId!: number;

  @Id()
  unidadeOrigemId!: number;
}
