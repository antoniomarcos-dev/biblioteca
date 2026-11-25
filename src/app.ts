import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Contexto } from './application/contexto';
import { invalido } from './domain/erros';
import { ErroFilter } from './presentation/http/erro.filter';
import { join } from 'node:path';

export async function criarApp(contexto: Contexto, silencioso = false) {
  const ctx = silencioso ? new Contexto(contexto.db, contexto.hoje, true) : contexto;
  const app = await NestFactory.create<NestExpressApplication>(AppModule.configurar(ctx), {
    logger: silencioso ? false : ['error', 'warn'], bodyParser: false,
  });
  app.enableCors();
  app.useBodyParser('json', { limit: '32kb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '32kb' });
  app.useGlobalFilters(new ErroFilter());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true,
    exceptionFactory: erros => invalido('Campo inválido ou ausente: ' + erros.map(e => e.property).join(', ') + '.'),
  }));
  const config = new DocumentBuilder().setTitle('Biblioteca').setVersion('1.0').setOpenAPIVersion('3.1.0')
    .setDescription('Consulte o catálogo ou use Authorize com o token do seu perfil para testar as operações protegidas.').addBearerAuth().build();
  const documento = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documento, {
    jsonDocumentUrl: 'openapi.json', raw: ['json'], swaggerOptions: { docExpansion: 'list', tryItOutEnabled: true },
  });
  app.useStaticAssets(join(__dirname, '..', 'public'));
  const rotas = Object.entries(documento.paths).flatMap(([caminho, operacoes]) =>
    Object.keys(operacoes).map(metodo => metodo.toUpperCase() + ' ' + caminho.replace(/{(\w+)}/g, ':$1')));
  return { app, rotas: [...rotas, 'GET /openapi.json', 'GET /docs', 'GET /'] };
}
