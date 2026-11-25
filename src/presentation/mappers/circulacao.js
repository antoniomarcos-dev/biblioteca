function paraReserva({ reserva, posicao }) {
  return { ...reserva, posicao };
}

function paraEmprestimo(emprestimo, historico) {
  const renovacoes = historico.map(({ data, prazoAnterior, novoPrazo }) => ({ data, prazoAnterior, novoPrazo }));
  return { ...emprestimo, renovacoes };
}

module.exports = { paraReserva, paraEmprestimo };
