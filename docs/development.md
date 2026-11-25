# Guia de desenvolvimento

Este guia complementa [a visão de arquitetura](architecture.md) com as operações do dia a dia e os pontos de atenção ao alterar o sistema.

## Preparar o ambiente

1. Instale Node.js 24.15 ou superior na série 24.
2. Na raiz do projeto, instale as versões registradas no lockfile:

   ```powershell
   npm ci
   ```

3. Inicie o servidor:

   ```powershell
   npm run start:dev
   ```

4. Acesse `http://127.0.0.1:3000/docs` para consultar e executar as rotas.

O banco padrão fica em `data/biblioteca.sqlite`. É possível apontar para outro arquivo usando `DB_PATH`. Os valores `HOST` e `PORT` alteram endereço e porta do servidor.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run start:dev` | Desenvolvimento com recompilação durante alterações |
| `npm run build` | Verificar e compilar a aplicação |
| `npm start` | Executar a aplicação já compilada |
| `npm test` | Compilar e executar testes; `pretest` chama o build |
| `npm run demo` | Preparar dados e mostrar tokens de demonstração; requer banco vazio |

`npm run demo` grava no banco indicado por `DB_PATH` ou no banco padrão. Use apenas em ambiente local. A demonstração recusa bancos que já tenham dados de usuários, unidades ou livros.

## Como adicionar ou alterar comportamento

1. **Defina o comportamento esperado.** Identifique o perfil envolvido, os estados válidos e o que deve acontecer em conflito.
2. **Implemente a regra no serviço de aplicação.** Mantenha controllers finos e sem SQL.
3. **Acesse o banco pelo repositório correspondente.** Use parâmetros preparados; não concatene valores de entrada em SQL.
4. **Atualize o esquema somente se necessário.** Preserve chaves estrangeiras, `CHECK`s e índices de unicidade em `src/infrastructure/database/schema.sql`.
5. **Valide a entrada na fronteira HTTP.** Atualize o DTO e mantenha `ValidationPipe` restritivo (`whitelist` e `forbidNonWhitelisted`).
6. **Atualize o contrato da rota.** Descreva os códigos e esquemas de resposta do Swagger no controller.
7. **Adicione um teste de integração.** Cubra o caso válido, a violação de regra e permissões relevantes em `test/biblioteca.test.js`.
8. **Execute `npm test`** antes de concluir.

Operações que alteram mais de um registro ou dependem de uma leitura consistente devem usar `transacao` para garantir atomicidade. Restrinja o escopo da transação ao necessário e deixe erros explícitos para que a transação seja revertida.

## Testes

Os testes executam a API real em uma porta local temporária e criam um banco SQLite `:memory:` para cada caso. A função `ambiente` em `test/biblioteca.test.js` centraliza inicialização, chamadas HTTP, credenciais e limpeza do servidor/banco.

Ao acrescentar cobertura:

- verifique o status HTTP e os campos importantes da resposta;
- teste permissões com mais de um perfil quando a rota for protegida;
- cubra conflito e validação inválida, não apenas o caminho feliz;
- use a data controlada pelo helper do teste para prazos, feriados e expirações;
- evite depender do arquivo `data/biblioteca.sqlite`.

## Convenções de manutenção

- Preserve nomes de recursos no plural nas rotas (`/livros`, `/reservas`).
- Use `GET` para leitura, `POST` para criação, `PUT` para substituição e `PATCH` para transições parciais de estado.
- Coloque validação de payload nos DTOs e validação de IDs/formatos compartilhados nos pipes existentes.
- Use erros do domínio (`conflito`, `naoEncontrado`, `invalido`) em vez de respostas de erro improvisadas.
- Mantenha o esquema, os serviços e os testes sincronizados quando uma regra alterar os dados persistidos.
- Não registre tokens, dados pessoais ou conteúdo sensível em logs ou na documentação.

## Limites atuais

- O repositório ainda não tem migrations versionadas: o esquema é aplicado a partir de `schema.sql` ao abrir o banco. Alterações incompatíveis exigem estratégia explícita de migração antes de preservar bancos existentes.
- Parte da infraestrutura está em JavaScript/CommonJS e parte em TypeScript. Mantenha os imports e formatos existentes; uma conversão deve ser feita em etapas pequenas, com build e testes após cada etapa.
- O mecanismo de identidade é voltado à demonstração local. Consulte [a seção de segurança da arquitetura](architecture.md#seguranca-e-limites-conhecidos) antes de expor a aplicação fora de um ambiente local.
