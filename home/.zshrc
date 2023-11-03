# .zshrc
#
# This just bootstraps the launch of tmux for a shell in tmux.
# We need some initial path setup and brew to be available.
# Then, let's try to launch tmux!

# Base16 Shell
BASE16_SHELL="$HOME/.config/base16-shell/"
[ -n "$PS2" ] && \
    [ -s "$BASE16_SHELL/profile_helper.sh" ] && \
        eval "$("$BASE16_SHELL/profile_helper.sh")"

# PATH

PATH=$HOME/bin:/usr/local/bin:$PATH
PATH=/opt/homebrew/bin:$PATH
PATH="$PATH:$HOME/.my_scripts"

export PATH

# GLOBALS

export LC_ALL=en_US.UTF-8
export MANPATH="/usr/local/man:$MANPATH"
export LANG=en_US.UTF-8
export DO_NOT_TRACK=1
export NO_UPDATE_NOTIFIER=1
export PAGER="less"

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
alias dl="cd ~/Downloads"
alias dt="cd ~/Desktop"
alias fl="bundle exec fastlane"
alias up="cd .."
alias ls="exa"
alias gap="git add -p"
alias js="node"

# -> Launch to tmux if 
#   1. we have tmux installed
#   2. we're not already in it
#   3. we're interactive
[[ $- == *i* ]] && IS_INTERACTIVE=1 || NOT_INTERACTIVE=1
[[ -z "$TMUX" ]] && NOT_TMUX=1 || IS_TMUX=1
[[ "$TERM_PROGRAM" != "vscode" ]] && WANTS_TMUX=1
[[ -x "$(command -v tmux)" ]] && HAS_TMUX=1
if ! [ $HAS_TMUX ]; then
    echo "➜ You don't have TMUX installed."
fi

if [[ $WANTS_TMUX ]] && [[ $HAS_TMUX ]] && [[ $NOT_TMUX ]] && [[ $IS_INTERACTIVE ]]; 
then
    # Launches tmux in a session called 'base'.
    # That will then take over the session.
    tmux attach -t base || tmux new -s base
else
    # We don't want to launch tmux now, so perform the setup in the current session.
    source "$HOME/.zshmain"
fi


