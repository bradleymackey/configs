#!/bin/bash
# .bash_profile
# For interactive shells, bootstraps the launch of tmux.

source ~/.profile
source ~/.bashrc

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
    echo "➜ Not launching TMUX."
fi
