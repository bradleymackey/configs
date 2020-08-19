# 
### SETUP
#
export TERM=xterm-256color
export PATH=$HOME/bin:/usr/local/bin:$PATH

#
### SCRIPT HELPERS
#
# $- = Contains `i` if interactive
[[ $- == *i* ]] && IS_INTERACTIVE=1 || NOT_INTERACTIVE=1

# -z = True if the length of string is zero.
[[ -z "$TMUX" ]] && NOT_TMUX=1 || IS_TMUX=1

#
### OH MY ZSH 
#
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time oh-my-zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/robbyrussell/oh-my-zsh/wiki/Themes
ZSH_THEME="robbyrussell"

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME=random will cause zsh to load
# a theme from this variable instead of looking in ~/.oh-my-zsh/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )
# CASE_SENSITIVE="true"
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"
# DISABLE_AUTO_UPDATE="true"
# DISABLE_UPDATE_PROMPT="true"
# export UPDATE_ZSH_DAYS=13
# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS=true
# DISABLE_LS_COLORS="true"
# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"
# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"
# Uncomment the following line to display red dots whilst waiting for completion.
COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"
# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in ~/.oh-my-zsh/plugins/*
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(
    git
    brew
    sublime
    sudo
    git-extras
    osx
    xcode
    zsh-syntax-highlighting
    zsh-autosuggestions
    zsh-vim-mode
)

if [[ $IS_INTERACTIVE ]]; then
    source $ZSH/oh-my-zsh.sh
fi

#
### CUSTOM CONFIGURATION
#
export MANPATH="/usr/local/man:$MANPATH"
export LANG=en_US.UTF-8
export ARCHFLAGS="-arch x86_64"

# EDITOR (neovim if local, vim if not)
if [[ -n $SSH_CONNECTION ]]; then
  export EDITOR='vim'
else
  export EDITOR='nvim'
fi
alias e='nvim'
alias nv='nvim'
alias v='nvim'

# FASTLANE
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export PATH="$HOME/.fastlane/bin:$PATH"

# ALIASES
# (run alias for a full list of all zsh aliases)
alias touchbarreset='sudo pkill TouchBarServer'
alias grep='/usr/local/bin/rg'
alias ip="dig +short myip.opendns.com @resolver1.opendns.com"
alias localip="ipconfig getifaddr en0"
alias dl="cd ~/Downloads"
alias dt="cd ~/Desktop"
alias fastlane="bundle exec fastlane"
alias up="cd .."

# JAVA
alias JAVA_HOME='/usr/libexec/java_home'
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JUNIT_HOME="$HOME/java"
PATH="$PATH:$JUNIT_HOME"
export CLASSPATH="$CLASSPATH:$JUNIT_HOME/junit-4.12.jar:$JUNIT_HOME/hamcrest-core-1.3.jar"
PATH="/Library/apache-maven-3.3.9/bin/:$PATH"

# GO
export GOPATH="$HOME/go"
PATH="$PATH:$GOPATH/bin"

# PYTHON
export PYENV_ROOT="$HOME/.pyenv"
PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

# SOURCEKIT-LSP
PATH="$PATH:$HOME/dev/sourcekit-lsp/.build/release/"

#  NVM - node version manager
#  slow, original command:
# [[ -s $HOME/.nvm/nvm.sh ]] && . $HOME/.nvm/nvm.sh
# fast command, defers initalisation until node, nvm or npm are first called
# see: https://www.growingwiththeweb.com/2018/01/slow-nvm-init.html
# but, we use the adapted version for zsh, found by this user here: https://gist.github.com/lukeshiru/e239528fbcc4bba9ae2ef406f197df0c 
#
# Defer initialization of nvm until nvm, node or a node-dependent command is
# run. Ensure this block is only run once if .zshrc gets sourced multiple times
# by checking whether __init_nvm is a function.
if [ -s "$HOME/.nvm/nvm.sh" ] && [ ! "$(type -f __init_nvm)" = function ]; then
export NVM_DIR="$HOME/.nvm"
	[ -s "$NVM_DIR/zsh_completion" ] && . "$NVM_DIR/zsh_completion"
declare -a __node_commands=(nvm `find -L $NVM_DIR/versions/*/*/bin -type f -exec basename {} \; | sort -u`)
function __init_nvm() {
for i in "${__node_commands[@]}"; do unalias $i; done
. "$NVM_DIR"/nvm.sh
unset __node_commands
unset -f __init_nvm
	}
for i in "${__node_commands[@]}"; do alias $i='__init_nvm && '$i; done
fi

# CARGO (rust)
PATH="$HOME/.cargo/bin:$PATH"

# GOOGLE CLOUD
# The next line updates PATH for the Google Cloud SDK.
if [ -f "$HOME/google-cloud-sdk/path.zsh.inc" ]; then
  source "$HOME/google-cloud-sdk/path.zsh.inc"
fi
# The next line enables shell command completion for gcloud.
if [ -f "$HOME/google-cloud-sdk/completion.zsh.inc" ]; then
  source "$HOME/google-cloud-sdk/completion.zsh.inc"
fi

# ADDITIONAL SETUP
eval $(thefuck --alias)

export PATH

# ##### TMUX #####
# -> Launch to tmux if 
#   1. we have tmux installed
#   2. we're not already in it
#   3. we're interactive
[[ -x "$(command -v tmux)" ]] && HAS_TMUX=1
if ! [ $HAS_TMUX ]; then
    echo "➜ You don't have TMUX installed."
fi

if [[ $HAS_TMUX ]] && [[ $NOT_TMUX ]] && [[ $IS_INTERACTIVE ]]; then
    echo "➜ 🚀 TMUX"
    # Launches tmux in a session called 'base'.
    tmux attach -t base || tmux new -s base
fi
