# Customize the default prompt
# gives us git status and name of the current folder only
# (not bold though!)
PROMPT="%(?:%{$fg[green]%}• :%{$fg[red]%}• )"
PROMPT+='%{$fg[cyan]%}%c%{$reset_color%} $(git_prompt_info)'

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
eval "$(pyenv virtualenv-init -)"
export PYENV_VIRTUALENV_DISABLE_PROMPT=1
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

# gcloud
source "$brew_prefix/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/completion.zsh.inc"

# clangd
PATH="$PATH:$brew_prefix/opt/llvm/bin/"

# Bun (JS)
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"
export BUN_INSTALL="$HOME/.bun"
PATH="$BUN_INSTALL/bin:$PATH"

# Node.js
eval "$(fnm env)"

# Ruby
PATH="$PATH:$HOME/.rvm/bin"
eval "$(rbenv init - zsh)"

# Mojo
export MODULAR_HOME="$HOME/.modular"
PATH="$PATH:$HOME/.modular/pkg/packages.modular.com_mojo/bin"

# >>> conda initialize >>>
# !! Contents within this block are managed by 'conda init' !!
__conda_setup="$('/Users/bradley/miniconda3/bin/conda' 'shell.bash' 'hook' 2> /dev/null)"
if [ $? -eq 0 ]; then
    eval "$__conda_setup"
else
    if [ -f "/Users/bradley/miniconda3/etc/profile.d/conda.sh" ]; then
        . "/Users/bradley/miniconda3/etc/profile.d/conda.sh"
    else
        export PATH="/Users/bradley/miniconda3/bin:$PATH"
    fi
fi
unset __conda_setup
# <<< conda initialize <<<

export PATH
