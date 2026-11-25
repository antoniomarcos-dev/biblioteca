const { Usuario } = require('../../domain/entities/usuario.entity');

function buscarPorTokenHash(db, hash) {
  const linha = db.prepare('SELECT id, nome, perfil FROM usuarios WHERE tokenHash = ?').get(hash);
  return linha && new Usuario(linha);
}

function buscarPorIdentificador(db, valor) {
  if (!valor) return null;
  const termo = String(valor).trim();
  const linha = db.prepare(`
    SELECT id, nome, perfil FROM usuarios
    WHERE LOWER(nome) = LOWER(?) OR LOWER(perfil) = LOWER(?) OR CAST(id AS TEXT) = ?
    ORDER BY id LIMIT 1
  `).get(termo, termo, termo);
  return linha && new Usuario(linha);
}

function buscarPadraoParaPerfis(db, perfis, req) {
  if (perfis.includes('bibliotecario')) {
    return buscarPorIdentificador(db, 'bibliotecario');
  }
  if (perfis.includes('gestor')) {
    return buscarPorIdentificador(db, 'gestor');
  }
  if (perfis.includes('leitor')) {
    const idParam = Number(req?.params?.id);
    if (Number.isInteger(idParam) && idParam > 0) {
      const rota = String(req?.path || req?.url || '');
      if (rota.includes('/emprestimos/')) {
        const emp = db.prepare('SELECT leitorId FROM emprestimos WHERE id = ?').get(idParam);
        if (emp) return buscarPorIdentificador(db, emp.leitorId);
      }
      if (rota.includes('/reservas/')) {
        const res = db.prepare('SELECT leitorId FROM reservas WHERE id = ?').get(idParam);
        if (res) return buscarPorIdentificador(db, res.leitorId);
      }
    }
    return buscarPorIdentificador(db, 'leitor');
  }
  return null;
}

function existeLeitor(db, id) {
  return Boolean(db.prepare("SELECT id FROM usuarios WHERE id = ? AND perfil = 'leitor'").get(id));
}

module.exports = { buscarPorTokenHash, buscarPorIdentificador, buscarPadraoParaPerfis, existeLeitor };
