# 003-progression — Progressão completa: dashboard, cores, badges e voz

## Resumo

Transforma o sistema de XP bruto da 002 em um sistema de progressão completo com 30 níveis, dashboard de acompanhamento, 5 cores de personalidade (WUBRG), badges de conquista e mensagens contextuais do buddy reagindo à evolução do usuário.

## Motivação

O 002 implementou XP, nível e streak, mas o usuário só vê o resultado na statusLine (barra + nível). Não há detalhamento, não há conquistas, e o buddy não reage à progressão. Isso deixa o sistema de XP invisível e pouco motivador.

---

## 1. Dashboard de XP (`my-buddy xp`) ✅

Comando dedicado para inspeção detalhada da progressão. **Já implementado.**

### Saída atual

```
┌─ Moja ───────────────────────────────────────┐
│                                              │
│ Lv.3 Craftsman        1.240 / 3.500 XP       │
│ [████████████░░░░░░░░] 62%                   │
│                                              │
│ Streak:         5 dias uteis                 │
│ Ultima sessao:  2026-04-06                   │
│ Ultimo sync:    2026-04-06 18:42             │
│                                              │
│ ── XP por fonte ──                           │
│ Sessoes:  980 XP                             │
│ Eventos:  260 XP                             │
│                                              │
│ ── Personalidade ──                          │
│ Ordem     ██████░░░░░░░░░░░░░░  6            │
│ Intelecto ████████████░░░░░░░░  12           │
│ Ambicao   ████░░░░░░░░░░░░░░░░  4            │
│ Impulso   ██████████░░░░░░░░░░  10           │
│ Instinto  ████████░░░░░░░░░░░░  8            │
│                          3 pts livres        │
│                                              │
│ ── Badges (3/8) ──                           │
│ ✓ First Sync    ✓ Week Streak               │
│ ✓ Cache Master                               │
│                                              │
└──────────────────────────────────────────────┘
```

### Requisitos funcionais

- **FR-01**: ✅ `my-buddy xp` exibe nível, XP atual/próximo, barra de progresso com percentual
- **FR-02**: ✅ Exibe streak atual e data da última sessão/sync
- **FR-03**: ✅ Exibe breakdown de XP por fonte: sessões vs eventos
- **FR-04**: ✅ Exibe as 5 cores com barra e valor numérico + pontos livres
- **FR-05**: ✅ Exibe badges desbloqueados vs total disponível

---

## 2. Sistema de Níveis (30 níveis, 6 tiers)

Substitui o sistema de 6 níveis da 002 por 30 níveis agrupados em 6 tiers de 5.

### Tiers e títulos

| Tier | Níveis | Título |
|------|--------|--------|
| 1 | 1–5 | Apprentice |
| 2 | 6–10 | Practitioner |
| 3 | 11–15 | Craftsman |
| 4 | 16–20 | Engineer |
| 5 | 21–25 | Architect |
| 6 | 26–30 | Maestro |

### Milestones

Níveis múltiplos de 5 (5, 10, 15, 20, 25, 30) são **milestones** — mudam o título do buddy.

### Curva de XP

A calibrar. Referências de ritmo desejado:
- **Lv.1→2**: ~1 dia de uso normal
- **Lv.5**: ~1 semana
- **Lv.10**: ~1 mês
- **Lv.15+**: exponencial suave, nunca punitivo

Implementação inicial: definir tabela provisória com gaps crescentes que respeitem esses marcos. Ajustar com dados reais depois.

### Requisitos funcionais

- **FR-06**: ✅ 30 níveis definidos em `levels.ts`, cada um com `{ level, name, minXP }`
- **FR-07**: ✅ `levelFromXP()` e `xpProgress()` continuam funcionando, agora com 30 entradas
- **FR-08**: ✅ Título vem do tier (a cada 5 níveis), não do nível individual
- **FR-09**: ✅ Dashboard, statusLine e sync usam o novo sistema de 30 níveis sem quebrar

---

## 3. Cores de Personalidade (WUBRG)

5 cores inspiradas no color pie de Magic: The Gathering. Representam a personalidade do buddy, não métricas do desenvolvedor. O dono molda o buddy ao longo do tempo.

### As 5 cores

| Letra | Cor | Nome | Filosofia |
|-------|-----|------|-----------|
| W | White | Ordem | Estrutura, disciplina, proteção |
| U | Blue | Intelecto | Conhecimento, perfeição, estratégia |
| B | Black | Ambição | Poder, pragmatismo, determinação |
| R | Red | Impulso | Emoção, liberdade, ação |
| G | Green | Instinto | Crescimento, aceitação, natureza |

### Mecânica

- Cada cor: **0 a 20**
- Buddy nasce com todas as cores em **0** (tábula rasa)
- Ao subir de nível, o dono ganha **pontos de ação**:
  - Level up normal: **1 ponto**
  - Level up milestone (múltiplo de 5): **3 pontos**
- Cada ponto permite **+1 ou -1** em qualquer cor (floor 0, cap 20)
- **Remover custa ponto** — mudar de ideia tem custo real
- Pontos não usados **acumulam** para usar depois
- Total acumulável (lv.1→30): 24 normais × 1 + 6 milestones × 3 = **42 pontos**
- Espaço total de cores: 5 × 20 = **100** — força escolhas, nunca maxa tudo

### Distribuição de pontos

Comando `my-buddy colors` (ou integrado ao flow de level up):
- Mostra estado atual das 5 cores + pontos disponíveis
- Permite distribuir pontos: `my-buddy colors W+3 U+2 B-1`
- Validação: não ultrapassa 20, não fica abaixo de 0, não gasta mais pontos do que disponíveis

### Requisitos funcionais

- **FR-10**: ✅ `AppState.colors: { W, U, B, R, G }` (inteiros 0–20) + `AppState.colorPoints` (pontos livres)
- **FR-11**: ✅ Ao subir de nível no sync, adicionar pontos automaticamente (1 ou 3)
- **FR-12**: ✅ `my-buddy colors` exibe estado atual + pontos livres
- **FR-13**: ✅ `my-buddy colors W+3 U-1` distribui pontos com validação
- **FR-14**: ✅ Dashboard (`my-buddy xp`) exibe as 5 cores com barras + pontos livres
- **FR-15**: ✅ Cores são persistidas e nunca resetam
- **FR-16**: ✅ Retrocompatível — estado existente sem `colors`/`colorPoints` carrega com zeros

---

## 4. Badges

Conquistas únicas (unlock uma vez, nunca revogadas). Avaliadas ao final de cada `runSync`.

### Lista inicial (8 badges)

| ID | Nome | Condição |
|---|---|---|
| `first_sync` | First Sync | Completar o primeiro sync |
| `week_streak` | Week Streak | Streak ≥ 5 |
| `month_streak` | Month Streak | Streak ≥ 20 |
| `cache_master` | Cache Master | Sessão com cache hit rate ≥ 80% |
| `speed_demon` | Speed Demon | 3+ sessões no mesmo dia |
| `deep_focus` | Deep Focus | Sessão com 20+ calls |
| `level_10` | Practitioner | Atingir nível 10 |
| `level_20` | Engineer | Atingir nível 20 |

### Requisitos funcionais

- **FR-17**: ✅ Badges persistidos em `AppState.badges: string[]` (IDs dos desbloqueados)
- **FR-18**: ✅ Motor de avaliação roda ao final de `runSync`, checando cada badge não desbloqueado
- **FR-19**: ✅ Quando um badge é desbloqueado, imprime `🏆 Badge desbloqueado: <nome>!` no stdout do `sync`
- **FR-20**: ✅ Badges exibidos no `my-buddy xp` com checkmark
- **FR-21**: ✅ Badge nunca é revogado (mesmo se condição deixar de ser verdadeira)

---

## 5. Voz expandida — reações à progressão

Novas chaves de reação em `Voice.reactions` para o buddy comentar eventos de progressão.

### Novas chaves

| Chave | Gatilho |
|---|---|
| `level_up` | Nível subiu durante o sync |
| `badge_unlocked` | Badge desbloqueado durante o sync |
| `streak_milestone` | Streak atingiu 5, 10, 20, 30 |
| `idle_return` | Primeira sessão após ≥3 dias sem atividade |

### Requisitos funcionais

- **FR-22**: ✅ Novas chaves adicionadas a `Voice.reactions` em `types.ts`
- **FR-23**: ✅ Quando um evento de progressão ocorre no sync, a frase de reação é salva em `AppState` para ser exibida na próxima renderização da statusLine
- **FR-24**: ✅ A frase de progressão tem prioridade sobre idle phrases e time-of-day (mas perde para context changes)
- **FR-25**: ✅ A frase de progressão é exibida apenas uma vez (limpa após renderizada)
- **FR-26**: ✅ Buddies existentes sem as novas chaves continuam funcionando (retrocompatível — pool vazio = sem reação)
- **FR-27**: ✅ O template padrão de `my-buddy new` inclui exemplos das novas chaves de reação

---

## 6. Integração: sync dispara avaliação completa

### Fluxo atualizado do `runSync`

```
discover JSONL → parse incremental → calculate session XP
  → calculate streak → detect level up → add color points
  → evaluate badges → detect progression events
  → save state + pending phrase
```

### Requisitos funcionais

- **FR-28**: ✅ `cmdSync` orquestra avaliação de badges e detecção de eventos de progressão após `runSync`
- **FR-29**: ✅ Ao detectar level up, adicionar pontos de cor automaticamente (1 normal, 3 milestone)
- **FR-30**: ✅ `evaluateBadges` recebe o estado completo (XP, level, streak, badges existentes, breakdown) e retorna novos badges

---

## Estrutura de arquivos (novos/alterados)

```
src/
  xp/
    colors.ts           ← NEW: color definitions, distributePoints, validateDistribution
    badges.ts           ← NEW: badge definitions + evaluateBadges
    levels.ts           ← ALTERED: 30 levels, tier system
    calculator.ts       ← ALTERED: runSync retorna badges, eventos, color points
  commands/
    xp.ts               ← ALTERED: seções de personalidade e badges no dashboard
    colors.ts           ← NEW: my-buddy colors (view + distribute)
    sync.ts             ← ALTERED: imprime badges e eventos, adiciona color points
  render/
    voice.ts            ← ALTERED: nova prioridade para pending progression phrase
    state.ts            ← ALTERED: parse colors, colorPoints, badges no AppState
  types.ts              ← ALTERED: Colors, badges em AppState, novas chaves em Voice.reactions
tests/
  batch4.test.ts        ← EXISTING: xp dashboard (atualizar com cores)
  batch5.test.ts        ← NEW: levels 30, colors
  batch6.test.ts        ← NEW: badges
  batch7.test.ts        ← NEW: voice progression + integration
```

---

## Fora do escopo

- Cores influenciarem frases do buddy (será em spec futura — depende de pool de frases por cor)
- Curva de XP final (calibrar com dados reais de uso)
- Badges repetíveis / sazonais
- Geração assistida de frases via IA
- Gamificação externa (leaderboard, compartilhamento)
- Atributos derivados de métricas de uso (descartado em favor das cores manuais)

---

## Critérios de sucesso

- **SC-01**: `my-buddy xp` renderiza dashboard completo com nível, streak, cores e badges
- **SC-02**: 30 níveis com 6 tiers funcionando, retrocompatível com estados existentes
- **SC-03**: Cores persistidas, pontos distribuídos via `my-buddy colors`, validação correta
- **SC-04**: Badges são persistidos e nunca revogados
- **SC-05**: Buddy exibe frase de progressão na statusLine ao subir de nível / ganhar badge
- **SC-06**: 100% retrocompatível — buddies/states existentes carregam sem erro
- **SC-07**: Cobertura de testes ≥ 95% nos módulos novos
