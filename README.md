# Configs

Configuration files for my preferred setup.

## Prerequisites

This installation system requires [Bun](https://bun.sh) to be installed:

```bash
# Install Bun (macOS, Linux, WSL)
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

## Install

Clone the repo, symlink folders/files in the relevant places.
This will ensure they stay in sync with this repo.

### Quick Start

```bash
# Clone the repository
git clone <repo-url> ~/configs
cd ~/configs

# Check status of symlinks (verification mode)
bun run verify

# Preview what will be installed (dry-run mode)
bun run dry-run

# Install everything
bun run install

# Install only dotfiles (skip package installations)
bun run install:dotfiles

# Install with verbose output
bun run install:verbose
```

### Available Commands

All commands are available as `bun run` scripts:

```bash
# Verification & Installation
bun run verify           # Check status of all symlinks (no changes made)
bun run install          # Install everything (dotfiles + packages)
bun run install:dotfiles # Install only dotfiles (skip brew, rust, node, etc.)
bun run install:verbose  # Install with detailed output
bun run dry-run          # Preview all changes without making any
bun run usage            # Show detailed help and all options

# Testing
bun test                 # Run all tests
bun test:watch          # Run tests in watch mode
```

### CLI Options

You can also call the installer directly with flags:

- `--verify`: Check status of all symlinks without making changes (non-destructive)
- `--dry-run` or `-d`: Preview changes without making any modifications
- `--skip-packages` or `-s`: Only create symlinks, skip package installations
- `--verbose` or `-v`: Show detailed output for all operations
- `--help` or `-h`: Display usage information

```bash
# Direct usage (if you prefer)
bun install/install.ts --verify
bun install/install.ts --dry-run --verbose
```

### Features

- **Cross-platform**: Built with Bun for better portability and performance
- **Type-safe**: Written in TypeScript with full type checking
- **Verification Mode**: Check status of all symlinks without making changes
- **Idempotent**: Safe to run multiple times without breaking existing setup
- **Backup Protection**: Automatically backs up existing files before replacing them
- **Smart Symlinks**: Detects and skips already-correct symlinks
- **Error Handling**: Gracefully handles missing files and failed operations
- **Colored Output**: Clear visual feedback for success, warnings, and errors
- **Dry-run Mode**: Preview all changes before applying them

### Testing

Run the comprehensive test suite using Bun's built-in test runner:

```bash
# Run all tests
bun test

# Run tests in watch mode (auto-rerun on changes)
bun test --watch

# Or use npm scripts
bun run test
bun run test:watch
```

The test suite includes **47 comprehensive tests** validating:

- Verification mode functionality
- Dry-run mode functionality
- Symlink creation and management
- Idempotency (safe to run multiple times)
- Backup of existing files
- File preservation (no data loss)
- Script syntax validation
- Directory creation
- Error handling and edge cases
- Git integration
- Platform detection (macOS-specific features)
- CLI argument combinations

I'm a fan of configs working, and working fast.
There may be better alternatives to some of these tools below, but they work well for me in my workflow.

## Setup

- OS: macOS arm64 (configs should be almost Linux compatible)
- Version Control: `git`
- Terminal:
  - Shell: `bash`
  - Emulator: [`Alacritty`](https://github.com/alacritty/alacritty)
  - Multiplexer: [`tmux`](https://github.com/tmux/tmux/wiki)
  - Colors: [`base16`](https://github.com/chriskempson/base16)
- Editor: [`neovim`](https://neovim.io)
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
- Shell Tools:
  - Package Manager: [`brew`](https://brew.sh)
  - Grep: [`ripgrep`](https://github.com/BurntSushi/ripgrep)
  - Node.js Versioner: [`pnpm`](https://pnpm.io)
  - Python Versioner: [`pyenv`](https://github.com/pyenv/pyenv)
  - Rust Versioner: [`rustup`](https://rustup.rs)

## Notes

- MacOS + tmux was slow on Intel but is fast on Apple Silicon. No clue why.
