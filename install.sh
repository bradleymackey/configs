#!/bin/sh

echo "Running install script..."

# setup

# (only create the .config directory if it doesn't exist)
mkdir -p ~/.config

echo "Fetching all submodules..."
git submodule update --init --recursive

# git
echo "Linking git..."
ln -s ~/configs/config/.gitconfig ~/.gitconfig 
ln -s ~/configs/config/.gitignore ~/.gitignore
git config credential.helper store

# shell + editor
echo "Shell and editor setup..."
ln -s ~/configs/shell/.tmux.conf ~/.tmux.conf
ln -s ~/configs/shell/my_scripts ~/.my_scripts
ln -s ~/configs/shell/.zshrc ~/.zshrc
ln -s ~/configs/config/nvim ~/.config/nvim
ln -s ~/configs/config/nvim/vimdid ~/.vimdid
ln -s ~/configs/config/base16-shell ~/.config/base16-shell
ln -s ~/configs/config/kitty ~/.config/kitty
ln -s ~/configs/config/alacritty ~/.config/alacritty
ln -s ~/configs/config/efm-langserver ~/.config/efm-langserver

# ----- other tools -----

# OH MY ZSH
echo "Installing OH MY ZSH..."
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# changes should now take effect
source ~/.zshrc

### Install packages
if [[ "$OSTYPE" == "darwin"* ]]; then
    source ~/configs/installers/brew.sh
    source ~/configs/installers/macos.sh
fi
source ~/configs/installers/node.sh
source ~/configs/installers/rust.sh

# final load to take effect
source ~/.zshrc
