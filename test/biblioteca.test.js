const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Contexto } = require('../dist/application/contexto');
const { abrirBanco } = require('../dist/infrastructure/database');
const { carregarDemo } = require('../dist/infrastructure/database/demo');
const { criarApp } = require('../dist/app');

async function ambiente(t) {
  const db = abrirBanco(':memory:');
  const contas = carregarDemo(db);
  let hoje = '2026-11-06'; // Sexta-feira.
  const { app } = await criarApp(new Contexto(db, () => hoje), true);
  await app.listen(0, '127.0.0.1');
  const server = app.getHttpServer();
  t.after(async () => {
    await app.close();
    db.close();
  });
  async function chamar(metodo, rota, ator, corpo, esperado) {
    const headers = {};
    if (ator) headers.Authorization = 'Bearer ' + contas[ator - 1].token;
    if (corpo !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch('http://127.0.0.1:' + server.address().port + rota, {
      method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const dados = res.status === 204 ? await res.text() : await res.json();
    assert.ok([esperado].flat().includes(res.status),
      metodo + ' ' + rota + ' retornou ' + res.status + ': ' + JSON.stringify(dados));
    if (res.status >= 400) assert.ok(dados.erro.codigo && dados.erro.mensagem);
    return dados;
  }
  return {
    chamar, data: valor => { hoje = valor; },
    reservar: (ator, livroId = 1, status = 201) => chamar('POST', '/reservas', ator, { livroId }, status),
    emprestar: (leitorId, exemplarId = 1, status = 201) => chamar('POST', '/emprestimos', 3, { leitorId, exemplarId }, status),
    catalogo: () => chamar('GET', '/livros', null, undefined, 200),
  };
}

test('CT01 catálogo público mostra títulos, exemplares, unidades e 404 para livro inexistente', async t => {
  const a = await ambiente(t);
  const livros = await a.catalogo();
  assert.equal(livros.length, 2);
  assert.deepEqual(livros[0].exemplares.map(e => [e.id, e.unidade.nome, e.situacao]),
    [[1, 'Central', 'disponivel'], [2, 'Bairro', 'disponivel']]);
  await a.chamar('GET', '/livros/999', null, undefined, 404);
});

test('CT02 duas tentativas simultâneas sobre o mesmo exemplar geram somente um empréstimo', async t => {
  const a = await ambiente(t);
  const resultados = await Promise.all([1, 2].map(leitor => a.emprestar(leitor, 1, [201, 409])));
  assert.equal(resultados.filter(r => r.id).length, 1);
  assert.equal(resultados.filter(r => r.erro?.codigo === 'CONFLITO').length, 1);
  assert.equal((await a.catalogo())[0].exemplares[0].situacao, 'emprestado');
  await a.emprestar(1, 1, 409);
});

test('CT03 reserva ganha data e posição, duplicata retorna 409 e identidade vem da credencial', async t => {
  const a = await ambiente(t);
  const r = await a.reservar(1);
  assert.deepEqual([r.criadaEm, r.posicao, r.leitorId], ['2026-11-06', 1, 1]);
  await a.reservar(1, 1, 409);
  await a.reservar(1, 999, 404);
  await a.chamar('POST', '/reservas', null, { livroId: 1 }, 401);
  await a.chamar('POST', '/reservas', 1, { livroId: 1, leitorId: 2 }, 400);
});

test('CT04 fila por título respeita a ordem e cada leitor vê apenas seus dados', async t => {
  const a = await ambiente(t);
  const r1 = await a.reservar(1);
  const r2 = await a.reservar(2);
  await a.emprestar(2, 2, 409);
  const fila = await a.chamar('GET', '/reservas?livroId=1', 3, undefined, 200);
  assert.deepEqual(fila.map(r => r.posicao), [1, 2]);
  const minhas = await a.chamar('GET', '/reservas', 2, undefined, 200);
  assert.deepEqual(minhas.map(r => r.id), [r2.id]);
  await a.chamar('GET', '/reservas/' + r1.id, 2, undefined, 404);
  await a.emprestar(1);
  const proxima = await a.chamar('GET', '/reservas/' + r2.id, 2, undefined, 200);
  assert.deepEqual([proxima.situacao, proxima.posicao, proxima.exemplarId], ['liberada', 1, 2]);
});

test('CT05 devolução de exemplar errado e tentativa por leitor preservam o empréstimo', async t => {
  const a = await ambiente(t);
  const e = await a.emprestar(1);
  const rota = '/emprestimos/' + e.id + '/devolucao';
  await a.chamar('PATCH', rota, 3, { exemplarId: 2, unidadeDevolucaoId: 1 }, 409);
  await a.chamar('PATCH', rota, 1, { exemplarId: 1, unidadeDevolucaoId: 1 }, 403);
  assert.deepEqual(await a.chamar('GET', '/emprestimos/' + e.id, 3, undefined, 200), e);
  const devolvido = await a.chamar('PATCH', rota, 3, { exemplarId: 1, unidadeDevolucaoId: 1 }, 200);
  assert.equal(devolvido.dataDevolucao, '2026-11-06');
  assert.equal((await a.catalogo())[0].exemplares[0].situacao, 'disponivel');
  await a.chamar('PATCH', rota, 3, { exemplarId: 1, unidadeDevolucaoId: 1 }, 409);
});

test('CT06 devolução em outra unidade bloqueia o exemplar até o recebimento na origem', async t => {
  const a = await ambiente(t);
  const e = await a.emprestar(1, 3);
  const r = await a.reservar(2, 2);
  assert.equal(r.situacao, 'aguardando');
  const rota = '/emprestimos/' + e.id + '/devolucao';
  await a.chamar('PATCH', rota, 3, { exemplarId: 3, unidadeDevolucaoId: 999 }, 404);
  const registro = await a.chamar('PATCH', rota, 3, { exemplarId: 3, unidadeDevolucaoId: 2 }, 200);
  assert.equal(registro.unidadeDevolucaoId, 2);
  const copia = (await a.catalogo())[1].exemplares[0];
  assert.deepEqual([copia.unidade.id, copia.situacao], [2, 'em_transferencia']);
  await a.emprestar(2, 3, 409);
  await a.chamar('PATCH', '/exemplares/3/recebimento', 3, { unidadeId: 2 }, 409);
  await a.chamar('PATCH', '/exemplares/3/recebimento', 3, { unidadeId: 1 }, 200);
  assert.equal((await a.catalogo())[1].exemplares[0].situacao, 'reservado');
  await a.emprestar(2, 3);
});

test('CT07 sete dias úteis excluem fins de semana e somente os feriados da unidade', async t => {
  const a = await ambiente(t);
  await a.chamar('POST', '/unidades/1/feriados', 3, { data: '2026-11-09' }, 201);
  await a.chamar('POST', '/unidades/1/feriados', 3, { data: '2026-02-30' }, 400);
  assert.equal((await a.emprestar(1, 1)).prazoDevolucao, '2026-11-18');
  assert.equal((await a.emprestar(2, 2)).prazoDevolucao, '2026-11-17');
});

test('CT08 renovação pelo titular soma sete dias úteis ao prazo, preserva o histórico e respeita a fila', async t => {
  const a = await ambiente(t);
  const e = await a.emprestar(1);
  const rota = '/emprestimos/' + e.id + '/renovacao';
  await a.chamar('PATCH', rota, 2, undefined, 404);
  const atualizado = await a.chamar('PATCH', rota, 1, undefined, 200);
  assert.equal(atualizado.prazoDevolucao, '2026-11-26');
  assert.deepEqual(atualizado.renovacoes, [{ data: '2026-11-06', prazoAnterior: e.prazoDevolucao, novoPrazo: '2026-11-26' }]);
  const r = await a.reservar(2);
  await a.chamar('PATCH', rota, 1, undefined, 409);
  assert.deepEqual(await a.chamar('GET', '/emprestimos/' + e.id, 1, undefined, 200), atualizado);
  await a.chamar('PATCH', '/reservas/' + r.id + '/cancelamento', 2, undefined, 200);
  a.data('2026-11-27');
  await a.chamar('PATCH', rota, 1, undefined, 409);
});

test('CT09 expiração após dois dias úteis libera o próximo e ignora reservas encerradas', async t => {
  const a = await ambiente(t);
  await a.chamar('POST', '/unidades/1/feriados', 3, { data: '2026-11-09' }, 201);
  const r1 = await a.reservar(1);
  const cancelada = await a.reservar(2);
  await a.chamar('PATCH', '/reservas/' + cancelada.id + '/cancelamento', 2, undefined, 200);
  const r2 = await a.reservar(2);
  assert.equal(r1.retirarAte, '2026-11-11');
  const rota = '/reservas/' + r1.id + '/expirar';
  a.data('2026-11-11');
  await a.chamar('PATCH', rota, 3, undefined, 409);
  a.data('2026-11-12');
  await a.emprestar(1, 1, 409);
  assert.equal((await a.chamar('PATCH', rota, 3, undefined, 200)).situacao, 'expirada');
  await a.chamar('PATCH', rota, 3, undefined, 409);
  const fila = await a.chamar('GET', '/reservas/' + r2.id, 2, undefined, 200);
  assert.deepEqual([fila.situacao, fila.posicao, fila.retirarAte], ['liberada', 1, '2026-11-16']);
});

test('CT10 somente gestor registra ocorrência, exemplar fica indisponível e a reserva é realocada', async t => {
  const a = await ambiente(t);
  const r = await a.reservar(1);
  const dados = { exemplarId: 1, tipo: 'avaria', descricao: 'Capa solta' };
  await a.chamar('POST', '/ocorrencias', 1, dados, 403);
  await a.chamar('POST', '/ocorrencias', 3, dados, 403);
  const ocorrencia = await a.chamar('POST', '/ocorrencias', 4, dados, 201);
  assert.equal(ocorrencia.gestorId, 4);
  assert.equal((await a.catalogo())[0].exemplares[0].situacao, 'indisponivel');
  assert.equal((await a.chamar('GET', '/reservas/' + r.id, 1, undefined, 200)).exemplarId, 2);
  await a.emprestar(1, 1, 409);
});

test('Contrato HTTP publica os caminhos e rejeita IDs inválidos e rotas desconhecidas', async t => {
  const a = await ambiente(t);
  const api = await a.chamar('GET', '/openapi.json', null, undefined, 200);
  assert.ok(api.paths['/emprestimos/{id}/devolucao'].patch.requestBody.required);
  for (const recurso of ['livros', 'exemplares']) {
    assert.ok(api.paths['/' + recurso].post.requestBody.required);
    assert.ok(api.paths['/' + recurso + '/{id}'].delete.responses['204']);
  }
  await a.chamar('GET', '/livros/abc', null, undefined, 400);
  await a.chamar('GET', '/reservas?livroId=-1', 3, undefined, 400);
  await a.chamar('GET', '/rota-inexistente', null, undefined, 404);
});

test('CRUD de livros permite cadastrar, listar, consultar, editar e excluir', async t => {
  const { chamar } = await ambiente(t);
  const cadastro = { titulo: ' A Moreninha ', autor: 'Joaquim Manuel de Macedo' };
  await chamar('POST', '/livros', null, cadastro, 401);
  await chamar('POST', '/livros', 1, cadastro, 403);
  await chamar('POST', '/livros', 3, { ...cadastro, titulo: ' ' }, 400);
  const livro = await chamar('POST', '/livros', 3, cadastro, 201);
  const caminho = '/livros/' + livro.id;
  assert.equal(livro.titulo, 'A Moreninha');
  assert.ok((await chamar('GET', '/livros', null, undefined, 200)).some(l => l.id === livro.id));
  const editado = await chamar('PUT', caminho, 4, { titulo: 'O Moço Loiro', autor: cadastro.autor }, 200);
  assert.equal(editado.titulo, 'O Moço Loiro');
  assert.deepEqual(await chamar('GET', caminho, null, undefined, 200), editado);
  assert.equal(await chamar('DELETE', caminho, 3, undefined, 204), '');
  await chamar('GET', caminho, null, undefined, 404);
  await chamar('PUT', caminho, 3, cadastro, 404);
});

test('CRUD de exemplares reflete as alterações no catálogo e protege as referências', async t => {
  const { chamar } = await ambiente(t);
  const cadastro = { livroId: 1, unidadeOrigemId: 1 };
  await chamar('POST', '/exemplares', 1, cadastro, 403);
  await chamar('POST', '/exemplares', 3, { ...cadastro, livroId: 999 }, 404);
  await chamar('POST', '/exemplares', 3, { ...cadastro, unidadeOrigemId: 999 }, 404);
  await chamar('POST', '/exemplares', 3, { ...cadastro, situacao: 'emprestado' }, 400);
  const exemplar = await chamar('POST', '/exemplares', 4, cadastro, 201);
  const caminho = '/exemplares/' + exemplar.id;
  assert.equal(exemplar.situacao, 'disponivel');
  assert.deepEqual(await chamar('GET', caminho, null, undefined, 200), exemplar);
  const editado = await chamar('PUT', caminho, 3, { livroId: 2, unidadeOrigemId: 2 }, 200);
  assert.deepEqual([editado.livroId, editado.unidade.id], [2, 2]);
  const lista = await chamar('GET', '/exemplares?livroId=2', null, undefined, 200);
  assert.ok(lista.every(e => e.livroId === 2) && lista.some(e => e.id === exemplar.id));
  await chamar('DELETE', '/livros/2', 3, undefined, 409);
  assert.equal(await chamar('DELETE', caminho, 4, undefined, 204), '');
  await chamar('GET', caminho, null, undefined, 404);
  const livro = await chamar('GET', '/livros/2', null, undefined, 200);
  assert.ok(livro.exemplares.every(e => e.id !== exemplar.id));
});

test('Novo exemplar atende a fila e o CRUD preserva reservas e histórico de empréstimos', async t => {
  const a = await ambiente(t);
  const livro = await a.chamar('POST', '/livros', 3, { titulo: 'Quincas Borba', autor: 'Machado de Assis' }, 201);
  const reserva = await a.reservar(1, livro.id);
  assert.equal(reserva.situacao, 'aguardando');
  await a.chamar('DELETE', '/livros/' + livro.id, 3, undefined, 409);
  const exemplar = await a.chamar('POST', '/exemplares', 3, { livroId: livro.id, unidadeOrigemId: 2 }, 201);
  const caminho = '/exemplares/' + exemplar.id;
  assert.equal(exemplar.situacao, 'reservado');
  await a.chamar('PUT', caminho, 3, { livroId: livro.id, unidadeOrigemId: 1 }, 409);
  await a.chamar('DELETE', caminho, 3, undefined, 409);
  const emprestimo = await a.emprestar(1, exemplar.id);
  assert.equal((await a.chamar('GET', caminho, null, undefined, 200)).situacao, 'emprestado');
  await a.chamar('PATCH', '/emprestimos/' + emprestimo.id + '/devolucao', 3,
    { exemplarId: exemplar.id, unidadeDevolucaoId: 2 }, 200);
  await a.chamar('PUT', caminho, 3, { livroId: 1, unidadeOrigemId: 2 }, 409);
  await a.chamar('DELETE', caminho, 3, undefined, 409);
});
