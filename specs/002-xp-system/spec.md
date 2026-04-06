# Feature Specification: XP System & StatusLine Layout Expansion

**Feature Branch**: `002-xp-system`
**Created**: 2026-04-05
**Updated**: 2026-04-05
**Status**: Draft
**Input**: Sistema de gamificação com XP baseado em consistência, eficiência de modelo e boas práticas; expansão do layout da statusLine para 5 colunas com exibição de modelo, effort level e barra de XP.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver informações de contexto e XP na statusLine (Priority: P1)

O usuário quer que a statusLine do Claude Code exiba, ao lado do buddy, o nome do buddy, seu nível, uma frase, o modelo ativo com effort level e uma barra de XP — sem perder o espaço visual que havia antes da capivara.

**Why this priority**: É a entrega de valor imediata e visível. O usuário já tinha informações de modelo na statusLine antes do buddy e quer recuperá-las no novo layout. Sem isso, o buddy oculta contexto útil de trabalho.

**Independent Test**: Após a implementação, a statusLine exibe exatamente 5 linhas no formato correto, com o modelo ativo na linha 5 ao lado da barra de XP.

**Acceptance Scenarios**:

1. **Given** um buddy está ativo e a ferramenta instalada, **When** o Claude Code renderiza a statusLine, **Then** as 5 linhas exibem: (1) arte+nome, (2) arte+nível, (3) arte+frase, (4) arte vazia, (5) arte+modelo+effort+barra+nível.
2. **Given** o effort level está disponível no stdin do Claude Code, **When** a statusLine renderiza, **Then** a linha 5 exibe `[NomeModelo · Effort]` antes da barra de XP.
3. **Given** o effort level NÃO está disponível no stdin, **When** a statusLine renderiza, **Then** a linha 5 exibe apenas `[NomeModelo]` sem falhar.
4. **Given** o XP ainda não foi calculado (primeiro uso), **When** a statusLine renderiza, **Then** a barra exibe `[░░░░░░░░] Nvl 1` sem erro.

---

### User Story 2 - Calcular XP a partir de sessões reais via `my-buddy sync` (Priority: P1)

O usuário quer que o comando `my-buddy sync` leia os arquivos JSONL do Claude Code, calcule XP com base em streak, eficiência de modelo e cache efficiency, e atualize o estado persistido.

**Why this priority**: É o núcleo do sistema de XP. Sem o sync funcionando corretamente, o nível exibido na statusLine é inútil.

**Independent Test**: Dado um diretório `~/.claude/projects/` com JSONLs reais, rodar `my-buddy sync` produz um log auditável com XP calculado, streak atual e nível.

**Acceptance Scenarios**:

1. **Given** existem JSONLs com sessões em múltiplos dias úteis consecutivos, **When** o usuário roda `my-buddy sync`, **Then** o streak é calculado corretamente ignorando fins de semana e feriados brasileiros.
2. **Given** uma sessão usou Haiku para tarefas com `complexity_score < 300`, **When** sync processa essa sessão, **Then** o multiplicador 2x é aplicado ao XP base da sessão.
3. **Given** uma sessão usou Opus para tarefas com `complexity_score < 300`, **When** sync processa essa sessão, **Then** o multiplicador 0.5x (penalidade) é aplicado.
4. **Given** uma sessão teve `hit_rate >= 80%` de cache, **When** sync processa, **Then** +50% de bônus é aplicado ao XP da sessão.
5. **Given** sync foi rodado antes, **When** sync é rodado novamente sem novos JSONLs, **Then** nenhum XP é adicionado (processamento incremental via cursores).
6. **Given** o usuário usou Claude em um fim de semana ou feriado BR, **When** sync processa, **Then** +5 XP fixo de bônus de dedicação é concedido, sem afetar o streak.

---

### User Story 3 - Sync automático no início e fim de sessão (Priority: P2)

O usuário quer que o sync de XP aconteça automaticamente ao abrir e fechar o Claude Code, sem intervenção manual — e que sessões encerradas abruptamente sejam capturadas no próximo início.

**Why this priority**: Reduz fricção. O usuário não precisa lembrar de rodar `my-buddy sync` manualmente. Sessões abruptas (crash, kill) são capturadas na próxima abertura.

**Independent Test**: Após configurar os hooks, abrir e fechar o Claude Code dispara `my-buddy sync` automaticamente. Verificável via timestamp `lastSyncedAt` no state.json.

**Acceptance Scenarios**:

1. **Given** os hooks estão instalados, **When** o usuário abre uma nova sessão do Claude Code (primeiro prompt), **Then** `my-buddy sync` é disparado em background antes de exibir resposta.
2. **Given** os hooks estão instalados, **When** a sessão encerra normalmente (hook `Stop`), **Then** `my-buddy sync` é disparado.
3. **Given** a sessão anterior encerrou abruptamente, **When** o usuário abre nova sessão, **Then** o sync do início da sessão captura os dados da sessão anterior.

---

### User Story 4 - XP por eventos de boas práticas (Priority: P3)

O usuário quer ganhar XP por executar boas práticas específicas: completar um fluxo SDD e delegar subagentes com modelo inferior para tarefas simples.

**Why this priority**: É extensão motivacional do sistema. Valioso, mas o sistema funciona sem ele. Definido como subsistema separado para facilitar extensão futura.

**Independent Test**: Após executar uma boa prática detectável via hook, o XP do evento aparece no `state.json` de forma aditiva ao XP de sessão. Verificável rodando `my-buddy sync` antes e depois e comparando.

**Acceptance Scenarios**:

1. **Given** um hook de evento está configurado para SDD completo, **When** o usuário conclui o fluxo SDD (spec → plan → tasks completadas), **Then** XP de evento é adicionado ao `state.json`.
2. **Given** um hook de evento está configurado para delegação de subagente, **When** o usuário usa o tool `Task` com modelo inferior (Haiku/Sonnet) para uma task de baixa complexidade, **Then** XP de delegação é registrado.
3. **Given** XP de evento foi registrado por hook, **When** `my-buddy sync` roda em seguida, **Then** o XP de evento é preservado (não sobrescrito pelo sync).

---

### Edge Cases

- **JSONLs corrompidos ou com linhas inválidas**: sync ignora a linha com erro e continua processando o restante, logando o problema.
- **Arquivo JSONL rotacionado ou deletado durante sync**: cursores são validados contra tamanho atual do arquivo; se o arquivo encolheu, cursor é resetado para 0.
- **XP suficiente para múltiplos level-ups em um sync**: nível é calculado diretamente a partir do XP total acumulado, nunca perde level-ups.
- **Feriado não cadastrado**: o sistema usa lista fixa de feriados nacionais BR; feriados municipais/estaduais são ignorados (assunção documentada).
- **Buddy sem XP calculado ainda**: barra exibe Nvl 1 com 0 XP, sem erro ou placeholder visível.
- **Effort level ausente no stdin**: linha 5 omite o campo de effort sem quebrar o layout.
- **Múltiplos modelos usados na mesma sessão**: multiplicador é calculado por modelo dominante (maior `output_tokens`) da sessão.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Layout da StatusLine

- **FR-001**: A statusLine DEVE renderizar exatamente 5 linhas no seguinte layout:
  - Linha 1: `[12 chars ASCII] [nome do buddy]`
  - Linha 2: `[12 chars ASCII] Lv.N NomeDoNível`
  - Linha 3: `[12 chars ASCII] [frase/reação do buddy]`
  - Linha 4: `[12 chars ASCII]` (sem texto à direita)
  - Linha 5: `[12 chars ASCII] [NomeModelo · Effort] [████░░░░] Nvl N`
- **FR-002**: O nome do modelo na linha 5 DEVE ser derivado de `model.display_name` do stdin.
- **FR-003**: O effort level na linha 5 DEVE ser exibido somente se presente no stdin; caso contrário, omitido sem espaço vazio remanescente.
- **FR-004**: A barra de XP DEVE ter largura fixa de 8 blocos (█ = preenchido, ░ = vazio), representando progresso entre nível atual e próximo.
- **FR-005**: O render DEVE completar em menos de 200ms; XP NUNCA é calculado inline durante o render.

#### Comando `my-buddy sync`

- **FR-006**: `my-buddy sync` DEVE ler todos os arquivos em `~/.claude/projects/**/*.jsonl`.
- **FR-007**: `my-buddy sync` DEVE processar apenas bytes novos desde o último sync via cursores persistidos por arquivo (`lastProcessedCursors: Record<string, number>`).
- **FR-008**: Para cada arquivo processado, o cursor DEVE ser validado contra o tamanho atual; se o arquivo encolheu, cursor DEVE ser resetado para 0.
- **FR-009**: `my-buddy sync` DEVE parsear mensagens do tipo `assistant` e extrair: `message.usage.input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `message.model`, e timestamp da mensagem.
- **FR-010**: `my-buddy sync` DEVE agrupar mensagens por dia (timezone local do usuário) e por sessão.
- **FR-011**: `my-buddy sync` DEVE calcular `complexity_score = output_tokens / api_calls` por sessão.
- **FR-012**: `my-buddy sync` DEVE aplicar multiplicadores de modelo conforme tabela:
  - Haiku + simples (score < 300): 2x | Haiku + complexa (score ≥ 300): 1x
  - Sonnet + simples: 1x | Sonnet + complexa: 1.5x
  - Opus + simples: 0.5x | Opus + complexa: 2x
- **FR-013**: `my-buddy sync` DEVE calcular `hit_rate = cache_read / (cache_read + cache_creation + input_tokens)` e aplicar bônus: ≥80% → +50% | ≥50% → +20% | <20% → 0.
- **FR-014**: `my-buddy sync` DEVE calcular streak de dias úteis consecutivos ignorando fins de semana e feriados nacionais brasileiros fixos.
- **FR-015**: Uso em fim de semana ou feriado BR DEVE conceder +5 XP fixo sem alterar o streak.
- **FR-016**: XP diário por streak DEVE seguir escalonamento: dias 1–5 → 5 XP/dia | dias 6–30 → 10 XP/dia | dias 31+ → 15 XP/dia.
- **FR-017**: `my-buddy sync` DEVE exibir log auditável do cálculo: XP ganho por sessão, multiplicador aplicado, bônus de cache, streak atual, total acumulado.
- **FR-018**: `my-buddy sync` DEVE persistir estado atomicamente em `~/.my-buddy/state.json`.

#### Hooks de Sessão

- **FR-019**: O hook `Stop` do Claude Code DEVE disparar `my-buddy sync` ao encerrar sessão normalmente.
- **FR-020**: O hook `UserPromptSubmit` (ou equivalente de início de sessão) DEVE disparar `my-buddy sync` em background ao abrir nova sessão.
- **FR-021**: Os hooks de sessão DEVEM ser instalados pelo comando `my-buddy install` e desinstalados pelo `my-buddy uninstall`.

#### XP por Eventos (Subsistema Separado)

- **FR-022**: O sistema DEVE expor uma interface `my-buddy xp-event <event-name> <xp-amount>` para que hooks externos registrem XP incremental.
- **FR-023**: XP de eventos DEVE ser adicionado ao `state.xp` de forma aditiva, nunca sobrescrito por `my-buddy sync`.
- **FR-024**: Eventos suportados na v1: `sdd-complete` e `subagent-delegation` (valores de XP a definir na implementação).

### Key Entities

- **XPState**: `{ xp: number, level: number, streak: number, lastActiveDate: string, lastSyncedAt: string | null, lastProcessedCursors: Record<string, number> }` — parte do `AppState` persistido em `~/.my-buddy/state.json`.
- **SessionData**: representação interna de uma sessão parseada de JSONL — `{ sessionId, date, model, apiCalls, outputTokens, inputTokens, cacheCreation, cacheRead }`.
- **SyncResult**: output do sync — `{ xpAdded, newStreak, newLevel, sessionsProcessed, breakdown: SessionData[] }`.

### Níveis

| Nível | Nome         | XP acumulado |
|-------|--------------|-------------|
| 1     | Apprentice   | 0           |
| 2     | Practitioner | 500         |
| 3     | Craftsman    | 1.500       |
| 4     | Engineer     | 3.500       |
| 5     | Architect    | 7.500       |
| 6     | Maestro      | 15.000      |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dado um diretório `~/.claude/projects/` com JSONLs reais, `my-buddy sync` calcula XP total, streak e nível corretamente — verificável comparando cálculo manual com output do comando.
- **SC-002**: O render da statusLine completa em <200ms medido em máquina de desenvolvimento padrão.
- **SC-003**: Streak ignora corretamente fins de semana e pelo menos os 12 feriados nacionais BR fixos (verificável com datas de teste conhecidas).
- **SC-004**: Rodando `my-buddy sync` duas vezes sem novos JSONLs, o segundo sync reporta 0 XP adicionado.
- **SC-005**: Hook `Stop` dispara sync com sucesso em sessão encerrada normalmente — verificável via `lastSyncedAt` atualizado no `state.json`.
- **SC-006**: XP registrado via `my-buddy xp-event` persiste após rodar `my-buddy sync` subsequente.

## Assumptions

- O formato JSONL do Claude Code (`~/.claude/projects/**/*.jsonl`) mantém a estrutura de `message.usage` documentada na spec.
- O modelo dominante de uma sessão é o que gerou mais `output_tokens` naquela sessão.
- Feriados municipais e estaduais não são considerados — apenas feriados nacionais fixos BR.
- O effort level pode ou não estar presente no stdin do `statusLine`; a implementação deve verificar o payload real durante o desenvolvimento.
- O campo `session_id` nos JSONLs pode ser usado para agrupar mensagens por sessão.
- A instalação dos hooks de sessão é parte do fluxo `my-buddy install` já existente.

## Out of Scope

- Leaderboard ou compartilhamento de XP entre membros da equipe
- Integração com Slack ou notificações externas
- Dados de token em tempo real durante sessão ativa
- Alteração do sistema de frames, cores ou voz dos buddies
- Feriados municipais ou estaduais no cálculo de streak
- Histórico de XP por sessão acessível via CLI (apenas total acumulado)
