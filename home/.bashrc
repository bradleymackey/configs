# .bashrc
# Variables and setup. 

# Base16 Shell
BASE16_SHELL="$HOME/.config/base16-shell/"
[ -n "$PS2" ] && \
    [ -s "$BASE16_SHELL/profile_helper.sh" ] && \
        eval "$("$BASE16_SHELL/profile_helper.sh")"

# GLOBALS

export LC_ALL=en_US.UTF-8
export MANPATH="/usr/local/man:$MANPATH"
export LANG=en_US.UTF-8
export DO_NOT_TRACK=1
export NO_UPDATE_NOTIFIER=1
export PAGER="less"
export BASH_SILENCE_DEPRECATION_WARNING=1

# ALIASES

if [[ -n $SSH_CONNECTION ]]; then
  export EDITOR='vim'
else
  export EDITOR='nvim'
fi
alias e='nvim'
alias nv='nvim'
alias v='nvim'
alias p='pnpm'
alias grep='rg'
alias fl="bundle exec fastlane"
alias up="cd .."
alias gap="git add -p"
alias js="node"

# PATH

PATH=$HOME/bin:/usr/local/bin:$PATH
PATH=/opt/homebrew/bin:$PATH
PATH="$PATH:$HOME/.my_scripts"

# FASTLANE
PATH="$HOME/.fastlane/bin:$PATH"

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

# Python
eval "$(pyenv init -)"
PATH=$(pyenv root)/shims:$PATH
# helps with build failures for some modules that occur on Apple Silicon (scipy, statsmodels)
export OPENBLAS=$(brew --prefix openblas || "")
## Poetry
PATH="$HOME/.local/bin:$PATH"

# CARGO (Rust)
PATH="$HOME/.cargo/bin:$PATH"

# PNPM (JS)
export PNPM_HOME="$HOME/Library/pnpm"
PATH="$PNPM_HOME:$PATH"

# AUTOJUMP
[[ -s $(brew --prefix)/etc/profile.d/autojump.sh ]] && . $(brew --prefix)/etc/profile.d/autojump.sh

# FZF
[ -f ~/.fzf.bash ] && source ~/.fzf.bash

# clangd
PATH="$PATH:$brew_prefix/opt/llvm/bin/"

# Node.js
eval "$(fnm env)"

# bun
export BUN_INSTALL="$HOME/.bun"
PATH=$BUN_INSTALL/bin:$PATH

# Ruby
PATH="$PATH:$HOME/.rvm/bin"
eval "$(rbenv init - zsh)"

# Mojo
export MODULAR_HOME="$HOME/.modular"
PATH="$PATH:$HOME/.modular/pkg/packages.modular.com_mojo/bin"

# OrbStack
source ~/.orbstack/shell/init.bash 2>/dev/null || :

eval "$(starship init bash)"
export PATH
