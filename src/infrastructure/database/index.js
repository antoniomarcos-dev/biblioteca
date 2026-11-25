const { DatabaseSync } = require('node:sqlite');
const { mkdirSync, readFileSync } = require('node:fs');
const path = require('node:path');

function abrirBanco(arquivo = process.env.DB_PATH || path.resolve(__dirname, '../../../data/biblioteca.sqlite')) {
  if (arquivo !== ':memory:') mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new DatabaseSync(arquivo);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
  db.exec(readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  return db;
}

// Os serviços são síncronos. A reserva da escrita precede a leitura da fila e do estoque.
function transacao(db, executar) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const resultado = executar();
    db.exec('COMMIT');
    return resultado;
  } catch (erro) {
    db.exec('ROLLBACK');
    throw erro;
  }
}

module.exports = { abrirBanco, transacao };
