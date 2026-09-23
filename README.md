# Configs

Configuration files for my preferred setup.

## Prerequisites

This installation system requires [Bun](https://bun.sh) to be installed.
Bun is used as the runner for installing and testing to verify the current environment.

```bash
# Install Bun (macOS, Linux, WSL)
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

## Install

Clone the repo, symlink folders/files in the relevant places.
This will ensure they stay in sync with this repo.

### New Mac

On a fresh Mac, in this order:

```bash
# 1. Command Line Tools (git and compilers; `git` is only a stub until this is done)
xcode-select --install

# 2. Bun
curl -fsSL https://bun.sh/install | bash   # then open a new terminal

# 3. Clone over HTTPS (no SSH key yet; submodules use HTTPS too)
git clone https://github.com/bradleymackey/configs ~/configs
cd ~/configs

# 4. Preview, then install. Expect password prompts for Homebrew, `chsh`
#    (login shell -> /bin/bash) and casks that ship .pkg installers
bun run dry-run
bun run setup
```

Then:

- Log out and back in: key repeat, Dock position and the login shell apply on the next login
- Create an SSH key, add it to GitHub, then
  `git -C ~/configs remote set-url origin git@github.com:bradleymackey/configs.git`
- Copy untracked secrets across by hand: `~/.bash_secrets` (sourced by `.bashrc`) and `~/.profile`
- If macFUSE asks on first use, allow it in System Settings → Privacy & Security
- Optional: `rm -rf ~/.bun` (Homebrew's `bun` replaces the bootstrap copy) and `fnm install --lts`
  (until then, Homebrew's `node` is used)
- `bun run verify`

### Quick Start

```bash
# Clone the repository
git clone <repo-url> ~/configs
cd ~/configs

# Check status of symlinks (verification mode)
bun run verify

# Preview everything that would change (nothing is modified)
bun run dry-run

# Install everything
bun run setup

# Install only dotfiles (skip package installations)
bun run setup:dotfiles

# Install with verbose output
bun run setup:verbose
```

> The installer is deliberately **not** named `install`: `bun install` runs a
> package's `install` script, which would silently run the whole installer.

### Available Commands

All commands are available as `bun run` scripts:

```bash
# Verification & Installation
bun run verify          # Check symlinks + environment (no changes made)
bun run dry-run         # Preview every step, including brew/pnpm/rust/macOS settings
bun run setup           # Install everything (dotfiles + packages)
bun run setup:dotfiles  # Install only dotfiles (skip brew, rust, node, etc.)
bun run setup:verbose   # Install with detailed output
bun run usage           # Show detailed help and all options

# Development
bun run test            # Hermetic test suite + coverage gate (>= 95%)
bun run test:watch      # Run tests in watch mode
bun run test:env        # Opt-in read-only checks against this machine
bun run typecheck       # TypeScript type checking
```

### CLI Options

You can also call the installer directly with flags:

- `--verify`: Check status of all symlinks without making changes (non-destructive)
- `--dry-run` or `-d`: Preview changes without making any modifications
- `--skip-packages` or `-s`: Only create symlinks, skip package installations
- `--verbose` or `-v`: Show detailed output for all operations
- `--help` or `-h`: Display usage information

Each package step can also run on its own, and accepts the same flags:

```bash
bun install/install.ts --verify
bun install/install.ts --dry-run --verbose
bun install/macos/brew.ts --dry-run
bun install/rust.ts --dry-run
```

### Features

- **Dry-run everything**: Every command is declared read-only or mutating; in dry-run
  mode mutating commands are never executed, only reported, while read-only probes
  still run so the preview reflects the machine's real state
- **Verification Mode**: Check symlinks, stale links and required tools without making changes
- **Idempotent**: Safe to run multiple times without breaking existing setup
- **Backup Protection**: Automatically backs up existing files before replacing them
- **Smart Symlinks**: Detects correct links, replaces dangling ones, never writes into linked directories
- **Type-safe**: Written in TypeScript with full type checking

### Testing

```bash
bun run test       # unit + integration + repo hygiene, with coverage gate
bun run test:env   # read-only checks against this machine (Brewfile health, --verify)
```

- `test/unit/`: every install module in-process, with a fake command runner and temp dirs
- `test/integration/`: the real CLI against a throwaway HOME and a fixture configs root;
  `dry-run-safety.test.ts` puts stub `brew`/`pnpm`/`rustup`/`defaults`/... on PATH and fails
  if a dry run executes anything but a read-only probe
- `test/repo/`: the manifest covers everything tracked in `home/`, the Brewfile provides every
  required tool, no self-referential symlinks, vimdid stays gitignored

No test touches the real HOME, the real repo tree, or a real package manager.

I'm a fan of configs working, and working fast.
There may be better alternatives to some of these tools below, but they work well for me in my workflow.

## Setup

- OS: macOS arm64 (configs should be almost Linux compatible)
- Version Control: `git`
- Terminal:
  - Shell: `bash`, [`nushell`](https://www.nushell.sh)
  - Emulator: [`Ghostty`](https://ghostty.org)
  - Multiplexer: [`tmux`](https://github.com/tmux/tmux/wiki)
  - Colors: [`base16`](https://github.com/chriskempson/base16)
- Editors:
  - [`neovim`](https://neovim.io)
    - Package Manager: [`lazy.nvim`](https://github.com/folke/lazy.nvim)
    - File Explorer: [`neo-tree`](https://github.com/nvim-neo-tree/neo-tree.nvim)
    - Colors: [`base16-vim`](https://github.com/chriskempson/base16-vim)
    - LSP: Native with [`nvim-lspconfig`](https://github.com/neovim/nvim-lspconfig)
    - Linting: [`nvim-lint`](https://github.com/mfussenegger/nvim-lint)
    - Formatting: [`none-ls.nvim`](https://github.com/nvimtools/none-ls.nvim) (null-ls successor)
    - Completion: [`nvim-cmp`](https://github.com/hrsh7th/nvim-cmp)
    - Treesitter: [`nvim-treesitter`](https://github.com/nvim-treesitter/nvim-treesitter)
    - Auto-reload: Files automatically reload on external changes
    - (_see config files for complete plugin list_)
  - [`helix`](https://helix-editor.com)
- Shell Tools:
  - Package Manager: [`brew`](https://brew.sh)
  - Prompt: [`starship`](https://starship.rs)
  - Grep: [`ripgrep`](https://github.com/BurntSushi/ripgrep)
  - Git UI: [`lazygit`](https://github.com/jesseduffield/lazygit)
  - Node.js Version Manager: [`fnm`](https://github.com/Schniz/fnm)
  - Node.js Package Manager: [`pnpm`](https://pnpm.io)
  - Python Versioner: [`pyenv`](https://github.com/pyenv/pyenv)
  - Rust Versioner: [`rustup`](https://rustup.rs)

## Notes

- MacOS + tmux was slow on Intel but is fast on Apple Silicon. No clue why.
