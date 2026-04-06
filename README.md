<p align="center">
  <img src="assets/header.svg" alt="my-buddy" width="700">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-WTFPL-brightgreen" alt="License: WTFPL"></a>
  <img src="https://img.shields.io/node/v/any-buddy" alt="Node version">
</p>

<p align="center">
  Companion pet ASCII customizável na statusLine do Claude Code — sem binary patching.
</p>

---

## O que é

**my-buddy** é uma reescrita segura do any-buddy. Em vez de injetar código no binário do Claude Code, usa a API pública de `statusLine` para exibir um pet ASCII animado com cores e voz no rodapé da TUI.

Sem Bun. Sem binary patching. Sem risco de quebrar sua instalação.

## Quick Start

```bash
# Criar seu primeiro buddy
my-buddy new capivara

# Ativar
my-buddy use capivara

# Instalar na statusLine do Claude Code
my-buddy install

# Reiniciar o Claude Code — o buddy aparece no rodapé
```

## Comandos

```bash
my-buddy new <nome>       # Criar buddy a partir de template editável
my-buddy use <nome>       # Ativar buddy
my-buddy list             # Listar todos os buddies (destaca o ativo)
my-buddy preview <nome>   # Renderizar buddy no terminal
my-buddy install          # Adicionar statusLine ao settings.json do Claude Code
my-buddy uninstall        # Remover statusLine, restaurar settings anteriores
my-buddy panic            # Emergência: restaurar settings ao estado original absoluto
my-buddy status           # Mostrar estado da instalação e caminhos
my-buddy sync             # Calcular XP a partir das sessões do Claude Code (em breve)
```

## Como funciona

O Claude Code suporta um campo `statusLine` no `settings.json` que executa um comando externo a cada atualização da TUI (~300ms debounced), passando contexto via stdin e renderizando o stdout no rodapé.

O my-buddy usa isso para exibir arte ASCII animada com cores 256-color e frases contextuais sem nenhuma modificação ao binário do Claude Code.

## Formato do buddy

Cada buddy é um arquivo JSON em `~/.my-buddy/buddies/<nome>.json`:

```json
{
  "name": "capivara",
  "eyes": "·",
  "frames": [
    {
      "ascii": [
        " /\\_/\\      ",
        " ( · · )    ",
        " (  ^  )    ",
        " / > < \\    ",
        " ~~~~~~     "
      ],
      "colors": [
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, 220, null, 220, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null, null, null, null]
      ]
    }
  ],
  "voice": {
    "personality": "tranquilo",
    "phrases": ["zzz...", "observando...", "tudo calmo"],
    "reactions": {
      "branch_changed": ["branch nova, eita"],
      "cwd_changed": ["pra onde tô indo?"],
      "model_changed": ["mudou de modelo, hein"],
      "time_morning": ["bom dia!"],
      "time_night": ["hora de dormir"]
    }
  }
}
```

Cada frame é uma grade de 12×5 caracteres. O campo `colors` é uma matriz 5×12 de índices de cor ANSI 256-color (0–255) ou `null` para cor padrão do terminal. Múltiplos frames criam animação idle.

## Segurança e reversibilidade

- Escrita atômica em todos os arquivos (temp + rename)
- Backup imutável do `settings.json` original (nunca sobrescrito)
- Backup rotativo por instalação (usado pelo `uninstall`)
- `my-buddy panic` restaura o estado original independente de qualquer corrupção interna
- Nenhuma modificação ao binário do Claude Code

## Requisitos

- **Node.js >= 20**
- **Claude Code** instalado

---

## Changelog

### `002-xp-system` — Sistema de XP e layout expandido *(em desenvolvimento)*

Spec: [`specs/002-xp-system/spec.md`](specs/002-xp-system/spec.md)

- Layout da statusLine expandido para 5 colunas: nome, nível, frase, respiro, modelo+XP
- Sistema de XP global baseado em leitura dos JSONLs de sessão (`~/.claude/projects/**/*.jsonl`)
- Mecânica: streak de dias úteis (com feriados BR), eficiência de modelo, cache efficiency bonus
- Comando `my-buddy sync` para cálculo incremental de XP
- Auto-sync via hooks `Stop` e `UserPromptSubmit`
- Subsistema de XP por eventos de boas práticas (SDD completo, delegação de subagentes)
- 6 níveis: Apprentice → Practitioner → Craftsman → Engineer → Architect → Maestro

### `001-statusline-pet` — Bootstrap do my-buddy v3

Spec: [`specs/001-statusline-pet/spec.md`](specs/001-statusline-pet/spec.md)

- Reescrita completa do any-buddy sem binary patching
- Integração via API pública `statusLine` do Claude Code
- Buddy com arte ASCII 12×5, cores 256-color por caractere, animação idle, voz com reações contextuais
- Comandos: `new`, `use`, `list`, `preview`, `install`, `uninstall`, `panic`, `status`
- Backups atômicos com restauração de emergência (`panic`)

---

## Créditos (any-buddy legado)

A base de sprites, presets e parte do sistema de geração vem do any-buddy original:

- [@cpaczek](https://github.com/cpaczek) — projeto original any-buddy
- [@jtuskan](https://github.com/jtuskan) — suporte Windows
- [@aaronepinto](https://github.com/aaronepinto) — code signing macOS
- [@joshpocock](https://github.com/joshpocock) — FNV-1a hash para Node runtime
- [@Co-Messi](https://github.com/Co-Messi) — paralelismo multi-worker, preset builds
- [@Ahmad8864](https://github.com/Ahmad8864) — buddy profiles

## License

[WTFPL](LICENSE) — Do What The Fuck You Want To Public License.
