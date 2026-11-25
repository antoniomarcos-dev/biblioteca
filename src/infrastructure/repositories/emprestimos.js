const { Emprestimo, Renovacao } = require('../../domain/entities/circulacao.entity');

function listar(db, leitorId) {
  return db.prepare('SELECT * FROM emprestimos WHERE (? IS NULL OR leitorId = ?) ORDER BY id DESC')
    .all(leitorId, leitorId).map(linha => new Emprestimo(linha));
}

function buscar(db, id) {
  const linha = db.prepare('SELECT * FROM emprestimos WHERE id = ?').get(id);
  return linha && new Emprestimo(linha);
}

function historico(db, id) {
  return db.prepare('SELECT * FROM renovacoes WHERE emprestimoId = ? ORDER BY id')
    .all(id).map(linha => new Renovacao(linha));
}

function inserir(db, leitorId, exemplarId, unidadeId, data, prazo) {
  return db.prepare(`INSERT INTO emprestimos
    (leitorId, exemplarId, unidadeEmprestimoId, dataEmprestimo, prazoDevolucao) VALUES (?, ?, ?, ?, ?)`)
    .run(leitorId, exemplarId, unidadeId, data, prazo).lastInsertRowid;
}

function registrarDevolucao(db, id, unidadeId, data) {
  db.prepare('UPDATE emprestimos SET dataDevolucao = ?, unidadeDevolucaoId = ? WHERE id = ?')
    .run(data, unidadeId, id);
}

function registrarRenovacao(db, id, data, anterior, prazo) {
  db.prepare('UPDATE emprestimos SET prazoDevolucao = ? WHERE id = ?').run(prazo, id);
  db.prepare('INSERT INTO renovacoes(emprestimoId, data, prazoAnterior, novoPrazo) VALUES (?, ?, ?, ?)')
    .run(id, data, anterior, prazo);
}

module.exports = { listar, buscar, historico, inserir, registrarDevolucao, registrarRenovacao };
