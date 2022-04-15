#!/bin/zsh

### VARIABLES
HOME_PATH=~/configs/shell
CONFIG_PATH=~/configs/home/.config
INSTALL_PATH=~/configs/install

### SCRIPT
echo "Running install script..."

# (only create the .config directory if it doesn't exist)
mkdir -p ~/.config

echo "Fetching all submodules..."
git submodule update --init --recursive

# shell + editor
echo "Shell and editor setup..."
ln -s $HOME_PATH/.tmux.conf ~/.tmux.conf
ln -s $SHELL_PATH/my_scripts ~/.my_scripts
ln -s $SHELL_PATH/.zshrc ~/.zshrc
ln -s $SHELL_PATH/.vimrc ~/.vimrc
ln -s $CONF_PATH/nvim ~/.config/nvim
ln -s $CONF_PATH/nvim/vimdid ~/.vimdid
ln -s $CONF_PATH/base16-shell ~/.config/base16-shell
ln -s $CONF_PATH/kitty ~/.config/kitty
ln -s $CONF_PATH/alacritty ~/.config/alacritty

### Install packages
if [[ "$OSTYPE" == "darwin"* ]]; then
    source $INSTALL_PATH/macos/macos.sh
    source $INSTALL_PATH/macos/brew.sh
fi
source $INSTALL_PATH/node.sh
source $INSTALL_PATH/rust.sh
source $INSTALL_PATH/git.sh
source $INSTALL_PATH/oh-my-zsh.sh

# final load to take effect
source ~/.zshrc
