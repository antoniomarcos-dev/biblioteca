CREATE TABLE IF NOT EXISTS unidades (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS feriados (
  unidadeId INTEGER NOT NULL REFERENCES unidades(id),
  data TEXT NOT NULL,
  PRIMARY KEY (unidadeId, data)
);
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('leitor', 'bibliotecario', 'gestor')),
  tokenHash TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS livros (
  id INTEGER PRIMARY KEY,
  titulo TEXT NOT NULL,
  autor TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS exemplares (
  id INTEGER PRIMARY KEY,
  livroId INTEGER NOT NULL REFERENCES livros(id),
  unidadeOrigemId INTEGER NOT NULL REFERENCES unidades(id),
  unidadeAtualId INTEGER NOT NULL REFERENCES unidades(id),
  situacao TEXT NOT NULL DEFAULT 'disponivel' CHECK (situacao IN
    ('disponivel','emprestado','em_transferencia','indisponivel'))
);
CREATE TABLE IF NOT EXISTS emprestimos (
  id INTEGER PRIMARY KEY,
  leitorId INTEGER NOT NULL REFERENCES usuarios(id),
  exemplarId INTEGER NOT NULL REFERENCES exemplares(id),
  unidadeEmprestimoId INTEGER NOT NULL REFERENCES unidades(id),
  dataEmprestimo TEXT NOT NULL,
  prazoDevolucao TEXT NOT NULL,
  dataDevolucao TEXT,
  unidadeDevolucaoId INTEGER REFERENCES unidades(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS emprestimo_aberto ON emprestimos(exemplarId) WHERE dataDevolucao IS NULL;
CREATE TABLE IF NOT EXISTS renovacoes (
  id INTEGER PRIMARY KEY,
  emprestimoId INTEGER NOT NULL REFERENCES emprestimos(id),
  data TEXT NOT NULL,
  prazoAnterior TEXT NOT NULL,
  novoPrazo TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reservas (
  id INTEGER PRIMARY KEY,
  livroId INTEGER NOT NULL REFERENCES livros(id),
  leitorId INTEGER NOT NULL REFERENCES usuarios(id),
  criadaEm TEXT NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'aguardando' CHECK (situacao IN
    ('aguardando','liberada','atendida','cancelada','expirada')),
  exemplarId INTEGER REFERENCES exemplares(id),
  retirarAte TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS reserva_ativa ON reservas(livroId, leitorId)
  WHERE situacao IN ('aguardando','liberada');
CREATE UNIQUE INDEX IF NOT EXISTS primeira_liberada ON reservas(livroId) WHERE situacao = 'liberada';
CREATE INDEX IF NOT EXISTS fila ON reservas(livroId, situacao, id);
CREATE TABLE IF NOT EXISTS ocorrencias (
  id INTEGER PRIMARY KEY,
  exemplarId INTEGER NOT NULL REFERENCES exemplares(id),
  gestorId INTEGER NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('avaria','extravio')),
  descricao TEXT NOT NULL,
  data TEXT NOT NULL
);
