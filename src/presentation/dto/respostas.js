const id = { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER };
const texto = { type: 'string' };
const data = { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const opcional = schema => ({ anyOf: [schema, { type: 'null' }] });
const lista = items => ({ type: 'array', items });
const objeto = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

const unidade = objeto({ id, nome: texto });
const exemplar = objeto({ id, situacao: texto, unidadeOrigemId: id, unidade });
const livro = objeto({ id, titulo: texto, autor: texto, exemplares: lista(exemplar) });
const exemplarComLivro = objeto({ ...exemplar.properties, livroId: id });
const reserva = objeto({ id, livroId: id, leitorId: id, criadaEm: data, situacao: texto,
  exemplarId: opcional(id), retirarAte: opcional(data), posicao: opcional(id) });
const renovacao = objeto({ data, prazoAnterior: data, novoPrazo: data });
const emprestimo = objeto({ id, leitorId: id, exemplarId: id, unidadeEmprestimoId: id, dataEmprestimo: data,
  prazoDevolucao: data, dataDevolucao: opcional(data), unidadeDevolucaoId: opcional(id), renovacoes: lista(renovacao) });
const tipo = { type: 'string', enum: ['avaria', 'extravio'] };
const descricao = { type: 'string', pattern: '\\S', maxLength: 2000 };
const ocorrencia = objeto({ id, exemplarId: id, gestorId: id, tipo, descricao, data });
const erro = objeto({ erro: objeto({ codigo: texto, mensagem: texto }) });

const transferenciaRecebida = objeto({ exemplarId: id, unidadeId: id });
const feriado = objeto({ unidadeId: id, data });

module.exports = {
  id, lista, unidade, livro, reserva, emprestimo, ocorrencia, transferenciaRecebida, feriado, erro,
  exemplarComLivro,
};
