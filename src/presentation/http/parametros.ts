import { CanActivate, ExecutionContext, PipeTransform, UseGuards } from '@nestjs/common';
import { ErroApi, invalido } from '../../domain/erros';

export class IdPositivo implements PipeTransform {
  transform(valor: string | undefined) {
    if (valor === undefined) return undefined;
    if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor) || !Number.isSafeInteger(Number(valor))) {
      throw invalido('O ID deve ser um inteiro positivo.');
    }
    return Number(valor);
  }
}

class JsonGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    if (!req.is('application/json') && (!req.body || typeof req.body !== 'object' || !Object.keys(req.body).length)) {
      throw new ErroApi(415, 'FORMATO_INVALIDO', 'Use Content-Type application/json.');
    }
    return true;
  }
}
export const RecebeJson = () => UseGuards(JsonGuard);
