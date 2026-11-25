const porId = id => document.getElementById(id);
const busca = porId('busca');
const filtro = porId('filtro');
const resultado = porId('resultado');
const tentar = porId('tentar');
const modelo = porId('modelo-livro');
const aviso = porId('aviso');

const API_BASE = location.protocol.startsWith('http') && location.port === '3000' ? '' : 'http://127.0.0.1:3000';
if (API_BASE && porId('link-docs')) porId('link-docs').href = API_BASE + '/docs';

const nomesLeitores = { 1: 'Ana (Leitora #1)', 2: 'Beto (Leitor #2)' };
const nomesUnidades = { 1: 'Central', 2: 'Bairro' };
const situacoes = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  emprestado: 'Emprestado',
  em_transferencia: 'Em transferência',
  indisponivel: 'Indisponível',
};
const situacoesReserva = {
  aguardando: 'Aguardando na fila',
  liberada: 'Liberada para retirada',
  atendida: 'Atendida (Emprestada)',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
};

let catalogo = [];
let emprestimos = [];
let reservas = [];
let ocorrencias = [];
let feriados = [];

function mostrarAviso(texto, erro = false) {
  if (!aviso) return;
  aviso.textContent = texto;
  aviso.classList.toggle('erro', erro);
  aviso.hidden = !texto;
}

async function chamarApi(caminho, opcoes = {}) {
  const headers = { ...(opcoes.headers || {}) };
  if (opcoes.ator) headers.Authorization = 'Bearer ' + opcoes.ator;
  if (opcoes.body !== undefined) headers['Content-Type'] = 'application/json';
  const resposta = await fetch(API_BASE + caminho, {
    method: opcoes.method || 'GET',
    headers,
    body: opcoes.body === undefined ? undefined : JSON.stringify(opcoes.body),
    cache: 'no-store',
  });
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new Error(dados?.erro?.mensagem || 'Não foi possível concluir a operação.');
  }
  return dados;
}

function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

function disponiveis(livro) {
  return livro.exemplares.filter(exemplar => exemplar.situacao === 'disponivel').length;
}

function encontrarLivroPorId(livroId) {
  return catalogo.find(l => l.id === livroId);
}

function encontrarExemplarInfo(exemplarId) {
  for (const livro of catalogo) {
    const ex = livro.exemplares.find(e => e.id === exemplarId);
    if (ex) return { livro, exemplar: ex };
  }
  return null;
}

function emprestimoAtivoDoExemplar(exemplarId) {
  return emprestimos.find(e => e.exemplarId === exemplarId && !e.dataDevolucao);
}

function reservaLiberadaDoExemplar(exemplarId) {
  return reservas.find(r => r.exemplarId === exemplarId && r.situacao === 'liberada');
}

// ==================== AÇÕES OPERACIONAIS ====================

async function executarAcao(mensagemSucesso, fn) {
  try {
    mostrarAviso('');
    await fn();
    if (mensagemSucesso) mostrarAviso(mensagemSucesso);
    await carregar();
  } catch (erro) {
    mostrarAviso(erro.message, true);
  }
}

function prepararEdicaoLivro(livro) {
  porId('editar-livro-id').value = String(livro.id);
  porId('novo-titulo').value = livro.titulo;
  porId('novo-autor').value = livro.autor;
  porId('titulo-form-livro').textContent = 'Editar livro #' + livro.id;
  porId('btn-cadastrar').textContent = 'Salvar alterações';
  porId('campo-unidade-inicial').hidden = true;
  porId('btn-cancelar-edicao').hidden = false;
  porId('novo-titulo').focus();
}

function limparFormularioLivro() {
  porId('editar-livro-id').value = '';
  porId('novo-titulo').value = '';
  porId('novo-autor').value = '';
  porId('titulo-form-livro').textContent = 'Cadastrar novo livro';
  porId('btn-cadastrar').textContent = 'Cadastrar livro';
  porId('campo-unidade-inicial').hidden = false;
  porId('btn-cancelar-edicao').hidden = true;
}

async function adicionarExemplar(livroId, unidadeOrigemId) {
  await executarAcao('Exemplar cadastrado na unidade ' + (nomesUnidades[unidadeOrigemId] || unidadeOrigemId) + '.', () =>
    chamarApi('/exemplares', { method: 'POST', body: { livroId, unidadeOrigemId } })
  );
}

async function alternarUnidadeExemplar(livroId, exemplar) {
  const novaUnidade = exemplar.unidadeOrigemId === 1 ? 2 : 1;
  await executarAcao('Exemplar #' + exemplar.id + ' transferido para a unidade ' + nomesUnidades[novaUnidade] + '.', () =>
    chamarApi('/exemplares/' + exemplar.id, {
      method: 'PUT',
      body: { livroId, unidadeOrigemId: novaUnidade },
    })
  );
}

async function removerExemplar(exemplarId) {
  await executarAcao('Exemplar #' + exemplarId + ' excluído.', () =>
    chamarApi('/exemplares/' + exemplarId, { method: 'DELETE' })
  );
}

async function removerLivro(livro) {
  await executarAcao('Livro "' + livro.titulo + '" excluído do acervo.', async () => {
    for (const exemplar of livro.exemplares) {
      if (exemplar.situacao === 'disponivel') {
        await chamarApi('/exemplares/' + exemplar.id, { method: 'DELETE' }).catch(() => {});
      }
    }
    await chamarApi('/livros/' + livro.id, { method: 'DELETE' });
  });
}

async function reservarLivro(livroId, leitorId) {
  await executarAcao('Reserva criada para ' + (nomesLeitores[leitorId] || 'Leitor #' + leitorId) + '.', () =>
    chamarApi('/reservas', { method: 'POST', ator: leitorId, body: { livroId } })
  );
}

async function cancelarReserva(reserva) {
  await executarAcao('Reserva #' + reserva.id + ' cancelada.', () =>
    chamarApi('/reservas/' + reserva.id + '/cancelamento', { method: 'PATCH', ator: reserva.leitorId })
  );
}

async function expirarReserva(reserva) {
  await executarAcao('Reserva #' + reserva.id + ' marcada como expirada.', () =>
    chamarApi('/reservas/' + reserva.id + '/expirar', { method: 'PATCH', ator: 'bibliotecario' })
  );
}

async function realizarEmprestimo(leitorId, exemplarId) {
  await executarAcao('Empréstimo do exemplar #' + exemplarId + ' registrado para ' + (nomesLeitores[leitorId] || 'Leitor #' + leitorId) + '.', () =>
    chamarApi('/emprestimos', { method: 'POST', ator: 'bibliotecario', body: { leitorId: Number(leitorId), exemplarId: Number(exemplarId) } })
  );
}

async function devolverEmprestimo(emprestimo, unidadeDevolucaoId) {
  const nomeUnidade = nomesUnidades[unidadeDevolucaoId] || ('Unidade #' + unidadeDevolucaoId);
  await executarAcao('Devolutiva do empréstimo #' + emprestimo.id + ' registrada na unidade ' + nomeUnidade + '.', () =>
    chamarApi('/emprestimos/' + emprestimo.id + '/devolucao', {
      method: 'PATCH',
      ator: 'bibliotecario',
      body: { exemplarId: emprestimo.exemplarId, unidadeDevolucaoId: Number(unidadeDevolucaoId) },
    })
  );
}

async function renovarEmprestimo(emprestimo) {
  await executarAcao('Empréstimo #' + emprestimo.id + ' renovado por mais 7 dias úteis.', () =>
    chamarApi('/emprestimos/' + emprestimo.id + '/renovacao', {
      method: 'PATCH',
      ator: emprestimo.leitorId,
    })
  );
}

async function receberTransferencia(exemplar) {
  await executarAcao('Transferência do exemplar #' + exemplar.id + ' recebida na unidade de origem.', () =>
    chamarApi('/exemplares/' + exemplar.id + '/recebimento', {
      method: 'PATCH',
      ator: 'bibliotecario',
      body: { unidadeId: exemplar.unidadeOrigemId },
    })
  );
}

async function registrarOcorrenciaRapida(exemplarId, tipo, descricaoPadrao) {
  const seletorExemplar = porId('ocorrencia-exemplar-id');
  const seletorTipo = porId('ocorrencia-tipo');
  const campoDescricao = porId('ocorrencia-descricao');
  if (seletorExemplar && campoDescricao && !descricaoPadrao) {
    seletorExemplar.value = String(exemplarId);
    seletorTipo.value = tipo || 'avaria';
    campoDescricao.focus();
    porId('secao-ocorrencias')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  await executarAcao('Ocorrência (' + tipo + ') registrada para o exemplar #' + exemplarId + '.', () =>
    chamarApi('/ocorrencias', {
      method: 'POST',
      ator: 'gestor',
      body: { exemplarId: Number(exemplarId), tipo, descricao: descricaoPadrao },
    })
  );
}

// ==================== RENDERIZAÇÃO ====================

function criarBotao(texto, classe, aoClicar) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = classe;
  btn.textContent = texto;
  btn.addEventListener('click', aoClicar);
  return btn;
}

function montarLivro(livro) {
  const linha = modelo.content.firstElementChild.cloneNode(true);
  linha.querySelector('.titulo').textContent = '#' + livro.id + ' · ' + livro.titulo;
  linha.querySelector('.autor').textContent = livro.autor;

  const quantidade = disponiveis(livro);
  const reservasAtivasLivro = reservas.filter(r => r.livroId === livro.id && ['aguardando', 'liberada'].includes(r.situacao));
  const situacao = linha.querySelector('.situacao');
  const textoFila = reservasAtivasLivro.length ? ' · ' + reservasAtivasLivro.length + ' na fila' : '';
  situacao.textContent = (quantidade ? quantidade + (quantidade === 1 ? ' disponível' : ' disponíveis') : 'Sem disponibilidade') + textoFila;
  if (quantidade) situacao.classList.add('disponivel');

  linha.querySelector('.btn-reservar-ana')?.addEventListener('click', () => reservarLivro(livro.id, 1));
  linha.querySelector('.btn-reservar-beto')?.addEventListener('click', () => reservarLivro(livro.id, 2));
  linha.querySelector('.btn-add-central')?.addEventListener('click', () => adicionarExemplar(livro.id, 1));
  linha.querySelector('.btn-add-bairro')?.addEventListener('click', () => adicionarExemplar(livro.id, 2));
  linha.querySelector('.btn-editar-livro')?.addEventListener('click', () => prepararEdicaoLivro(livro));
  linha.querySelector('.btn-excluir-livro')?.addEventListener('click', () => removerLivro(livro));

  const lista = linha.querySelector('ul');
  for (const exemplar of livro.exemplares) {
    const item = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'info-exemplar';

    const rotulo = document.createElement('strong');
    const origemNome = nomesUnidades[exemplar.unidadeOrigemId] || exemplar.unidadeOrigemId;
    const textoOrigem = exemplar.unidade.id !== exemplar.unidadeOrigemId ? ' (Origem: ' + origemNome + ')' : '';
    rotulo.textContent = 'Exemplar #' + exemplar.id + ' · ' + exemplar.unidade.nome + textoOrigem;

    const badge = document.createElement('span');
    badge.className = 'badge ' + exemplar.situacao;
    badge.textContent = situacoes[exemplar.situacao] ?? exemplar.situacao;
    info.append(rotulo, badge);

    const empAtivo = emprestimoAtivoDoExemplar(exemplar.id);
    const resLiberada = reservaLiberadaDoExemplar(exemplar.id);

    if (empAtivo) {
      const meta = document.createElement('span');
      meta.className = 'meta-exemplar';
      meta.textContent = 'Com ' + (nomesLeitores[empAtivo.leitorId] || 'Leitor #' + empAtivo.leitorId) + ' · Prazo: ' + empAtivo.prazoDevolucao;
      info.append(meta);
    } else if (resLiberada) {
      const meta = document.createElement('span');
      meta.className = 'meta-exemplar';
      meta.textContent = 'Separado p/ ' + (nomesLeitores[resLiberada.leitorId] || 'Leitor #' + resLiberada.leitorId) + ' até ' + resLiberada.retirarAte;
      info.append(meta);
    }

    const acoes = document.createElement('div');
    acoes.className = 'acoes-exemplar';

    if (exemplar.situacao === 'disponivel') {
      acoes.append(
        criarBotao('Emprestar p/ Ana', 'acao-destaque', () => realizarEmprestimo(1, exemplar.id)),
        criarBotao('Emprestar p/ Beto', 'acao-destaque', () => realizarEmprestimo(2, exemplar.id)),
        criarBotao('Mudar p/ ' + (exemplar.unidadeOrigemId === 1 ? 'Bairro' : 'Central'), 'acao-secundaria', () => alternarUnidadeExemplar(livro.id, exemplar)),
        criarBotao('Registrar avaria', 'acao-aviso', () => registrarOcorrenciaRapida(exemplar.id, 'avaria', 'Avaria física registrada no exemplar')),
        criarBotao('Excluir', 'acao-perigo', () => removerExemplar(exemplar.id))
      );
    } else if (exemplar.situacao === 'reservado' && resLiberada) {
      acoes.append(
        criarBotao('Emprestar a ' + (nomesLeitores[resLiberada.leitorId] || 'Reservante'), 'acao-destaque', () => realizarEmprestimo(resLiberada.leitorId, exemplar.id)),
        criarBotao('Registrar avaria', 'acao-aviso', () => registrarOcorrenciaRapida(exemplar.id, 'avaria', 'Avaria física registrada no exemplar'))
      );
    } else if (exemplar.situacao === 'emprestado' && empAtivo) {
      acoes.append(
        criarBotao('Devolver na Central', 'acao-destaque', () => devolverEmprestimo(empAtivo, 1)),
        criarBotao('Devolver no Bairro', 'acao-secundaria', () => devolverEmprestimo(empAtivo, 2)),
        criarBotao('Renovar (+7d)', 'acao-secundaria', () => renovarEmprestimo(empAtivo)),
        criarBotao('Extravio/Avaria', 'acao-aviso', () => registrarOcorrenciaRapida(exemplar.id, 'extravio', 'Exemplar avariado ou extraviado durante empréstimo'))
      );
    } else if (exemplar.situacao === 'em_transferencia') {
      acoes.append(
        criarBotao('Receber na origem (' + origemNome + ')', 'acao-destaque', () => receberTransferencia(exemplar)),
        criarBotao('Registrar avaria', 'acao-aviso', () => registrarOcorrenciaRapida(exemplar.id, 'avaria', 'Avaria constatada na transferência'))
      );
    }

    item.append(info, acoes);
    lista.append(item);
  }

  if (!livro.exemplares.length) {
    const vazio = document.createElement('p');
    vazio.className = 'meta-exemplar';
    vazio.textContent = 'Este título ainda não possui exemplares cadastrados.';
    lista.replaceWith(vazio);
  }
  return linha;
}

function mostrarLivros() {
  const termo = normalizar(busca.value);
  const livros = catalogo.filter(livro => {
    const corresponde = normalizar(livro.titulo + ' ' + livro.autor + ' ' + livro.id).includes(termo);
    const temCopia = disponiveis(livro) > 0;
    return corresponde && (filtro.value === 'todos' || temCopia === (filtro.value === 'disponiveis'));
  });
  porId('livros').replaceChildren(...livros.map(montarLivro));
  if (!catalogo.length) resultado.textContent = 'O acervo ainda não tem livros cadastrados.';
  else if (!livros.length) resultado.textContent = 'Nenhum livro encontrado. Experimente outro termo ou filtro.';
  else resultado.textContent = livros.length === 1 ? '1 título exibido' : livros.length + ' títulos exibidos';
}

function mostrarEmprestimos() {
  const container = porId('lista-emprestimos');
  if (!container) return;
  if (!emprestimos.length) {
    const vazio = document.createElement('div');
    vazio.className = 'cartao-vazio';
    vazio.textContent = 'Nenhum empréstimo registrado até o momento. Use o formulário acima ou clique em "Emprestar" em um exemplar do acervo.';
    container.replaceChildren(vazio);
    return;
  }

  const cartoes = emprestimos.map(emp => {
    const cartao = document.createElement('article');
    cartao.className = 'cartao-item';
    const infoEx = encontrarExemplarInfo(emp.exemplarId);
    const tituloLivro = infoEx ? infoEx.livro.titulo : ('Exemplar #' + emp.exemplarId);
    const ativo = !emp.dataDevolucao;

    const topo = document.createElement('div');
    topo.className = 'cartao-topo';
    const cab = document.createElement('div');
    const tit = document.createElement('div');
    tit.className = 'cartao-titulo';
    tit.textContent = 'Empréstimo #' + emp.id + ' · ' + tituloLivro;
    const sub = document.createElement('div');
    sub.className = 'cartao-sub';
    sub.textContent = 'Exemplar #' + emp.exemplarId + ' · Leitor: ' + (nomesLeitores[emp.leitorId] || ('ID ' + emp.leitorId));
    cab.append(tit, sub);

    const badge = document.createElement('span');
    badge.className = 'badge ' + (ativo ? 'emprestado' : 'devolvido');
    badge.textContent = ativo ? 'Em andamento' : 'Devolvido';
    topo.append(cab, badge);

    const corpo = document.createElement('div');
    corpo.className = 'cartao-corpo';
    const linhaDatas = document.createElement('div');
    linhaDatas.textContent = 'Retirada: ' + emp.dataEmprestimo + ' (' + (nomesUnidades[emp.unidadeEmprestimoId] || emp.unidadeEmprestimoId) + ') · Prazo: ' + emp.prazoDevolucao;
    corpo.append(linhaDatas);

    if (emp.renovacoes?.length) {
      const linhaRen = document.createElement('div');
      linhaRen.textContent = 'Renovações (' + emp.renovacoes.length + '): ' +
        emp.renovacoes.map(r => r.prazoAnterior + ' → ' + r.novoPrazo).join(', ');
      corpo.append(linhaRen);
    }

    if (emp.dataDevolucao) {
      const linhaDev = document.createElement('div');
      linhaDev.textContent = 'Devolutiva em ' + emp.dataDevolucao + ' na unidade ' + (nomesUnidades[emp.unidadeDevolucaoId] || emp.unidadeDevolucaoId);
      corpo.append(linhaDev);
    }

    cartao.append(topo, corpo);

    if (ativo) {
      const acoes = document.createElement('div');
      acoes.className = 'acoes-cartao';
      acoes.append(
        criarBotao('Devolver na Central', 'acao-destaque', () => devolverEmprestimo(emp, 1)),
        criarBotao('Devolver no Bairro', 'acao-secundaria', () => devolverEmprestimo(emp, 2)),
        criarBotao('Renovar (+7 dias úteis)', 'acao-secundaria', () => renovarEmprestimo(emp))
      );
      cartao.append(acoes);
    }
    return cartao;
  });

  container.replaceChildren(...cartoes);
}

function mostrarReservas() {
  const container = porId('lista-reservas');
  if (!container) return;
  if (!reservas.length) {
    const vazio = document.createElement('div');
    vazio.className = 'cartao-vazio';
    vazio.textContent = 'Nenhuma reserva registrada. Use o formulário acima ou os botões "Reservar" em qualquer livro do acervo.';
    container.replaceChildren(vazio);
    return;
  }

  const cartoes = reservas.map(res => {
    const cartao = document.createElement('article');
    cartao.className = 'cartao-item';
    const livro = encontrarLivroPorId(res.livroId);
    const tituloLivro = livro ? livro.titulo : ('Livro #' + res.livroId);

    const topo = document.createElement('div');
    topo.className = 'cartao-topo';
    const cab = document.createElement('div');
    const tit = document.createElement('div');
    tit.className = 'cartao-titulo';
    tit.textContent = 'Reserva #' + res.id + ' · ' + tituloLivro;
    const sub = document.createElement('div');
    sub.className = 'cartao-sub';
    sub.textContent = 'Leitor: ' + (nomesLeitores[res.leitorId] || ('ID ' + res.leitorId)) + ' · Criada em ' + res.criadaEm;
    cab.append(tit, sub);

    const badge = document.createElement('span');
    badge.className = 'badge ' + res.situacao;
    badge.textContent = situacoesReserva[res.situacao] || res.situacao;
    topo.append(cab, badge);

    const corpo = document.createElement('div');
    corpo.className = 'cartao-corpo';
    if (res.posicao) {
      const pos = document.createElement('div');
      pos.textContent = 'Posição na fila do título: ' + res.posicao + 'º lugar';
      corpo.append(pos);
    }
    if (res.exemplarId) {
      const ex = document.createElement('div');
      ex.textContent = 'Exemplar vinculado: #' + res.exemplarId + (res.retirarAte ? ' · Retirar até: ' + res.retirarAte : '');
      corpo.append(ex);
    }

    cartao.append(topo, corpo);

    if (['aguardando', 'liberada'].includes(res.situacao)) {
      const acoes = document.createElement('div');
      acoes.className = 'acoes-cartao';
      if (res.situacao === 'liberada' && res.exemplarId) {
        acoes.append(
          criarBotao('Efetivar empréstimo (Retirar)', 'acao-destaque', () => realizarEmprestimo(res.leitorId, res.exemplarId)),
          criarBotao('Expirar prazo', 'acao-aviso', () => expirarReserva(res))
        );
      }
      acoes.append(
        criarBotao('Cancelar reserva', 'acao-perigo', () => cancelarReserva(res))
      );
      cartao.append(acoes);
    }

    return cartao;
  });

  container.replaceChildren(...cartoes);
}

function mostrarOcorrencias() {
  const container = porId('lista-ocorrencias');
  if (!container) return;
  if (!ocorrencias.length) {
    const vazio = document.createElement('div');
    vazio.className = 'cartao-vazio';
    vazio.textContent = 'Nenhuma ocorrência de avaria ou extravio registrada.';
    container.replaceChildren(vazio);
    return;
  }

  const cartoes = ocorrencias.map(oc => {
    const cartao = document.createElement('article');
    cartao.className = 'cartao-item';
    const infoEx = encontrarExemplarInfo(oc.exemplarId);
    const tituloLivro = infoEx ? infoEx.livro.titulo : ('Exemplar #' + oc.exemplarId);

    const topo = document.createElement('div');
    topo.className = 'cartao-topo';
    const cab = document.createElement('div');
    const tit = document.createElement('div');
    tit.className = 'cartao-titulo';
    tit.textContent = 'Ocorrência #' + oc.id + ' · ' + tituloLivro;
    const sub = document.createElement('div');
    sub.className = 'cartao-sub';
    sub.textContent = 'Exemplar #' + oc.exemplarId + ' · Data: ' + oc.data + ' · Gestor #' + oc.gestorId + ' (Dani)';
    cab.append(tit, sub);

    const badge = document.createElement('span');
    badge.className = 'badge ' + oc.tipo;
    badge.textContent = oc.tipo === 'extravio' ? 'Extravio' : 'Avaria';
    topo.append(cab, badge);

    const corpo = document.createElement('div');
    corpo.className = 'cartao-corpo';
    corpo.textContent = 'Descrição: ' + oc.descricao;

    cartao.append(topo, corpo);
    return cartao;
  });

  container.replaceChildren(...cartoes);
}

function mostrarFeriados() {
  const container = porId('lista-feriados');
  if (!container) return;
  const tags = feriados.map(f => {
    const span = document.createElement('span');
    span.className = 'tag-feriado';
    span.textContent = (nomesUnidades[f.unidadeId] || ('Unidade ' + f.unidadeId)) + ': ' + f.data;
    return span;
  });
  container.replaceChildren(...tags);
}

function atualizarSeletores() {
  const selExemplarLivro = porId('exemplar-livro-id');
  const selReservaLivro = porId('reserva-livro-id');
  const selEmprestimoExemplar = porId('emprestimo-exemplar-id');
  const selOcorrenciaExemplar = porId('ocorrencia-exemplar-id');

  const opcoesLivros = catalogo.map(livro => {
    const opt = document.createElement('option');
    opt.value = String(livro.id);
    opt.textContent = '#' + livro.id + ' — ' + livro.titulo + ' (' + livro.autor + ')';
    return opt;
  });

  if (selExemplarLivro) {
    const valorAtual = selExemplarLivro.value;
    selExemplarLivro.replaceChildren(...opcoesLivros.map(o => o.cloneNode(true)));
    if (valorAtual) selExemplarLivro.value = valorAtual;
  }

  if (selReservaLivro) {
    const valorAtual = selReservaLivro.value;
    selReservaLivro.replaceChildren(...opcoesLivros.map(o => o.cloneNode(true)));
    if (valorAtual) selReservaLivro.value = valorAtual;
  }

  const todosExemplares = catalogo.flatMap(livro =>
    livro.exemplares.map(ex => ({ livro, exemplar: ex }))
  );

  if (selEmprestimoExemplar) {
    const elegiveis = todosExemplares.filter(({ exemplar }) =>
      exemplar.situacao === 'disponivel' || exemplar.situacao === 'reservado'
    );
    const opcoes = elegiveis.map(({ livro, exemplar }) => {
      const opt = document.createElement('option');
      opt.value = String(exemplar.id);
      const resLib = reservaLiberadaDoExemplar(exemplar.id);
      const sufixo = resLib ? ' [Reservado p/ ' + (nomesLeitores[resLib.leitorId] || resLib.leitorId) + ']' : '';
      opt.textContent = 'Exemplar #' + exemplar.id + ' — ' + livro.titulo + ' (' + exemplar.unidade.nome + ')' + sufixo;
      return opt;
    });
    if (!opcoes.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Nenhum exemplar disponível no momento';
      opcoes.push(opt);
    }
    selEmprestimoExemplar.replaceChildren(...opcoes);
  }

  if (selOcorrenciaExemplar) {
    const opcoes = todosExemplares.map(({ livro, exemplar }) => {
      const opt = document.createElement('option');
      opt.value = String(exemplar.id);
      opt.textContent = 'Exemplar #' + exemplar.id + ' — ' + livro.titulo + ' (' + (situacoes[exemplar.situacao] || exemplar.situacao) + ')';
      return opt;
    });
    if (!opcoes.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Nenhum exemplar cadastrado';
      opcoes.push(opt);
    }
    selOcorrenciaExemplar.replaceChildren(...opcoes);
  }
}

async function carregar() {
  tentar.hidden = true;
  resultado.textContent = 'Carregando dados do sistema…';
  try {
    const [listaLivros, listaEmp, listaRes, listaOc, listaFer] = await Promise.all([
      chamarApi('/livros'),
      chamarApi('/emprestimos').catch(() => []),
      chamarApi('/reservas').catch(() => []),
      chamarApi('/ocorrencias').catch(() => []),
      chamarApi('/unidades/feriados').catch(() => []),
    ]);

    catalogo = listaLivros;
    emprestimos = listaEmp;
    reservas = listaRes;
    ocorrencias = listaOc;
    feriados = listaFer;

    const totalExemplares = catalogo.reduce((n, livro) => n + livro.exemplares.length, 0);
    const totalDisponiveis = catalogo.reduce((n, livro) => n + disponiveis(livro), 0);
    const totalEmprestados = emprestimos.filter(e => !e.dataDevolucao).length;
    const totalReservasAtivas = reservas.filter(r => ['aguardando', 'liberada'].includes(r.situacao)).length;

    porId('total-titulos').textContent = catalogo.length;
    porId('total-exemplares').textContent = totalExemplares;
    porId('total-disponiveis').textContent = totalDisponiveis;
    if (porId('total-emprestados')) porId('total-emprestados').textContent = totalEmprestados;
    if (porId('total-reservas')) porId('total-reservas').textContent = totalReservasAtivas;
    if (porId('total-ocorrencias')) porId('total-ocorrencias').textContent = ocorrencias.length;

    busca.disabled = filtro.disabled = false;
    atualizarSeletores();
    mostrarLivros();
    mostrarEmprestimos();
    mostrarReservas();
    mostrarOcorrencias();
    mostrarFeriados();
  } catch {
    resultado.textContent = 'Não foi possível carregar o sistema da biblioteca.';
    tentar.hidden = false;
  }
}

// ==================== EVENTOS DOS FORMULÁRIOS ====================

porId('form-livro')?.addEventListener('submit', async evento => {
  evento.preventDefault();
  const editId = porId('editar-livro-id').value;
  const titulo = porId('novo-titulo').value.trim();
  const autor = porId('novo-autor').value.trim();
  const unidadeInicial = porId('nova-unidade').value;
  if (!titulo || !autor) return;

  if (editId) {
    await executarAcao('Livro #' + editId + ' atualizado para "' + titulo + '".', async () => {
      await chamarApi('/livros/' + editId, { method: 'PUT', body: { titulo, autor } });
      limparFormularioLivro();
    });
  } else {
    await executarAcao('Livro "' + titulo + '" cadastrado com sucesso.', async () => {
      const livro = await chamarApi('/livros', { method: 'POST', body: { titulo, autor } });
      if (unidadeInicial) {
        await chamarApi('/exemplares', {
          method: 'POST',
          body: { livroId: livro.id, unidadeOrigemId: Number(unidadeInicial) },
        });
      }
      limparFormularioLivro();
    });
  }
});

porId('btn-cancelar-edicao')?.addEventListener('click', limparFormularioLivro);

porId('form-exemplar')?.addEventListener('submit', async evento => {
  evento.preventDefault();
  const livroId = Number(porId('exemplar-livro-id').value);
  const unidadeOrigemId = Number(porId('exemplar-unidade-id').value);
  if (!livroId || !unidadeOrigemId) return;
  await adicionarExemplar(livroId, unidadeOrigemId);
});

porId('form-emprestimo')?.addEventListener('submit', async evento => {
  evento.preventDefault();
  const leitorId = Number(porId('emprestimo-leitor-id').value);
  const exemplarId = Number(porId('emprestimo-exemplar-id').value);
  if (!leitorId || !exemplarId) return;
  await realizarEmprestimo(leitorId, exemplarId);
});

porId('form-reserva')?.addEventListener('submit', async evento => {
  evento.preventDefault();
  const leitorId = Number(porId('reserva-leitor-id').value);
  const livroId = Number(porId('reserva-livro-id').value);
  if (!leitorId || !livroId) return;
  await reservarLivro(livroId, leitorId);
});

porId('form-ocorrencia')?.addEventListener('submit', async evento => {
  evento.preventDefault();
  const exemplarId = Number(porId('ocorrencia-exemplar-id').value);
  const tipo = porId('ocorrencia-tipo').value;
  const inputDesc = porId('ocorrencia-descricao');
  const descricao = inputDesc.value.trim();
  if (!exemplarId || !tipo || !descricao) return;
  await executarAcao('Ocorrência (' + tipo + ') registrada com sucesso para o exemplar #' + exemplarId + '.', async () => {
    await chamarApi('/ocorrencias', {
      method: 'POST',
      ator: 'gestor',
      body: { exemplarId, tipo, descricao },
    });
    inputDesc.value = '';
  });
});

porId('form-feriado')?.addEventListener('submit', async evento => {
  evento.preventDefault();
  const unidadeId = Number(porId('feriado-unidade-id').value);
  const inputData = porId('feriado-data');
  const data = inputData.value;
  if (!unidadeId || !data) return;
  await executarAcao('Feriado ' + data + ' cadastrado na unidade ' + (nomesUnidades[unidadeId] || unidadeId) + '.', async () => {
    await chamarApi('/unidades/' + unidadeId + '/feriados', {
      method: 'POST',
      ator: 'bibliotecario',
      body: { data },
    });
    inputData.value = '';
  });
});

// ==================== NAVEGAÇÃO POR ABAS ====================

document.querySelectorAll('nav a[data-aba]').forEach(link => {
  link.addEventListener('click', evento => {
    evento.preventDefault();
    const aba = link.dataset.aba;
    document.querySelectorAll('nav a[data-aba]').forEach(a => a.removeAttribute('aria-current'));
    link.setAttribute('aria-current', 'page');
    document.querySelectorAll('.bloco-painel').forEach(painel => {
      painel.hidden = aba !== 'todas' && painel.dataset.painel !== aba;
    });
  });
});

busca.addEventListener('input', mostrarLivros);
filtro.addEventListener('change', mostrarLivros);
tentar.addEventListener('click', carregar);
carregar();