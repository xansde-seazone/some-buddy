# TODO — 004-editor

## Feito

(nenhum)

## Próximo

### Batch 1 — Infraestrutura (servidor + HTML shell + comando CLI)

- [ ] `src/editor/server.ts` — servidor HTTP temporário (porta aleatória, serve GET /, recebe POST /save, encerra após save)
- [ ] `src/editor/template.ts` — HTML base do editor (shell vazio com layout, buddy JSON injetado via script tag)
- [ ] `src/commands/edit.ts` — comando `my-buddy edit [nome]`: carrega buddy (ou template), sobe servidor, abre browser
- [ ] Registrar `edit` no `cli.ts`
- [ ] Detectar plataforma para abrir browser (`xdg-open` Linux/WSL, `open` macOS, `start` Windows)
- [ ] Testar fluxo completo: abrir editor vazio, salvar, verificar JSON gravado

### Batch 2 — Grid ASCII 12×5 + mapa de caracteres + paleta de cores

- [ ] Grid 12×5 com fonte monoespaçada, células clicáveis e editáveis
- [ ] Input de caractere por célula (ASCII 32–126 + `·` U+00B7)
- [ ] Mapa de caracteres completo em modal/popup — grid clicável de todos os caracteres permitidos
- [ ] Seleção de área com click-and-drag para aplicar cor em batch
- [ ] Cada célula renderiza com cor ANSI simulada (foreground colorido, fundo terminal)
- [ ] Paleta de 256 cores ANSI como grid clicável
- [ ] Aplicar cor selecionada a célula ou seleção de área
- [ ] Opção de limpar cor (null) — visual transparente
- [ ] Cor selecionada com highlight na paleta

### Batch 3 — Olhos + frames + animação + onion skin

- [ ] Editor de olhos: input para 1 ou 2 caracteres, indicação visual do modo (1×1 ou 2×1)
- [ ] Destacar placeholders `·` / `··` no grid com borda diferente
- [ ] Atualizar `substituteEyes` em `frames.ts` para suportar olhos de 2 caracteres
- [ ] Lista de frames com tabs — cada frame editável independente
- [ ] Adicionar frame (cópia do atual ou vazio) e remover frame (mínimo 1)
- [ ] Onion skin: sobrepor outro frame com opacidade reduzida, dropdown para escolher referência
- [ ] Preview ao vivo: rotação automática de todos os frames (~500ms), cores ANSI simuladas, substituição de olhos

### Batch 4 — Voice editor + skill Claude Code + polish

- [ ] Campo `personality` (texto livre)
- [ ] Lista editável de `phrases` (adicionar, remover, reordenar)
- [ ] Listas editáveis para cada chave de `reactions` (11 chaves)
- [ ] Omitir chaves vazias do JSON final
- [ ] Skill `buddy-edit.md` em `~/.claude/commands/`
- [ ] Skill imprime diff resumido após save
- [ ] Timeout/SIGINT encerra limpa sem gravar
- [ ] Testes do servidor e validação de JSON

## Futuro (fora do escopo da 004)

- [ ] Frames vinculados a reações (ex: frame de surpresa ao mudar branch, frame de sono à noite) — hoje frames são apenas animação idle cíclica
- [ ] Controle de timing de frames (ex: frame 1 por 600ms, frame 2 por 300ms) — hoje é 1 frame por refresh (~300ms fixo)

## Ordem de execução

1. Batch 1 (infraestrutura) — base para tudo
2. Batch 2 (grid + cores) — core do editor visual
3. Batch 3 (olhos + frames) — animação e preview
4. Batch 4 (voice + skill) — completude e integração
