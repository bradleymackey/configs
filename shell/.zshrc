
# Modern Colors
export TERM=xterm-256color

# If you come from bash you might have to change your $PATH.
export PATH=$HOME/bin:/usr/local/bin:$PATH

# Path to your oh-my-zsh installation.
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
# COMPLETION_WAITING_DOTS="true"

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
)

# only initalise oh-my-zsh if interactive
if [[ $- == *i* ]]; then
    source $ZSH/oh-my-zsh.sh
fi

############# User configuration ############# 

# export MANPATH="/usr/local/man:$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n $SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch x86_64"

# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
# For a full list of active aliases, run `alias`.
#
# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"

# fastlane
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export PATH="$HOME/.fastlane/bin:$PATH"

# vim
alias nv='nvim'
alias vi='nvim'
alias vim='nvim'
alias v='nvim'

# UTILS
alias touchbarreset='sudo pkill TouchBarServer'
alias grep='/usr/local/bin/rg'
eval $(thefuck --alias)
alias ip="dig +short myip.opendns.com @resolver1.opendns.com"
alias localip="ipconfig getifaddr en0"
alias dl="cd ~/Downloads"
alias dt="cd ~/Desktop"

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

# SOURCEKIT-LSP (Swift)
PATH="$PATH:$HOME/dev/sourcekit-lsp/.build/debug/"

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

export PATH

# ##### TMUX #####
# -> Launch to tmux if we're not already in it and we're interactive
# -z = True if the length of string is zero.
# $- = Contains `i` if interactive
if [[ -z "$TMUX" ]] && [[ $- == *i* ]]; then
    echo "➜ Launching TMUX session..."
    # Launches tmux in a session called 'base'.
    tmux attach -t base || tmux new -s base
fi
