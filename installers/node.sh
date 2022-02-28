#!/usr/bin/env sh

echo "Installing pnpm global packages"

# packages
pnpm add -g \
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
