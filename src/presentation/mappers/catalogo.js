function paraExemplar({ exemplar, unidade, reservado }) {
  return {
    id: exemplar.id,
    situacao: reservado ? 'reservado' : exemplar.situacao,
    unidadeOrigemId: exemplar.unidadeOrigemId,
    unidade: { id: unidade.id, nome: unidade.nome },
  };
}

function paraExemplarComLivro(registro) {
  return { ...paraExemplar(registro), livroId: registro.livro.id };
}

function paraCatalogo(registros) {
  const livros = new Map();
  for (const registro of registros) {
    const { livro, exemplar } = registro;
    if (!livros.has(livro.id)) livros.set(livro.id, { ...livro, exemplares: [] });
    if (!exemplar) continue;
    livros.get(livro.id).exemplares.push(paraExemplar(registro));
  }
  return [...livros.values()];
}

module.exports = { paraCatalogo, paraExemplarComLivro };
