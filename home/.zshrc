# .zshrc
#
# This just bootstraps the launch of tmux for a shell in tmux.
# We need some initial path setup and brew to be available.
# Then, let's try to launch tmux!

[[ $- == *i* ]] && IS_INTERACTIVE=1 || NOT_INTERACTIVE=1
[[ -z "$TMUX" ]] && NOT_TMUX=1 || IS_TMUX=1
[[ "$TERM_PROGRAM" != "vscode" ]] && WANTS_TMUX=1

# Base16 Shell
BASE16_SHELL="$HOME/.config/base16-shell/"
[ -n "$PS2" ] && \
    [ -s "$BASE16_SHELL/profile_helper.sh" ] && \
        eval "$("$BASE16_SHELL/profile_helper.sh")"

PATH=$HOME/bin:/usr/local/bin:$PATH
PATH=/opt/homebrew/bin:$PATH

export PATH

# -> Launch to tmux if 
#   1. we have tmux installed
#   2. we're not already in it
#   3. we're interactive
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

