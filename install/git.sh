#!/bin/bash

set -e
set -x

echo "Linking git..."
ln -s ~/config/home/.gitconfig ~/.gitconfig 
ln -s ~/config/home/.gitignore ~/.gitignore
git config credential.helper store
