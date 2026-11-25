const { abrirBanco, transacao } = require('./index');
const { hashToken } = require('../token');

const PESSOAS_PADRAO = [
  ['Ana', 'leitor', 'a'.repeat(64)],
  ['Beto', 'leitor', 'b'.repeat(64)],
  ['Cris', 'bibliotecario', 'c'.repeat(64)],
  ['Dani', 'gestor', 'd'.repeat(64)],
];

function carregarDemo(db) {
  return transacao(db, () => {
    const tabelas = ['usuarios', 'unidades', 'livros'];
    if (tabelas.some(t => db.prepare('SELECT 1 FROM ' + t + ' LIMIT 1').get())) {
      throw new Error('A demonstração exige um banco vazio. Os dados existentes foram preservados.');
    }
    db.exec(`
      INSERT INTO unidades(id, nome) VALUES (1, 'Central'), (2, 'Bairro');
      INSERT INTO feriados(unidadeId, data) VALUES (1, '2026-12-25'), (2, '2026-12-25');
      INSERT INTO livros(id, titulo, autor) VALUES
        (1, 'Dom Casmurro', 'Machado de Assis'), (2, 'Úrsula', 'Maria Firmina dos Reis');
      INSERT INTO exemplares(id, livroId, unidadeOrigemId, unidadeAtualId) VALUES
        (1,1,1,1), (2,1,2,2), (3,2,1,1);
    `);
    const inserir = db.prepare('INSERT INTO usuarios(nome, perfil, tokenHash) VALUES (?, ?, ?)');
    return PESSOAS_PADRAO.map(([nome, perfil, token]) => {
      const id = Number(inserir.run(nome, perfil, hashToken(token)).lastInsertRowid);
      return { id, nome, perfil, token };
    });
  });
}

function garantirDadosIniciais(db) {
  return transacao(db, () => {
    const temUnidades = db.prepare('SELECT 1 FROM unidades LIMIT 1').get();
    const temUsuarios = db.prepare('SELECT 1 FROM usuarios LIMIT 1').get();
    const temLivros = db.prepare('SELECT 1 FROM livros LIMIT 1').get();
    if (!temUnidades) {
      db.exec(`
        INSERT INTO unidades(id, nome) VALUES (1, 'Central'), (2, 'Bairro') ON CONFLICT DO NOTHING;
        INSERT INTO feriados(unidadeId, data) VALUES (1, '2026-12-25'), (2, '2026-12-25') ON CONFLICT DO NOTHING;
      `);
    }
    if (!temUsuarios) {
      const inserir = db.prepare('INSERT INTO usuarios(id, nome, perfil, tokenHash) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING');
      PESSOAS_PADRAO.forEach(([nome, perfil, token], idx) => {
        inserir.run(idx + 1, nome, perfil, hashToken(token));
      });
    }
    if (!temLivros) {
      db.exec(`
        INSERT INTO livros(id, titulo, autor) VALUES
          (1, 'Dom Casmurro', 'Machado de Assis'), (2, 'Úrsula', 'Maria Firmina dos Reis') ON CONFLICT DO NOTHING;
        INSERT INTO exemplares(id, livroId, unidadeOrigemId, unidadeAtualId) VALUES
          (1,1,1,1), (2,1,2,2), (3,2,1,1) ON CONFLICT DO NOTHING;
      `);
    }
    return PESSOAS_PADRAO.map(([nome, perfil, token], idx) => ({ id: idx + 1, nome, perfil, token }));
  });
}

if (require.main === module) {
  const db = abrirBanco();
  try {
    console.log('Credenciais locais de demonstração:');
    console.log(JSON.stringify(garantirDadosIniciais(db), null, 2));
  } catch (erro) {
    console.error(erro.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

module.exports = { carregarDemo, garantirDadosIniciais };
