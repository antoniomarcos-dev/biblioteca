const { Feriado } = require('../../domain/entities/catalogo.entity');

function listarFeriados(db) {
  return db.prepare('SELECT unidadeId, data FROM feriados ORDER BY data, unidadeId')
    .all().map(linha => new Feriado(linha));
}

function listarFeriadosApos(db, unidadeId, data) {
  return db.prepare('SELECT unidadeId, data FROM feriados WHERE unidadeId = ? AND data > ?')
    .all(unidadeId, data).map(linha => new Feriado(linha));
}

function inserirFeriado(db, unidadeId, data) {
  const { changes } = db.prepare('INSERT INTO feriados(unidadeId, data) VALUES (?, ?) ON CONFLICT DO NOTHING')
    .run(unidadeId, data);
  return changes ? new Feriado({ unidadeId, data }) : null;
}

module.exports = { listarFeriados, listarFeriadosApos, inserirFeriado };
