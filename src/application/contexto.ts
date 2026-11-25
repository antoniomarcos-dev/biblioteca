import { DatabaseSync } from 'node:sqlite';
import { hojeLocal } from './services/calendario';

export interface UsuarioAutenticado { id: number; perfil: string }

export class Contexto {
  constructor(
    readonly db: DatabaseSync,
    readonly hoje: () => string = hojeLocal,
    readonly exigirAuth: boolean = false,
  ) {}
}
