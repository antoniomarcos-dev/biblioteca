const { listarFeriadosApos } = require('../../infrastructure/repositories/calendario');

const relogioLocal = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
});
const hojeLocal = () => relogioLocal.format(new Date());

function somarDiasUteis(db, inicio, quantidade, unidadeId) {
  const feriados = new Set(listarFeriadosApos(db, unidadeId, inicio).map(feriado => feriado.data));
  const dia = new Date(inicio + 'T12:00:00Z');
  let data = inicio;
  while (quantidade > 0) {
    dia.setUTCDate(dia.getUTCDate() + 1);
    data = dia.toISOString().slice(0, 10);
    if (![0, 6].includes(dia.getUTCDay()) && !feriados.has(data)) quantidade--;
  }
  return data;
}

module.exports = { somarDiasUteis, hojeLocal };
