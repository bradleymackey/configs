#!/usr/bin/env sh

# NVM
echo "Installing NVM..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash

echo "Setting NVM environment"

# ensure that the nvm command is available
export NVM_DIR=$HOME/.nvm;
source $NVM_DIR/nvm.sh;

# node env
nvm install 16
nvm use 16

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
    prettier_d_slim

echo "Node stuff installed!"
