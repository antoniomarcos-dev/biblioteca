# Biblioteca

API NestJS para cadastrar livros e exemplares, reservar títulos e controlar empréstimos. Você pode testar as operações diretamente no navegador.

## Iniciar

Use Node.js 24.15 ou mais recente da série 24. Na pasta do projeto, instale as dependências com `npm install`. O banco de dados inicial (`data/biblioteca.sqlite`) é preenchido automaticamente ao iniciar o servidor.

```sh
npm run start:dev
```

Abra [o catálogo da biblioteca](http://127.0.0.1:3000/) para buscar por título ou autor, cadastrar livros e gerenciar exemplares. Você também pode testar todas as rotas no Insomnia, Postman ou [Swagger](http://127.0.0.1:3000/docs) sem precisar configurar token Bearer (o servidor utiliza automaticamente o perfil adequado para cada rota em ambiente de desenvolvimento). Caso queira testar um perfil específico via `Authorization: Bearer <token>`, use o nome (`ana`, `beto`, `cris`, `dani`) ou os tokens fixos exibidos por `npm run demo`.

## Testar pelo navegador

1. No catálogo, clique em **API** para abrir o [Swagger](http://127.0.0.1:3000/docs). Em **Livro → GET /livros**, clique em **Execute** para consultar o catálogo em JSON.
2. Clique em **Authorize**, cole apenas o token de **Cris** (bibliotecário) e confirme. Feche a janela.
3. Em **POST /livros**, edite o título e o autor do exemplo e clique em **Execute**. O código **201** confirma o cadastro. Copie o `id` da resposta.
4. Em **Exemplar → POST /exemplares**, informe esse `livroId` e `unidadeOrigemId` igual a `1` (Central). Execute para criar uma cópia física.

| Operação | Livro | Exemplar |
| --- | --- | --- |
| Cadastrar | `POST /livros` | `POST /exemplares` |
| Listar | `GET /livros` | `GET /exemplares` |
| Consultar | `GET /livros/{id}` | `GET /exemplares/{id}` |
| Editar | `PUT /livros/{id}` | `PUT /exemplares/{id}` |
| Excluir | `DELETE /livros/{id}` | `DELETE /exemplares/{id}` |

Para experimentar uma reserva, troque a credencial em **Authorize** pelo token de **Ana** (leitor, ID 1) e execute `POST /reservas` com o ID do livro. Volte ao token de Cris e use `POST /emprestimos` com o ID de Ana e o ID do exemplar liberado. A resposta mostra o prazo de devolução em sete dias úteis. O token de **Dani** (gestor) permite registrar avarias e extravios em `POST /ocorrencias`.

## Estrutura

```text
src/
  main.ts                  inicia a API
  app.module.ts            registra controllers e serviços
  presentation/
    controllers/           rotas de livros, exemplares e circulação
    dto/                   campos e validações das requisições
    mappers/               formato das respostas
    http/                  permissões e tratamento de erros
  application/services/    regras de reserva, empréstimo e devolução
  domain/entities/         dados de livros, exemplares e usuários
  infrastructure/
    repositories/          consultas e gravações
    database/              conexão SQLite, tabelas e demonstração
```

Os dados ficam em `data/biblioteca.sqlite`. Para rodar os testes automatizados, use `npm test`. Eles usam bancos em memória. O contrato da API está disponível em [openapi.json](http://127.0.0.1:3000/openapi.json).
