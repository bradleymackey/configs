#!/bin/sh

# There's an issue where pre-built universal binaries of Alacritty have 
# some kind of invalid code signature that stops them respecting the 
# 'Full Disk Access' setting in macOS.
# Pre-built universal binaries are the vendored binaries from the project
# itself, so this is the version that is downloaded from the GitHub repo.
# This means we don't have to build the binaries ourselves.
#
# It asks for permission on every access to every file, which is annoying.
# This re-patches the binary to fix this issue.
# 
# HELP: If this script fails, run each command individually.

codesign --remove-signature /Applications/Alacritty.app
sudo codesign --force --deep --sign - /Applications/Alacritty.app
