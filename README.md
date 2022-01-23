# Configs

Configuration files for my preferred setup.

## Install

Clone the repo, symlink folders/files in the relevant places.
This will ensure they stay in sync with this repo.

You can install by running the `install` script, which gets most of the config setup fast.

I'm a fan of configs working, and working fast.
There may be better alternatives to some of these tools below, but they work well for me in my workflow.

## Setup

- OS: macOS arm64 (configs should be almost Linux compatible)
- Version Control: `git`
- Terminal:
  - Shell: `zsh`, [`ohmyzsh`](https://github.com/ohmyzsh/ohmyzsh)
  - Emulator: [`Alacritty`](https://github.com/alacritty/alacritty)
  - Multiplexer: [`tmux`](https://github.com/tmux/tmux/wiki)
  - Colors: [`base16`](https://github.com/chriskempson/base16)
- Editor: [`neovim`](https://neovim.io)
  - Package Manager: [`packer.nvim`](https://github.com/wbthomason/packer.nvim)
  - Colors: [`base16-vim`](https://github.com/chriskempson/base16-vim)
  - LSP: Native with [`nvim-lspconfig`](https://github.com/neovim/nvim-lspconfig) to bootstrap
  - Lint/Diagnostics: [`null-ls`](https://github.com/jose-elias-alvarez/null-ls.nvim)
  - Format: [`mhartington/formatter.nvim`](https://github.com/mhartington/formatter.nvim)
  - (_see config file for more_)
- Shell Tools:
  - Package Manager: [`brew`](https://brew.sh)
  - Grep: [`ripgrep`](https://github.com/BurntSushi/ripgrep)
  - Node.js Versioner: [`n`](https://github.com/tj/n)
  - Python Versioner: [`pyenv`](https://github.com/pyenv/pyenv)
  - Rust Versioner: [`rustup`](https://rustup.rs)

## Notes

- MacOS + tmux was slow on Intel but is fast on Apple Silicon. No clue why.
