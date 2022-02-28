#!/bin/sh

### VARIABLES
CONF_PATH=~/configs/config
SHELL_PATH=~/configs/shell
INSTALL_PATH=~/configs/installers

### SCRIPT
echo "Running install script..."

# (only create the .config directory if it doesn't exist)
mkdir -p ~/.config

echo "Fetching all submodules..."
git submodule update --init --recursive

# git
echo "Linking git..."
ln -s $CONF_PATH/.gitconfig ~/.gitconfig 
ln -s $CONF_PATH/.gitignore ~/.gitignore
git config credential.helper store

# shell + editor
echo "Shell and editor setup..."
ln -s $SHELL_PATH/.tmux.conf ~/.tmux.conf
ln -s $SHELL_PATH/my_scripts ~/.my_scripts
ln -s $SHELL_PATH/.zshrc ~/.zshrc
ln -s $SHELL_PATH/.vimrc ~/.vimrc
ln -s $CONF_PATH/nvim ~/.config/nvim
ln -s $CONF_PATH/nvim/vimdid ~/.vimdid
ln -s $CONF_PATH/base16-shell ~/.config/base16-shell
ln -s $CONF_PATH/kitty ~/.config/kitty
ln -s $CONF_PATH/alacritty ~/.config/alacritty
ln -s $CONF_PATH/efm-langserver ~/.config/efm-langserver

# ----- other tools -----

# OH MY ZSH
echo "Installing OH MY ZSH..."
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# changes should now take effect
source ~/.zshrc


### Install packages
if [[ "$OSTYPE" == "darwin"* ]]; then
    source $INSTALL_PATH/brew.sh
    source $INSTALL_PATH/macos.sh
fi
source $INSTALL_PATH/node.sh
source $INSTALL_PATH/rust.sh

# final load to take effect
source ~/.zshrc
