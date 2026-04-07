# TODO — 003-progression

## Feito

- [x] `my-buddy xp` — dashboard de progressão (FR-01, FR-02, FR-03)

### Batch 2 — Sistema de 30 níveis

- [x] Refatorar `levels.ts`: 30 níveis, 6 tiers, títulos por tier
- [x] Atualizar `levelFromXP()` e `xpProgress()` para 30 entradas
- [x] Curva de XP provisória (calibrar depois): ~1 dia pro lv.2, ~1 semana pro lv.5, ~1 mês pro lv.10
- [x] Atualizar `state.ts` — parse continua funcionando (retrocompat)
- [x] Atualizar testes existentes que dependem dos 6 níveis antigos
- [x] `tests/batch5.test.ts` — testes do novo sistema de níveis

### Batch 3 — Cores de personalidade (WUBRG)

- [x] Adicionar `colors: { W, U, B, R, G }` e `colorPoints` em `AppState` + `types.ts`
- [x] `src/xp/colors.ts` — definições, validação, distribuição de pontos
- [x] `src/commands/colors.ts` — `my-buddy colors` (view) e `my-buddy colors W+3 U-1` (distribute)
- [x] Registrar `colors` no `cli.ts`
- [x] Atualizar `state.ts` — parse colors/colorPoints com defaults (0/0)
- [x] Atualizar `sync.ts` — ao detectar level up, adicionar 1 ou 3 pontos
- [x] Atualizar `xp.ts` — seção de personalidade no dashboard
- [x] `tests/batch5.test.ts` — adicionar testes de cores

### Batch 4 — Badges

- [x] `src/xp/badges.ts` — 8 badge definitions + `evaluateBadges()`
- [x] Adicionar `badges: string[]` em `AppState` + `types.ts`
- [x] Atualizar `sync.ts` — avaliar badges ao final, imprimir desbloqueios
- [x] Atualizar `xp.ts` — seção de badges no dashboard
- [x] Atualizar `state.ts` — parse badges com default []
- [x] `tests/batch6.test.ts` — testes de badges

### Batch 5 — Voz expandida

- [x] Adicionar chaves `level_up`, `badge_unlocked`, `streak_milestone`, `idle_return` em `Voice.reactions`
- [x] Atualizar `voice.ts` — prioridade de frases de progressão
- [x] Salvar pending phrase em `AppState` durante sync
- [x] Limpar phrase após renderizada na statusLine
- [x] Atualizar template de `my-buddy new`
- [x] `tests/batch7.test.ts` — testes de voz + integração

## Ordem de execução

1. ~~Batch 2 (níveis) — base pra tudo~~ ✓
2. ~~Batch 3 (cores) — depende dos níveis pra calcular pontos~~ ✓
3. ~~Batch 4 (badges) — depende de níveis e cores~~ ✓
4. ~~Batch 5 (voz) — depende de tudo acima~~ ✓
