import { applyDecorators, CanActivate, createParamDecorator, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Contexto } from '../../application/contexto';
import { ErroApi } from '../../domain/erros';
import { buscarPadraoParaPerfis, buscarPorIdentificador, buscarPorTokenHash } from '../../infrastructure/repositories/usuarios';
import { hashToken } from '../../infrastructure/token';

export function Perfis(...perfis: string[]): MethodDecorator {
  return (target, key, descriptor) => {
    applyDecorators(SetMetadata('perfis', perfis), ApiBearerAuth(),
      ApiOperation({ description: 'Acesso: ' + perfis.join(', ') + '.' }))(target, key, descriptor);
  };
}

export const UsuarioAtual = createParamDecorator((_valor, ctx: ExecutionContext) =>
  ctx.switchToHttp().getRequest().usuario);

@Injectable()
export class AcessoGuard implements CanActivate {
  constructor(private readonly contexto: Contexto, private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const perfis = this.reflector.get<string[]>('perfis', ctx.getHandler());
    if (!perfis) return true;
    const req = ctx.switchToHttp().getRequest();
    const cabecalho = (req.get('Authorization') || '').trim();
    let usuario = null;

    if (cabecalho) {
      const tokenHex = /^(?:Bearer\s+)+([a-f0-9]{64})$/i.exec(cabecalho)?.[1];
      if (tokenHex) {
        usuario = buscarPorTokenHash(this.contexto.db, hashToken(tokenHex.toLowerCase()));
      } else if (!this.contexto.exigirAuth) {
        const valor = cabecalho.replace(/^(?:Bearer\s+)+/i, '').trim();
        usuario = buscarPorIdentificador(this.contexto.db, valor);
      }
    } else if (!this.contexto.exigirAuth) {
      usuario = buscarPadraoParaPerfis(this.contexto.db, perfis, req);
    }

    if (!usuario) throw new ErroApi(401, 'NAO_AUTENTICADO', 'Informe uma credencial Bearer válida.');
    if (!perfis.includes(usuario.perfil)) throw new ErroApi(403, 'ACESSO_NEGADO', 'Perfil sem permissão para esta operação.');
    req.usuario = usuario;
    return true;
  }
}
