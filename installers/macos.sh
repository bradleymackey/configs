#!/usr/bin/env bash

echo "Setting up MacOS..."

echo "Setup Dock"
defaults write com.apple.dock orientation left

echo "Reducing key repeat"
defaults write -g InitialKeyRepeat -int 12
defaults write -g KeyRepeat -int 1
