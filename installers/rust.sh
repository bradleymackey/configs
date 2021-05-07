#!/usr/bin/env sh

echo "Installing rust..."

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update stable
echo "Installing rust components..."
rustup component add rls rust-analysis rust-src clippy
echo "Installing cargo-edit..."
cargo install cargo-edit

echo "Rust stuff installed!"
