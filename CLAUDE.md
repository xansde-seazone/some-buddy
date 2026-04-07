# my-buddy — Instruções do Projeto

## Branches e Changelog

Sempre que iniciar trabalho em uma nova branch de funcionalidade:

1. Criar a spec em `specs/<branch-name>/spec.md` antes de codar
2. Atualizar o `README.md` com uma entrada no Changelog referenciando a branch e a spec
3. Commitar spec + README juntos antes do primeiro commit de código

## Qualidade

- Antes de declarar uma feature completa, rodar `npm run test:coverage` e verificar ≥ 95% nos módulos novos
- `npm test` executa `npm run build` automaticamente via `pretest` — dist/ nunca fica stale
- Após editar arquivos em `src/`, rodar `npm run build` antes de testar via CLI (`my-buddy sync`, etc.)
