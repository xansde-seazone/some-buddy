# Feature Specification: Statusline Buddy Companion

**Feature Branch**: `001-statusline-pet`
**Created**: 2026-04-04
**Updated**: 2026-04-05
**Status**: Draft
**Input**: User description: "CLI que instala buddy ASCII customizável com voz e cores na statusLine do Claude Code sem patch de binário — alternativa segura ao any-buddy (que quebrou a instalação do Claude do usuário por causa de Bun e patching de binário)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver um buddy companheiro durante sessões do Claude Code (Priority: P1)

O usuário quer um buddy ASCII visível no rodapé da janela do Claude Code durante toda a sessão, ao lado das informações de contexto (diretório, branch, modelo). O buddy tem nome próprio, animação idle e ocasionalmente fala algo curto — dá vida discreta à interface sem atrapalhar o trabalho.

**Why this priority**: É o valor central do produto. Sem isso, a ferramenta não tem razão de existir. É o que o usuário mais sente falta do any-buddy original, mas entregue de forma segura e com personalidade própria.

**Independent Test**: Após instalar a ferramenta e reiniciar o Claude Code, o buddy aparece no rodapé da TUI e permanece visível durante a sessão. Pode ser verificado visualmente.

**Acceptance Scenarios**:

1. **Given** a ferramenta está instalada e um buddy está ativo, **When** o usuário abre o Claude Code, **Then** o buddy aparece no rodapé da TUI ao lado direito das informações de contexto, colorido conforme seu manifesto.
2. **Given** o buddy está visível na statusline, **When** o Claude atualiza a statusline (após mensagem, troca de permission mode ou vim mode), **Then** o buddy alterna entre frames de animação idle (piscar/respirar) sem reset aparente.
3. **Given** o buddy está visível, **When** o usuário troca de branch git, diretório ou modelo do Claude, **Then** o buddy pode exibir uma fala curta reagindo à mudança de contexto.
4. **Given** o buddy está visível, **When** o usuário interage com o Claude normalmente, **Then** o buddy não interfere com mensagens, input, ou performance perceptível da TUI.

---

### User Story 2 - Desinstalar com segurança (Priority: P1)

O usuário quer poder remover completamente a ferramenta a qualquer momento, restaurando as configurações do Claude Code ao estado original anterior à instalação.

**Why this priority**: É P1 porque o principal trauma do usuário (any-buddy quebrou o Claude) foi exatamente a impossibilidade de reverter. Segurança e reversibilidade são não-negociáveis nesta ferramenta. Sem desinstalação confiável, o usuário não vai nem tentar instalar.

**Independent Test**: Após instalar e depois desinstalar, o arquivo de configuração do Claude Code volta a ser idêntico ao estado anterior à instalação.

**Acceptance Scenarios**:

1. **Given** a ferramenta está instalada, **When** o usuário desinstala, **Then** o arquivo de configuração do Claude Code é restaurado exatamente como estava antes da instalação (byte-a-byte do backup).
2. **Given** a ferramenta nunca foi instalada, **When** o usuário executa desinstalação, **Then** o sistema informa que não há nada para desinstalar sem alterar arquivos.
3. **Given** a ferramenta foi desinstalada, **When** o Claude Code é reiniciado, **Then** o Claude opera normalmente sem vestígios da ferramenta.

---

### User Story 3 - Botão de emergência para reverter ao estado original (Priority: P1)

O usuário quer um comando único, sempre disponível, que restaure a configuração do Claude Code ao estado original absoluto (antes da primeira instalação da ferramenta), independentemente de quantas vezes instalou/desinstalou, do estado atual, ou de corrupção no próprio estado interno da ferramenta.

**Why this priority**: É P1 porque estende a garantia de segurança do uninstall. O uninstall reverte a última instalação; o botão de emergência reverte *tudo*, mesmo quando algo der muito errado (manifesto corrompido, backups rotativos perdidos, múltiplos installs encadeados). É a rede de segurança definitiva contra o trauma do any-buddy.

**Independent Test**: Após múltiplos ciclos de install/uninstall/reconfigure, executar o comando de emergência restaura o `settings.json` ao estado exato da primeira vez que a ferramenta foi executada.

**Acceptance Scenarios**:

1. **Given** a ferramenta foi instalada e desinstalada várias vezes, **When** o usuário executa o comando de emergência, **Then** o `settings.json` volta ao estado anterior à primeira instalação (backup original imutável).
2. **Given** o estado interno da ferramenta está corrompido (manifestos inválidos, backup rotativo perdido), **When** o usuário executa o comando de emergência, **Then** o backup original é restaurado mesmo sem depender do estado interno.
3. **Given** a ferramenta nunca modificou nada, **When** o usuário executa o comando de emergência, **Then** o sistema informa que não há backup original e não altera nada.
4. **Given** o usuário quer reverter manualmente sem usar a CLI, **When** consulta a documentação ou output de install, **Then** encontra o comando shell exato (`cp <backup> <settings>`) para restaurar.

---

### User Story 4 - Criar um buddy customizado com nome, cores e voz próprios (Priority: P2)

O usuário quer desenhar seu próprio buddy — escolhendo nome livre, arte ASCII, cor de cada caractere em cada frame, e falas (voice) com personalidade — editando um arquivo de template.

**Why this priority**: Personalização é o segundo pilar da experiência. Sem isso, a ferramenta é só um buddy genérico. O usuário quer ter múltiplos buddies próprios (um ativo por vez), cada um com identidade visual e voz distintas.

**Independent Test**: Após rodar o comando de criação, um arquivo de template editável é gerado e aberto no editor. Ao salvar, o buddy fica disponível para ser ativado.

**Acceptance Scenarios**:

1. **Given** nenhum buddy chamado "Capivara Sarcástica" existe, **When** o usuário roda o comando de criar buddy com esse nome, **Then** um arquivo de template válido é gerado (com ASCII, matriz de cores e voice placeholder) e aberto no editor padrão do sistema.
2. **Given** o template foi gerado sem edições, **When** o usuário ativa esse buddy e instala a ferramenta, **Then** o buddy renderiza sem erros com cores e voz padrão (template funcional por padrão).
3. **Given** o usuário edita o ASCII art, a matriz de cores e as falas do template, **When** salva e ativa o buddy, **Then** a nova arte colorida e as falas aparecem na statusline na próxima renderização.
4. **Given** o usuário define cores diferentes para o mesmo caractere em frames diferentes, **When** a statusline re-renderiza, **Then** a cor alterna junto com a animação (ex: olhos piscando em cores distintas).

---

### User Story 5 - Alternar entre buddies salvos (Priority: P2)

O usuário tem vários buddies criados e quer trocar o buddy ativo sem precisar reinstalar nada.

**Why this priority**: Quem cria um buddy quer criar vários. Trocar precisa ser trivial. Mas é claramente secundário a ter o primeiro buddy funcionando e desinstalação segura.

**Independent Test**: Com 2+ buddies salvos, executar o comando de troca muda o buddy ativo. Próxima renderização da statusline mostra o novo buddy (ASCII + cores + voice).

**Acceptance Scenarios**:

1. **Given** existem 3 buddies salvos e "Tubarão" está ativo, **When** o usuário troca o ativo para "Capivara Sarcástica", **Then** o sistema confirma a troca e a próxima renderização mostra a nova arte, cores e voz.
2. **Given** o usuário tenta ativar um buddy que não existe, **When** executa o comando de troca, **Then** o sistema retorna erro claro listando os buddies disponíveis.
3. **Given** existem buddies salvos, **When** o usuário lista buddies, **Then** o sistema mostra todos com nome e preview colorido, destacando o ativo.

---

### Edge Cases

- **Arquivo de configuração do Claude inexistente na instalação**: o sistema cria um novo do zero com apenas a configuração necessária.
- **Arquivo de configuração do Claude já possui configuração de statusline pré-existente**: o sistema avisa e pede confirmação antes de sobrescrever (e salva a anterior no backup).
- **Manifesto do buddy ativo está corrompido ou inválido**: a renderização mostra um buddy fallback seguro com mensagem de erro compacta, nunca quebra.
- **Nenhum buddy criado e tentativa de instalar**: o sistema oferece criar um buddy padrão antes de instalar.
- **Buddy ativo foi deletado do disco**: a renderização detecta e volta ao buddy fallback, instruindo o usuário a rodar o comando de troca.
- **Renderização excede tempo limite**: o output é truncado/cacheado para não travar a TUI do Claude Code (debounce do Claude é 300ms).
- **Usuário tenta criar buddy com nome que já existe**: o sistema pergunta se quer sobrescrever ou cancelar.
- **Buddy tem ASCII art fora do formato esperado (largura/altura errada)**: a renderização alinha/trunca com aviso visual, nunca quebra o layout.
- **Matriz de cores não bate com as dimensões do ASCII**: células ausentes herdam cor padrão do terminal; células em excesso são ignoradas com aviso.
- **Terminal do usuário não suporta 256-color**: cores são suprimidas e apenas ASCII é renderizado, sem quebrar layout.
- **Buddy tem reação para contexto que nunca mudou**: ignora silenciosamente, nunca força fala vazia.

## Requirements *(mandatory)*

### Functional Requirements

**Gerenciamento de buddies:**

- **FR-001**: O sistema MUST permitir ao usuário criar um novo buddy a partir de um template editável.
- **FR-002**: O sistema MUST armazenar buddies criados pelo usuário de forma persistente.
- **FR-003**: O sistema MUST permitir ao usuário listar todos os buddies salvos, identificando qual está ativo.
- **FR-004**: O sistema MUST permitir ao usuário ativar exatamente um buddy por vez.
- **FR-005**: O sistema MUST permitir ao usuário visualizar um preview colorido de qualquer buddy salvo sem precisar ativá-lo.

**Integração com Claude Code:**

- **FR-006**: O sistema MUST adicionar a configuração de statusline à configuração do Claude Code de forma automática, sob comando explícito do usuário.
- **FR-007**: O sistema MUST criar um backup da configuração do Claude Code imediatamente antes de modificá-la.
- **FR-008**: O sistema MUST permitir ao usuário desinstalar, restaurando a configuração do Claude Code exatamente como estava antes da instalação.
- **FR-009**: O sistema MUST NOT modificar arquivos binários do Claude Code em nenhuma hipótese.
- **FR-010**: O sistema MUST indicar ao usuário se a ferramenta está atualmente instalada e qual buddy está ativo.

**Renderização na statusline:**

- **FR-011**: A statusline renderizada MUST mostrar o buddy ativo com altura de 5 linhas e largura de 12 caracteres, colorido conforme a matriz de cores do frame corrente.
- **FR-012**: A statusline renderizada MUST mostrar informações de contexto (diretório de trabalho, branch git quando aplicável, modelo do Claude) ao lado do buddy.
- **FR-013**: O buddy MUST alternar entre frames de animação idle (respiração/piscada) a cada renderização da statusline, usando timestamp para rotação determinística.
- **FR-014**: A renderização MUST ser resiliente a dados ausentes ou inválidos, sempre produzindo um output visível sem quebrar.
- **FR-015**: A statusline MUST opcionalmente incluir uma linha de fala curta do buddy (≤ 1 linha, truncada pela largura disponível).

**Formato do buddy:**

- **FR-016**: Cada buddy MUST ter um nome escolhido livremente pelo usuário (string não vazia, única dentro da coleção do usuário).
- **FR-017**: Cada buddy MUST definir múltiplos frames de arte ASCII (12×5) para permitir animação.
- **FR-018**: Cada buddy MUST suportar uma matriz de cores por frame (12×5), permitindo colorir cada caractere individualmente usando paleta 256-color. Células sem cor definida herdam a cor padrão do terminal.
- **FR-019**: O formato do buddy MUST suportar um placeholder para o caractere de olhos, permitindo customização rápida de expressão.
- **FR-020**: Cada buddy MUST ter uma definição de voz (voice) contendo lista de falas idle (phrases), reações condicionais por mudança de contexto (reactions), e tom de personalidade (personality).

**Voz e reações:**

- **FR-021**: O sistema MUST rotacionar falas idle do buddy de forma determinística baseada em timestamp, sem processo de fundo nem timers.
- **FR-022**: O sistema MUST detectar mudanças de contexto (branch git, diretório de trabalho, modelo do Claude) entre renderizações consecutivas e disparar a reação correspondente quando definida.
- **FR-023**: O sistema MUST persistir estado mínimo entre renderizações (último contexto visto, contador de refresh) em arquivo leve, para permitir detecção de mudança sem processo de fundo.
- **FR-024**: Quando o buddy não tem nada a dizer, a linha de fala MUST ser omitida (nunca renderizar bolha vazia).

**Segurança e reversibilidade:**

- **FR-025**: Qualquer modificação em arquivos de configuração externos MUST ser precedida de backup.
- **FR-026**: Nenhum comando da ferramenta pode deixar o Claude Code em estado inutilizável.
- **FR-027**: Em caso de erro durante a instalação, o sistema MUST restaurar o estado anterior automaticamente.
- **FR-028**: Toda escrita no `settings.json` do Claude Code MUST ser atômica (escrever em arquivo temporário + `rename`), nunca sobrescrever o arquivo original diretamente.
- **FR-029**: O sistema MUST validar que o JSON resultante é sintaticamente válido e preserva todas as chaves pré-existentes antes de promover a escrita atômica.
- **FR-030**: Após criar backup, o sistema MUST verificar a integridade do backup (hash/re-leitura) antes de prosseguir com qualquer modificação.
- **FR-031**: Falhas em tempo de execução do script de renderização do buddy (manifesto corrompido, erro de I/O, exceção inesperada) MUST sair com código 0 e output vazio ou fallback minimal — NUNCA propagar erro para o Claude Code.
- **FR-032**: O sistema MUST oferecer um modo dry-run que mostra exatamente qual diff será aplicado ao `settings.json` sem escrever nada.
- **FR-033**: Se o backup estiver ausente ou corrompido no momento do uninstall, o sistema MUST recusar a operação e instruir o usuário, nunca tentar "adivinhar" o estado anterior.

**Botão de emergência (panic restore):**

- **FR-034**: O sistema MUST preservar um **backup original imutável** — a primeira cópia do `settings.json` capturada antes de qualquer modificação — que NUNCA é sobrescrito por operações subsequentes (install, uninstall, reconfigure).
- **FR-035**: O sistema MUST oferecer um comando de emergência que restaura o `settings.json` a partir do backup original imutável, funcionando independentemente do estado interno da ferramenta (manifestos corrompidos, backups rotativos ausentes, config da ferramenta perdida).
- **FR-036**: O comando de emergência MUST ser executável mesmo quando a ferramenta acredita não estar instalada, desde que o backup original exista em disco.
- **FR-037**: Após cada install/uninstall, o sistema MUST imprimir o caminho do backup original e o comando shell exato (`cp <backup> <settings>`) que o usuário pode rodar manualmente sem depender da CLI.
- **FR-038**: O caminho do backup original MUST ser estável, previsível e documentado (ex: sempre em `~/.<tool>/backups/original-settings.json`).
- **FR-039**: O comando de emergência MUST confirmar com o usuário (y/N) antes de sobrescrever, mostrando timestamp do backup original para dar contexto.

### Key Entities

- **Buddy**: Representa um companheiro ASCII customizado. Tem nome único escolhido pelo usuário, caractere de olhos, múltiplos frames (cada um com ASCII 12×5 + matriz de cores 12×5), e uma Voice. Armazenado em disco e editável pelo usuário.
- **Frame**: Uma arte ASCII 12×5 com sua matriz de cores paralela. Buddies têm múltiplos frames para animação idle.
- **ColorMap**: Matriz 12×5 de índices 256-color (ou null para herdar padrão do terminal) paralela ao ASCII de um Frame.
- **Voice**: Definição de personalidade do buddy. Contém `personality` (tom descritivo), `phrases` (falas idle rotativas) e `reactions` (falas condicionais por evento de contexto: `branch_changed`, `cwd_changed`, `model_changed`, time-of-day, etc).
- **Active Buddy Marker**: Ponteiro para o buddy atualmente ativo. Apenas um pode existir por vez.
- **Render State**: Estado mínimo persistido entre renderizações (último contexto visto, contador de refresh) para permitir detecção de mudanças sem processo de fundo.
- **Installation State**: Indica se a integração com o Claude Code está instalada. Inclui backup da configuração original.
- **Backup (rotativo)**: Cópia fiel da configuração do Claude Code antes de cada install, usada para restaurar no uninstall correspondente.
- **Original Backup (imutável)**: A primeira cópia da configuração do Claude Code feita antes da primeiríssima modificação da ferramenta. Nunca sobrescrito. Usado exclusivamente pelo botão de emergência. Caminho estável e documentado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário consegue instalar a ferramenta e ver seu buddy colorido no Claude Code em menos de 2 minutos, a partir de uma instalação zero.
- **SC-002**: 100% das desinstalações restauram a configuração do Claude Code byte-a-byte idêntica ao estado pré-instalação.
- **SC-003**: A ferramenta nunca deixa o Claude Code inutilizável — zero incidentes de "Claude quebrado" após qualquer comando da ferramenta.
- **SC-004**: O usuário consegue criar e ativar um buddy próprio (ASCII + cores + voice) em menos de 10 minutos, incluindo tempo para editar.
- **SC-005**: A renderização da statusline (incluindo cores e lógica de voice) não adiciona atraso perceptível na TUI do Claude Code (completa em menos de 200ms por chamada, bem dentro do debounce de 300ms do Claude Code).
- **SC-006**: Manifestos de buddy gerados pelo template de criação funcionam sem edição em 100% dos casos.
- **SC-007**: O usuário consegue alternar entre buddies salvos em menos de 10 segundos, sem precisar reinstalar.
- **SC-008**: Reações de contexto disparam corretamente em ≥ 95% das mudanças de branch/cwd/modelo detectáveis entre refreshes.
- **SC-009**: O botão de emergência restaura o estado original com sucesso em 100% dos casos, mesmo com estado interno da ferramenta corrompido ou ausente.
- **SC-010**: O caminho do backup original e o comando de restauração manual ficam visíveis ao usuário em pelo menos 3 pontos distintos (output de install, output de uninstall, comando `status`/`help`).

## Assumptions

- O usuário já tem o Claude Code instalado e em uso regular.
- O Claude Code expõe `statusLine` com contrato: recebe JSON via stdin (incluindo `model.id`, `cwd`, `worktree.branch`, `session_id`, etc), aceita múltiplas linhas no stdout, renderiza ANSI escape codes (256-color), com debounce de 300ms entre execuções.
- O usuário tem um editor de texto configurado como padrão no sistema.
- O terminal do usuário suporta 256-color ANSI (fallback degradado gracefully quando não).
- Ambientes-alvo iniciais são Linux e macOS (Windows fora de escopo para a primeira versão).
- O usuário tem familiaridade básica com edição de arquivos de configuração e ASCII art (não é público leigo).
- Múltiplos buddies são armazenados em um diretório dedicado dentro do home do usuário; um arquivo de manifesto por buddy.
- A animação idle e rotação de phrases são baseadas em timestamp (sem processo de fundo, sem timers), aproveitando que o Claude Code re-executa o comando de statusline em cada refresh.
- Detecção de mudança de contexto usa arquivo leve de estado persistido entre refreshes, gravado atomicamente para tolerar cancelamento de execução (debounce do Claude).
