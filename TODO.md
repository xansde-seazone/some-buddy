# TODO — 003-progression

## Feito

- [x] `my-buddy xp` — dashboard de progressão (FR-01, FR-02, FR-03)

## Próximo

### Batch 2 — Sistema de 30 níveis

- [ ] Refatorar `levels.ts`: 30 níveis, 6 tiers, títulos por tier
- [ ] Atualizar `levelFromXP()` e `xpProgress()` para 30 entradas
- [ ] Curva de XP provisória (calibrar depois): ~1 dia pro lv.2, ~1 semana pro lv.5, ~1 mês pro lv.10
- [ ] Atualizar `state.ts` — parse continua funcionando (retrocompat)
- [ ] Atualizar testes existentes que dependem dos 6 níveis antigos
- [ ] `tests/batch5.test.ts` — testes do novo sistema de níveis

### Batch 3 — Cores de personalidade (WUBRG)

- [ ] Adicionar `colors: { W, U, B, R, G }` e `colorPoints` em `AppState` + `types.ts`
- [ ] `src/xp/colors.ts` — definições, validação, distribuição de pontos
- [ ] `src/commands/colors.ts` — `my-buddy colors` (view) e `my-buddy colors W+3 U-1` (distribute)
- [ ] Registrar `colors` no `cli.ts`
- [ ] Atualizar `state.ts` — parse colors/colorPoints com defaults (0/0)
- [ ] Atualizar `sync.ts` — ao detectar level up, adicionar 1 ou 3 pontos
- [ ] Atualizar `xp.ts` — seção de personalidade no dashboard
- [ ] `tests/batch5.test.ts` — adicionar testes de cores

### Batch 4 — Badges

- [ ] `src/xp/badges.ts` — 8 badge definitions + `evaluateBadges()`
- [ ] Adicionar `badges: string[]` em `AppState` + `types.ts`
- [ ] Atualizar `sync.ts` — avaliar badges ao final, imprimir desbloqueios
- [ ] Atualizar `xp.ts` — seção de badges no dashboard
- [ ] Atualizar `state.ts` — parse badges com default []
- [ ] `tests/batch6.test.ts` — testes de badges

### Batch 5 — Voz expandida

- [ ] Adicionar chaves `level_up`, `badge_unlocked`, `streak_milestone`, `idle_return` em `Voice.reactions`
- [ ] Atualizar `voice.ts` — prioridade de frases de progressão
- [ ] Salvar pending phrase em `AppState` durante sync
- [ ] Limpar phrase após renderizada na statusLine
- [ ] Atualizar template de `my-buddy new`
- [ ] `tests/batch7.test.ts` — testes de voz + integração

## Ordem de execução

1. Batch 2 (níveis) — base pra tudo
2. Batch 3 (cores) — depende dos níveis pra calcular pontos
3. Batch 4 (badges) — depende de níveis e cores
4. Batch 5 (voz) — depende de tudo acima
