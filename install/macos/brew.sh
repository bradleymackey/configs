#!/bin/bash

set -e
set -x

echo "Installing brew (requires xcode command line)..."

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# path is set in .zshrc already, but we need it for the rest of this session
PATH="/opt/homebrew:$PATH"

echo "Installing brew dependencies..."
brew bundle --file ~/config/home/Brewfile

# Install fzf completions
$(brew --prefix)/opt/fzf/install --key-bindings --completion --no-update-rc

echo "Brew stuff installed!"
