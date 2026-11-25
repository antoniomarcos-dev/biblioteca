import { Texto } from './campos';

export class LivroDto {
  @Texto('Memorial de Aires')
  titulo!: string;

  @Texto('Machado de Assis')
  autor!: string;
}
