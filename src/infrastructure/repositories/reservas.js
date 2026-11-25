const { Reserva } = require('../../domain/entities/circulacao.entity');

const consulta = `
  SELECT r.*,
    CASE WHEN r.situacao IN ('aguardando','liberada') THEN
      (SELECT COUNT(*) FROM reservas fila WHERE fila.livroId = r.livroId
       AND fila.situacao IN ('aguardando','liberada') AND fila.id <= r.id)
    END AS posicao
  FROM reservas r`;

function comPosicao(linha) {
  return { reserva: new Reserva(linha), posicao: linha.posicao };
}

function listar(db, leitorId, livroId) {
  return db.prepare(consulta + `
    WHERE (? IS NULL OR r.leitorId = ?) AND (? IS NULL OR r.livroId = ?) ORDER BY r.id
  `).all(leitorId, leitorId, livroId, livroId).map(comPosicao);
}

function buscar(db, id) {
  const linha = db.prepare(consulta + ' WHERE r.id = ?').get(id);
  return linha && comPosicao(linha);
}

function primeira(db, livroId) {
  const linha = db.prepare(`SELECT * FROM reservas WHERE livroId = ?
    AND situacao IN ('aguardando','liberada') ORDER BY id LIMIT 1`).get(livroId);
  return linha && new Reserva(linha);
}

function existeAtiva(db, leitorId, livroId) {
  return Boolean(db.prepare(`SELECT id FROM reservas WHERE leitorId = ? AND livroId = ?
    AND situacao IN ('aguardando','liberada')`).get(leitorId, livroId));
}

function inserir(db, leitorId, livroId, criadaEm) {
  return db.prepare('INSERT INTO reservas(leitorId, livroId, criadaEm) VALUES (?, ?, ?)')
    .run(leitorId, livroId, criadaEm).lastInsertRowid;
}

function liberar(db, id, exemplarId, prazo) {
  db.prepare("UPDATE reservas SET situacao = 'liberada', exemplarId = ?, retirarAte = ? WHERE id = ?")
    .run(exemplarId, prazo, id);
}

function atender(db, id, exemplarId) {
  db.prepare("UPDATE reservas SET situacao = 'atendida', exemplarId = ? WHERE id = ?").run(exemplarId, id);
}

function encerrar(db, id, situacao) {
  db.prepare('UPDATE reservas SET situacao = ? WHERE id = ?').run(situacao, id);
}

function desassociarExemplar(db, exemplarId) {
  db.prepare(`UPDATE reservas SET exemplarId = NULL, retirarAte = NULL, situacao = 'aguardando'
    WHERE exemplarId = ? AND situacao = 'liberada'`).run(exemplarId);
}

module.exports = { listar, buscar, primeira, existeAtiva, inserir, liberar, atender, encerrar, desassociarExemplar };
