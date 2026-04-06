# TODO — próxima sessão

## 1. Acompanhamento de XP (`my-buddy status` / `my-buddy xp`)

O `status` atual não mostra nada de XP. O usuário precisa de feedback sobre sua progressão.

- [ ] Expandir `my-buddy status` (ou criar `my-buddy xp`) para exibir:
  - XP total, nível atual e nome do nível (ex: `Lv.3 Expert`)
  - Barra de progresso textual até o próximo nível (ex: `[████░░░░] 1.240 / 2.000 XP`)
  - Streak atual (ex: `Streak: 5 dias úteis`)
  - Data do último sync e do último dia ativo
  - XP por fonte: sessões vs eventos (ex: `Sessions: 980 XP  |  Events: 260 XP`)
- [ ] Decidir: ampliar `status` com seção de XP, ou comando separado `xp`?

---

## 2. Melhoria das mensagens do buddy

A `Voice` já tem `reactions` para branch/cwd/model/horário, mas o pool de `phrases` é preenchido manualmente pelo usuário na criação. Fica pobre.

- [ ] **Geração assistida de frases**: `my-buddy voice <nome>` abre um fluxo interativo onde o usuário descreve a personalidade e recebe sugestões de frases para aprovar/editar
- [ ] **Reações por nível**: buddy comenta quando sobe de nível (ex: `reactions.level_up`)
- [ ] **Reações por streak**: mensagens especiais no 3º, 7º, 14º dia de streak
- [ ] **Reação idle por XP baixo**: se o usuário ficou muitos dias sem sessões, buddy comenta
- [ ] Definir quais novos campos entram em `Voice.reactions` no `types.ts`

---

## 3. Atributos

O sistema atual tem apenas XP/nível. Atributos dariam dimensões separadas de progressão.

Questões a decidir antes de implementar:
- [ ] Quais atributos? Sugestão inicial: `focus` (sessões longas), `velocity` (output tokens), `efficiency` (cache hit rate), `consistency` (streak)
- [ ] Atributos são derivados automaticamente do uso (calculados no sync) ou alocados manualmente pelo usuário?
- [ ] Onde exibir: só em `status/xp`, ou também na statusLine?
- [ ] Impactam algo no buddy (frases, animações) ou são cosméticos?

Após decisão:
- [ ] Adicionar `attributes: Record<string, number>` em `XPState`
- [ ] Calcular no `runSync` baseado nas métricas das sessões
- [ ] Exibir em `status`

---

## 4. Badges

O sistema de badges precisa ser desenhado do zero para o my-buddy v3.

Questões a decidir:
- [ ] Badges são conquistas únicas (unlock uma vez) ou repetíveis (ex: "completou 10 sessões esta semana")?
- [ ] Gatilhos: baseados em XP total, streak, atributos, ou eventos manuais?
- [ ] Onde ficam persistidos: em `AppState` ou arquivo separado `badges.json`?
- [ ] Buddy reage ao unlock de badge com frase especial?

Após decisão:
- [ ] Definir lista inicial de badges (sugestão: 5–8 para começar)
- [ ] Adicionar `badges: string[]` (IDs de badges desbloqueados) em `AppState`
- [ ] Motor de avaliação chamado no final do `runSync`
- [ ] Exibir badges desbloqueados em `status`
- [ ] Teste de cobertura para motor de badges

---

## Ordem sugerida

1. `status` com XP (sem decisões de design — fácil de fechar)
2. Decidir atributos → implementar
3. Decidir badges → implementar
4. Melhoria de mensagens (depende de badges/atributos para as novas reações)
