class ErroApi extends Error {
  constructor(status, codigo, mensagem) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

const conflito = mensagem => new ErroApi(409, 'CONFLITO', mensagem);
const naoEncontrado = recurso => new ErroApi(404, 'NAO_ENCONTRADO', recurso + ' não encontrado.');
const invalido = mensagem => new ErroApi(400, 'DADOS_INVALIDOS', mensagem);

module.exports = { ErroApi, conflito, naoEncontrado, invalido };
