import 'reflect-metadata';
import { criarApp } from './app';
import { Contexto } from './application/contexto';
import { abrirBanco } from './infrastructure/database';
import { garantirDadosIniciais } from './infrastructure/database/demo';

async function iniciar() {
  const db = abrirBanco();
  garantirDadosIniciais(db);
  const { app, rotas } = await criarApp(new Contexto(db));
  const host = process.env.HOST || '127.0.0.1';
  await app.listen(Number(process.env.PORT ?? 3000), host);
  console.log('Catálogo da biblioteca: ' + await app.getUrl());
  console.log('Documentação da API: ' + await app.getUrl() + '/docs');
  console.log(rotas.join('\n'));
  const encerrar = async () => { await app.close(); db.close(); };
  process.once('SIGINT', encerrar);
  process.once('SIGTERM', encerrar);
}
iniciar().catch(erro => { console.error(erro); process.exitCode = 1; });
