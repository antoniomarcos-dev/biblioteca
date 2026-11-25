# Biblioteca

API REST e catálogo web para administrar livros, exemplares, reservas e empréstimos em uma biblioteca com mais de uma unidade. O projeto usa NestJS, TypeScript/JavaScript e SQLite.

## Comece por aqui

### Requisitos

- Node.js 24.15 ou superior na série 24
- npm

### Instalar e iniciar

```powershell
npm ci
npm run start:dev
```

O servidor inicia em `http://127.0.0.1:3000`. A página inicial abre o catálogo; a documentação interativa fica em `/docs` e o contrato OpenAPI em `/openapi.json`.

| Comando | O que faz |
| --- | --- |
| `npm run start:dev` | Inicia a API em modo de desenvolvimento |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Inicia a aplicação compilada |
| `npm test` | Compila e executa os testes de integração |
| `npm run demo` | Inicializa os dados de demonstração em um banco vazio e exibe credenciais locais |

Configurações disponíveis:

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Interface de rede onde o servidor escuta |
| `PORT` | `3000` | Porta HTTP |
| `DB_PATH` | `data/biblioteca.sqlite` | Caminho do arquivo SQLite |

O diretório `data/`, dependências e arquivos compilados não são versionados. Os testes usam bancos SQLite em memória.

> **Atenção:** a seleção automática de perfil e os identificadores de demonstração servem para desenvolvimento local. A aplicação atual não configura um provedor de identidade para produção. Não exponha o servidor sem definir e validar um mecanismo de autenticação apropriado.

## Como o repositório está organizado

```text
.
├── docs/                 Arquitetura, domínio e guia para contribuir
├── public/               Interface estática do catálogo
├── scripts/              Inicialização da aplicação compilada
├── src/
│   ├── application/      Casos de uso e regras de negócio
│   ├── domain/           Entidades e erros do domínio
│   ├── infrastructure/   SQLite, repositórios e tokens
│   ├── presentation/     Controllers, DTOs, HTTP e formato das respostas
│   ├── app.module.ts     Registro das dependências NestJS
│   ├── app.ts            Configuração HTTP, validação, Swagger e arquivos estáticos
│   └── main.ts           Inicialização do banco e do servidor
└── test/                 Testes de integração da API
```

Para entender a responsabilidade de cada camada e o fluxo de uma requisição, consulte [docs/architecture.md](docs/architecture.md). Para executar testes, adicionar uma rota ou alterar o banco, consulte [docs/development.md](docs/development.md).

## Experimente a API

1. Abra `http://127.0.0.1:3000/docs`.
2. Consulte `GET /livros` para ver o catálogo.
3. Use `POST /reservas` para reservar um título.
4. Use `POST /emprestimos` como bibliotecário para registrar um empréstimo.
5. Consulte a documentação OpenAPI para os demais recursos, perfis permitidos e formatos dos dados.

O sistema inclui dados locais de demonstração e perfis de leitor, bibliotecário e gestor. Os fluxos de reserva, circulação, transferência e ocorrências estão descritos em [docs/architecture.md](docs/architecture.md).
