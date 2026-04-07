# 004-editor — Editor visual de buddies no browser

## Resumo

Editor HTML visual servido por um servidor local temporário, acionado via skill do Claude Code. Permite criar novos buddies ou editar existentes com preview em tempo real, sem editar JSON manualmente.

## Motivação

Editar um buddy exige manipular JSON bruto: contar 12 caracteres por linha, montar matrizes 5×12 de cores à mão, testar no terminal. A barreira de entrada é alta e o processo é propenso a erros. Um editor visual com grid, paleta de cores e preview ao vivo elimina essa fricção.

---

## 1. Arquitetura

### Fluxo

```
Skill /buddy-edit [nome]
  → lê JSON do buddy (ou gera template vazio se novo)
  → sobe servidor HTTP local temporário (porta aleatória)
  → abre browser com o editor
  → usuário edita no browser
  → ao salvar, browser faz POST com JSON atualizado
  → servidor grava o arquivo, imprime confirmação, encerra
```

### Componentes

| Componente | Tecnologia | Descrição |
|---|---|---|
| Servidor | Node.js (stdlib `http`) | Serve HTML, recebe POST, grava JSON, encerra |
| Editor | HTML + CSS + JS (single page) | Inline, sem dependências externas |
| Skill | Claude Code command | Orquestra o fluxo: lê buddy → serve → abre browser → aguarda save |

### Requisitos funcionais

- **FR-01**: Servidor HTTP local em porta aleatória, serve o HTML do editor com o JSON do buddy embutido
- **FR-02**: `GET /` retorna o HTML do editor com o buddy JSON injetado via `<script>` tag
- **FR-03**: `POST /save` recebe o JSON editado, valida estrutura básica, grava no arquivo do buddy, retorna 200
- **FR-04**: Após o POST bem-sucedido, o servidor encerra automaticamente após 1s de grace period
- **FR-05**: Skill abre o browser automaticamente (`xdg-open` no Linux, `open` no macOS, `start` no Windows)
- **FR-06**: Funciona para criar novos buddies (template vazio) e editar existentes (carrega JSON atual)

---

## 2. Grid ASCII 12×5

Editor principal: uma grade de 12 colunas × 5 linhas onde cada célula é um caractere.

### Requisitos funcionais

- **FR-07**: Grid renderizado com fonte monoespaçada, cada célula clicável e editável
- **FR-08**: Ao clicar numa célula, o usuário pode digitar um caractere ASCII (printable, 32–126) ou o placeholder de olho `·` (U+00B7)
- **FR-09**: Mapa de caracteres completo acessível via botão — exibe todos os caracteres permitidos (ASCII 32–126 + `·`) em grid clicável. Ao clicar, insere o caractere na célula selecionada
- **FR-10**: Seleção de área com click-and-drag no grid — seleciona retângulo de células para aplicar cor em batch
- **FR-11**: Cada célula exibe sua cor de fundo/foreground conforme a matriz de cores atual

---

## 3. Paleta de cores (256 ANSI)

### Requisitos funcionais

- **FR-12**: Paleta completa de 256 cores ANSI exibida como grid clicável
- **FR-13**: Ao selecionar uma cor e clicar numa célula (ou seleção de área), aplica a cor àquela(s) célula(s) na matriz `colors`
- **FR-14**: Opção de limpar cor (`null`) — célula volta à cor padrão do terminal (representada visualmente como transparente/cinza)
- **FR-15**: A cor selecionada é indicada visualmente na paleta (highlight)

---

## 4. Olhos

O campo `eyes` do buddy pode ter **1 ou 2 caracteres**. No frame, o placeholder `·` (U+00B7) marca posições de olho:
- **1 char**: cada `·` isolado é substituído pelo caractere de olho
- **2 chars**: cada par `··` consecutivo é substituído pelos 2 caracteres de olho

Isso requer atualização em `substituteEyes` (frames.ts) para suportar o novo padrão.

### Requisitos funcionais

- **FR-16**: Editor de olhos: campo de input para 1 ou 2 caracteres, com indicação visual do modo (1×1 ou 2×1)
- **FR-17**: No grid, toda ocorrência de `·` (ou `··` no modo 2×1) é visualmente destacada (ex: borda diferente) para indicar que será substituída pelo caractere de olho no render
- **FR-18**: O preview ao vivo aplica a substituição de olhos (mostra o(s) caractere(s) real(is), não o placeholder)

---

## 5. Frames e animação

Buddies podem ter múltiplos frames. A rotação é `tick % frames.length`.

### Requisitos funcionais

- **FR-19**: Lista de frames com tabs ou sidebar — cada frame editável independentemente
- **FR-20**: Botões para adicionar novo frame (copia o frame atual ou cria vazio) e remover frame (mínimo 1)
- **FR-21**: Onion skin: opção de sobrepor outro frame com opacidade reduzida no grid atual, para facilitar alinhamento de animações. Dropdown seleciona qual frame usar como referência
- **FR-22**: Preview ao vivo: exibe todos os frames em rotação automática (ciclo a cada ~500ms) com fonte monoespaçada e cores ANSI simuladas. Mostra como o buddy vai parecer na statusLine

---

## 6. Editor de Voice

Na mesma página, abaixo ou ao lado do grid.

### Requisitos funcionais

- **FR-23**: Campo de texto para `personality` (free-form string)
- **FR-24**: Lista editável para `phrases` — adicionar, remover, reordenar frases idle
- **FR-25**: Para cada chave de `reactions` existente no tipo Voice (`branch_changed`, `cwd_changed`, `model_changed`, `time_morning`, `time_afternoon`, `time_evening`, `time_night`, `level_up`, `badge_unlocked`, `streak_milestone`, `idle_return`): lista editável de frases
- **FR-26**: Chaves de reactions vazias são omitidas do JSON final (não grava `[]`)

---

## 7. Skill do Claude Code

### Requisitos funcionais

- **FR-27**: Skill `/buddy-edit` aceita nome do buddy como argumento
- **FR-28**: Se o buddy existe, carrega o JSON. Se não existe, gera template padrão (mesma estrutura de `my-buddy new`)
- **FR-29**: Após o save no browser, a skill imprime o diff resumido (campos alterados) no terminal
- **FR-30**: Se o usuário fechar o browser sem salvar, a skill detecta (timeout ou SIGINT) e encerra limpa sem gravar nada

---

## Estrutura de arquivos (novos)

```
src/
  editor/
    server.ts         ← NEW: servidor HTTP temporário
    template.ts       ← NEW: HTML do editor (template string)
  commands/
    edit.ts           ← NEW: comando my-buddy edit (programático)
~/.claude/commands/
  buddy-edit.md       ← NEW: skill do Claude Code
```

---

## Fora do escopo

- Undo/redo no editor (pode ser adicionado depois)
- Geração de ASCII art via IA
- Import/export de sprites de outros formatos
- Edição mobile (apenas desktop)
- Temas para o editor

---

## Critérios de sucesso

- **SC-01**: Editor abre no browser, exibe buddy existente com grid, cores e voice corretos
- **SC-02**: Edições no grid, cores e voice são refletidas no preview em tempo real
- **SC-03**: Ao salvar, JSON gravado é válido e o buddy renderiza corretamente na statusLine
- **SC-04**: Criar buddy novo via editor funciona (template vazio → editar → salvar)
- **SC-05**: Onion skin funciona para alinhar frames de animação
- **SC-06**: Servidor encerra automaticamente após o save
- **SC-07**: Funciona em WSL2 (abre browser no Windows host)
