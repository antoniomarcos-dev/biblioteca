import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { ErroApi } from '../../domain/erros';

@Catch()
export class ErroFilter implements ExceptionFilter {
  catch(erro: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    let status = 500, codigo = 'ERRO_INTERNO', mensagem = 'Erro interno ao processar a solicitação.';
    if (erro instanceof ErroApi) {
      ({ status, codigo, message: mensagem } = erro);
    } else if (erro instanceof HttpException) {
      status = erro.getStatus();
      codigo = ({ 400: 'DADOS_INVALIDOS', 404: 'NAO_ENCONTRADO', 413: 'CORPO_MUITO_GRANDE', 415: 'FORMATO_INVALIDO' })[status] ?? 'ERRO_HTTP';
      mensagem = status === 404 ? 'Endpoint não encontrado.' : erro.message;
    } else {
      console.error(erro);
    }
    if (status === 401) res.set('WWW-Authenticate', 'Bearer');
    res.status(status).json({ erro: { codigo, mensagem } });
  }
}
