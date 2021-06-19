#!/usr/bin/env sh

eval "$(fnm env)"

fnm install 16
fnm use 16

echo "Installing npm packages"

# packages
npm i -g \
    fixjson \
    jsonlint \
    firebase-tools \
    npm \
    eslint_d \
    yarn \
    neovim \
    typescript \
    typescript-language-server \
    prettier \
    prettier_d_slim \
    pyright

echo "Node stuff installed!"
