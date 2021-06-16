# Configs

Configuration files for my preferred setup.

## Install

Clone the repo, symlink folders/files in the relevant places.
This will ensure they stay in sync with this repo.

You can install by running the `install` script, which gets a few basic things setup fast.

I'm just a fan of things working, and working fast.
There are probably better alternatives to some of these tools below, but they work really well for me in my workflow.

## Setup

- OS: macOS arm64 (configs should be mostly Linux compatible)
- Version Control: `git`
- Terminal:
  - Shell: `zsh`, [`ohmyzsh`](https://github.com/ohmyzsh/ohmyzsh)
  - Emulator: [`Alacritty`](https://github.com/alacritty/alacritty)
  - Multiplexer: [`tmux`](https://github.com/tmux/tmux/wiki)
  - Colors: [`base16`](https://github.com/chriskempson/base16)
- Editor: [`neovim`](https://neovim.io)
  - Package Manager: [`vim-plug`](https://github.com/junegunn/vim-plug)
  - Colors: [`base16-vim`](https://github.com/chriskempson/base16-vim)
  - (_see config file for more_)
- Shell Tools:
  - Package Manager: [`brew`](https://brew.sh)
  - Grep: [`ripgrep`](https://github.com/BurntSushi/ripgrep)
  - Node.js Versioner: [`fnm`](https://github.com/Schniz/fnm)
  - Python Versioner: [`pyenv`](https://github.com/pyenv/pyenv)
  - Rust Versioner: [`rustup`](https://rustup.rs)

## Notes

- MacOS + tmux was slow on Intel but is fast on Apple Silicon. No clue why.
