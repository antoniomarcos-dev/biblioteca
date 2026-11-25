const { Livro, Exemplar, Unidade } = require('../../domain/entities/catalogo.entity');

/** @param {import('node:sqlite').DatabaseSync} db
 * @param {number | null} livroId
 * @param {number | null} exemplarId */
function consultarCatalogo(db, livroId = null, exemplarId = null) {
  const linhas = db.prepare(`
    SELECT l.id, l.titulo, l.autor, e.id AS exemplarId, e.unidadeOrigemId, e.unidadeAtualId,
           e.situacao, u.nome AS unidade, r.id AS reservaId
    FROM livros l
    LEFT JOIN exemplares e ON e.livroId = l.id
    LEFT JOIN unidades u ON u.id = e.unidadeAtualId
    LEFT JOIN reservas r ON r.exemplarId = e.id AND r.situacao = 'liberada'
    WHERE (? IS NULL OR l.id = ?)
      AND (? IS NULL OR e.id = ?)
    ORDER BY l.titulo, l.id, e.id
  `).all(livroId, livroId, exemplarId, exemplarId);
  return linhas.map(linha => ({
    livro: new Livro(linha),
    exemplar: linha.exemplarId === null ? null : new Exemplar({ ...linha, id: linha.exemplarId, livroId: linha.id }),
    unidade: linha.unidadeAtualId === null ? null : new Unidade({ id: linha.unidadeAtualId, nome: linha.unidade }),
    reservado: linha.reservaId !== null,
  }));
}

function existeLivro(db, id) {
  return Boolean(db.prepare('SELECT id FROM livros WHERE id = ?').get(id));
}

function buscarExemplar(db, id) {
  const linha = db.prepare('SELECT * FROM exemplares WHERE id = ?').get(id);
  return linha && new Exemplar(linha);
}

function primeiroDisponivel(db, livroId) {
  const linha = db.prepare(`SELECT * FROM exemplares
    WHERE livroId = ? AND situacao = 'disponivel' ORDER BY id LIMIT 1`).get(livroId);
  return linha && new Exemplar(linha);
}

function buscarUnidade(db, id) {
  const linha = db.prepare('SELECT id, nome FROM unidades WHERE id = ?').get(id);
  return linha && new Unidade(linha);
}

function listarUnidades(db) {
  return db.prepare('SELECT id, nome FROM unidades ORDER BY id').all().map(linha => new Unidade(linha));
}

function atualizarExemplar(db, id, situacao, unidadeAtualId) {
  db.prepare('UPDATE exemplares SET situacao = ?, unidadeAtualId = ? WHERE id = ?')
    .run(situacao, unidadeAtualId, id);
}

function inserirLivro(db, titulo, autor) {
  return db.prepare('INSERT INTO livros(titulo, autor) VALUES (?, ?)').run(titulo, autor).lastInsertRowid;
}

function editarLivro(db, id, titulo, autor) {
  return db.prepare('UPDATE livros SET titulo = ?, autor = ? WHERE id = ?').run(titulo, autor, id).changes;
}

function livroPossuiVinculos(db, id) {
  return db.prepare(`SELECT EXISTS(SELECT 1 FROM exemplares WHERE livroId = ?)
    OR EXISTS(SELECT 1 FROM reservas WHERE livroId = ?) AS possui`).get(id, id).possui;
}

function excluirLivro(db, id) {
  return db.prepare('DELETE FROM livros WHERE id = ?').run(id).changes;
}

function inserirExemplar(db, livroId, unidadeId) {
  return db.prepare('INSERT INTO exemplares(livroId, unidadeOrigemId, unidadeAtualId) VALUES (?, ?, ?)')
    .run(livroId, unidadeId, unidadeId).lastInsertRowid;
}

function editarCadastroExemplar(db, id, livroId, unidadeId) {
  db.prepare('UPDATE exemplares SET livroId = ?, unidadeOrigemId = ?, unidadeAtualId = ? WHERE id = ?')
    .run(livroId, unidadeId, unidadeId, id);
}

function exemplarPossuiHistorico(db, id) {
  return db.prepare(`SELECT EXISTS(SELECT 1 FROM reservas WHERE exemplarId = ?)
    OR EXISTS(SELECT 1 FROM emprestimos WHERE exemplarId = ?)
    OR EXISTS(SELECT 1 FROM ocorrencias WHERE exemplarId = ?) AS possui`).get(id, id, id).possui;
}

function excluirExemplar(db, id) {
  db.prepare('DELETE FROM exemplares WHERE id = ?').run(id);
}

module.exports = {
  consultarCatalogo, existeLivro, buscarExemplar, primeiroDisponivel, buscarUnidade, listarUnidades, atualizarExemplar,
  inserirLivro, editarLivro, livroPossuiVinculos, excluirLivro,
  inserirExemplar, editarCadastroExemplar, exemplarPossuiHistorico, excluirExemplar,
};
