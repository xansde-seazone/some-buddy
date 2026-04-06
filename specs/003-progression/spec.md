# 003-progression — Progressão completa: dashboard, atributos, badges e voz

## Resumo

Transforma o sistema de XP bruto da 002 em um sistema de progressão completo com dashboard de acompanhamento, 4 atributos derivados de uso, badges de conquista e mensagens contextuais do buddy reagindo à evolução do usuário.

## Motivação

O 002 implementou XP, nível e streak, mas o usuário só vê o resultado na statusLine (barra + nível). Não há detalhamento, não há conquistas, e o buddy não reage à progressão. Isso deixa o sistema de XP invisível e pouco motivador.

---

## 1. Dashboard de XP (`my-buddy xp`)

Comando dedicado para inspeção detalhada da progressão.

### Saída esperada

```
╭─ Moja ─────────────────────────────────╮
│ Lv.3 Expert          1.240 / 2.000 XP  │
│ [██████░░░░░░░░░░░░░░] 62%             │
│                                         │
│ Streak: 5 dias úteis 🔥                 │
│ Última sessão: 2026-04-06              │
│ Último sync: 2026-04-06 18:42          │
│                                         │
│ ── Atributos ──                         │
│ Focus        ████░░░░  48              │
│ Velocity     ██████░░  73              │
│ Efficiency   ███░░░░░  35              │
│ Consistency  █████░░░  62              │
│                                         │
│ ── Badges (3/8) ──                      │
│ ✓ First Sync    ✓ Week Streak          │
│ ✓ Cache Master                          │
╰─────────────────────────────────────────╯
```

### Requisitos funcionais

- **FR-01**: `my-buddy xp` exibe nível, XP atual/próximo, barra de progresso com percentual
- **FR-02**: Exibe streak atual e data da última sessão/sync
- **FR-03**: Exibe breakdown de XP por fonte: sessões, streak, eventos
- **FR-04**: Exibe os 4 atributos com barra e valor numérico
- **FR-05**: Exibe badges desbloqueados vs total disponível

---

## 2. Atributos

4 atributos derivados automaticamente das métricas de uso. Não são alocados manualmente — são calculados no `runSync` a partir dos dados das sessões.

### Definição

| Atributo      | Métrica fonte                              | Fórmula                                           |
|---------------|--------------------------------------------|----------------------------------------------------|
| `focus`       | Duração média das sessões (nº de calls)    | `min(100, avg_calls_per_session * 2)`              |
| `velocity`    | Output tokens totais por sessão            | `min(100, avg_output_tokens / 100)`                |
| `efficiency`  | Cache hit rate médio                       | `min(100, avg_cache_hit_rate * 100)`               |
| `consistency` | Streak atual                               | `min(100, streak * 3)`                             |

Todos os atributos são inteiros 0–100.

### Requisitos funcionais

- **FR-06**: Atributos são recalculados a cada `runSync` a partir do histórico completo de sessões processadas
- **FR-07**: `attributes: { focus, velocity, efficiency, consistency }` persistido em `XPState`
- **FR-08**: Atributos são exibidos no `my-buddy xp` com barra proporcional
- **FR-09**: Atributos NÃO aparecem na statusLine (muita informação — só no dashboard)
- **FR-10**: Se nunca houve sync, todos os atributos são 0

---

## 3. Badges

Conquistas únicas (unlock uma vez, nunca revogadas). Avaliadas ao final de cada `runSync`.

### Lista inicial (8 badges)

| ID               | Nome            | Condição                              |
|------------------|-----------------|---------------------------------------|
| `first_sync`     | First Sync      | Completar o primeiro sync             |
| `week_streak`    | Week Streak     | Streak ≥ 5                            |
| `month_streak`   | Month Streak    | Streak ≥ 20                           |
| `cache_master`   | Cache Master    | Atributo efficiency ≥ 80              |
| `speed_demon`    | Speed Demon     | Atributo velocity ≥ 80               |
| `deep_focus`     | Deep Focus      | Atributo focus ≥ 80                  |
| `level_3`        | Expert          | Atingir nível 3                       |
| `level_5`        | Veteran         | Atingir nível 5                       |

### Requisitos funcionais

- **FR-11**: Badges persistidos em `AppState.badges: string[]` (IDs dos desbloqueados)
- **FR-12**: Motor de avaliação roda ao final de `runSync`, checando cada badge não desbloqueado
- **FR-13**: Quando um badge é desbloqueado, imprime `🏆 Badge desbloqueado: <nome>!` no stdout do `sync`
- **FR-14**: Badges exibidos no `my-buddy xp` com checkmark
- **FR-15**: Badge nunca é revogado (mesmo se condição deixar de ser verdadeira)

---

## 4. Voz expandida — reações à progressão

Novas chaves de reação em `Voice.reactions` para o buddy comentar eventos de progressão.

### Novas chaves

| Chave              | Gatilho                                 |
|--------------------|-----------------------------------------|
| `level_up`         | Nível subiu durante o sync              |
| `badge_unlocked`   | Badge desbloqueado durante o sync       |
| `streak_milestone` | Streak atingiu 3, 7, 14, 30            |
| `idle_return`      | Primeira sessão após ≥3 dias sem atividade |

### Requisitos funcionais

- **FR-16**: Novas chaves adicionadas a `Voice.reactions` em `types.ts`
- **FR-17**: Quando um evento de progressão ocorre no sync, a frase de reação é salva em `AppState` para ser exibida na próxima renderização da statusLine
- **FR-18**: A frase de progressão tem prioridade sobre idle phrases e time-of-day (mas perde para context changes)
- **FR-19**: A frase de progressão é exibida apenas uma vez (limpa após renderizada)
- **FR-20**: Buddies existentes sem as novas chaves continuam funcionando (retrocompatível — pool vazio = sem reação)
- **FR-21**: O template padrão de `my-buddy new` inclui exemplos das novas chaves de reação

---

## 5. Integração: sync dispara avaliação completa

### Fluxo atualizado do `runSync`

```
discover JSONL → parse incremental → calculate session XP
  → calculate streak → calculate attributes → evaluate badges
  → detect progression events → save state + pending phrase
```

### Requisitos funcionais

- **FR-22**: `runSync` retorna também `attributesChanged`, `newBadges`, e `progressionEvents`
- **FR-23**: `calculateAttributes` recebe o array de `SessionXP[]` e o streak para derivar os 4 atributos
- **FR-24**: `evaluateBadges` recebe o estado completo (XP, level, attributes, streak, badges existentes) e retorna novos badges

---

## Estrutura de arquivos (novos/alterados)

```
src/
  xp/
    attributes.ts       ← NEW: calculateAttributes
    badges.ts           ← NEW: badge definitions + evaluateBadges
    calculator.ts       ← ALTERED: runSync retorna atributos, badges, eventos
  commands/
    xp.ts               ← NEW: my-buddy xp (dashboard)
    sync.ts             ← ALTERED: imprime badges e eventos
  render/
    voice.ts            ← ALTERED: nova prioridade para pending progression phrase
  types.ts              ← ALTERED: Attributes, badges em AppState, novas chaves em Voice.reactions
tests/
  batch4.test.ts        ← NEW: attributes
  batch5.test.ts        ← NEW: badges
  batch6.test.ts        ← NEW: xp dashboard + voice progression
```

---

## Fora do escopo

- Atributos manuais (alocáveis pelo usuário)
- Atributos na statusLine
- Badges repetíveis / sazonais
- Geração assistida de frases via IA
- Gamificação externa (leaderboard, compartilhamento)

---

## Critérios de sucesso

- **SC-01**: `my-buddy xp` renderiza dashboard completo com nível, streak, atributos e badges
- **SC-02**: Atributos são calculados corretamente a partir de sessões reais
- **SC-03**: Badges são persistidos e nunca revogados
- **SC-04**: Buddy exibe frase de progressão na statusLine ao subir de nível / ganhar badge
- **SC-05**: 100% retrocompatível — buddies/states existentes carregam sem erro
- **SC-06**: Cobertura de testes ≥ 95% nos módulos novos
