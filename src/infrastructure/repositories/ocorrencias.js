const { Ocorrencia } = require('../../domain/entities/circulacao.entity');

function listar(db) {
  return db.prepare('SELECT * FROM ocorrencias ORDER BY id DESC').all().map(linha => new Ocorrencia(linha));
}

function buscar(db, id) {
  const linha = db.prepare('SELECT * FROM ocorrencias WHERE id = ?').get(id);
  return linha && new Ocorrencia(linha);
}

function inserir(db, exemplarId, gestorId, tipo, descricao, data) {
  return db.prepare(`INSERT INTO ocorrencias
    (exemplarId, gestorId, tipo, descricao, data) VALUES (?, ?, ?, ?, ?)`)
    .run(exemplarId, gestorId, tipo, descricao, data).lastInsertRowid;
}

module.exports = { listar, buscar, inserir };
