# Installation System Documentation

This document describes the Bun-based installation system for managing dotfiles and development environment configuration.

## Overview

The installation system has been completely rewritten in TypeScript using Bun, providing:

- **Cross-platform compatibility**: Uses Bun shell for better portability
- **Type safety**: Full TypeScript with type checking
- **Comprehensive testing**: Test suite using Bun's built-in test runner
- **Verification mode**: Check symlink status without making changes
- **Dry-run mode**: Preview changes before applying them
- **Idempotency**: Safe to run multiple times
- **Backup protection**: Automatically backs up existing files

## Architecture

### Main Components

1. **`install/install.ts`** - Main installation script
   - Handles symlink creation for dotfiles
   - Manages directory structure
   - Orchestrates package installation scripts
   - Provides CLI interface with flags

2. **`install/node.ts`** - Node.js package installation
   - Installs global pnpm packages
   - TypeScript, ESLint, Prettier, etc.

3. **`install/rust.ts`** - Rust toolchain installation
   - Installs rustup and cargo
   - Adds Rust components (clippy, rustfmt, etc.)

4. **`install/macos/`** - macOS-specific scripts
   - `macos.ts`: System preferences (Dock, key repeat, etc.)
   - `brew.ts`: Homebrew and package installation

5. **`test/install.test.ts`** - Comprehensive test suite
   - Tests all installation scenarios
   - Validates idempotency and error handling
   - Platform-specific tests

### Configuration Files

- **`package.json`** - Defines npm scripts and dependencies
- **`tsconfig.json`** - TypeScript configuration

## Usage

### Installation

```bash
# Check status of symlinks (recommended first step)
bun run verify

# Preview changes
bun run dry-run

# Install everything
bun run install

# Install only dotfiles (skip packages)
bun run install:dotfiles

# Verbose output
bun run install:verbose

# Show detailed help
bun run usage
```

### Testing

```bash
# Run all tests
bun test

# Watch mode (auto-rerun on changes)
bun test --watch

# Specific test file
bun test test/install.test.ts
```

### Development

```bash
# Show detailed installation help
bun run usage

# Run install script directly (if needed)
bun install/install.ts --help

# Check TypeScript types
bun --no-install install/install.ts --help
```

## Key Features

### Verification Mode

Check the status of all expected symlinks without making any changes:

```bash
bun run verify
```

Output shows:
- ✓ **OK** (green): Symlink correctly points to source
- ✗ **Missing** (yellow): Symlink doesn't exist yet
- ✗ **Wrong target** (red): Symlink points to wrong location
- ✗ **Not a symlink** (red): Regular file/directory exists instead
- ✗ **Source missing** (red): Source file doesn't exist in configs

Exit codes:
- `0`: All symlinks are correctly configured
- `1`: Issues found (use `bun run install` to fix)

This is useful for:
- Checking your system's current state
- CI/CD integration
- Auditing before/after changes

### Dry-Run Mode

The dry-run command allows you to preview all changes before applying them:

```bash
bun run dry-run
```

Output shows:
- Which symlinks would be created
- Which directories would be created
- Which scripts would be run
- No actual changes are made

### Idempotency

The installation is fully idempotent:
- Detects existing correct symlinks and skips them
- Won't re-run installations unnecessarily
- Safe to run multiple times without side effects

### Backup Protection

Before replacing any existing files:
1. Checks if target exists
2. Creates timestamped backup (`.backup.{timestamp}`)
3. Then creates the new symlink

Example: `~/.bashrc.backup.1729356789`

### Error Handling

- Gracefully handles missing source files
- Continues on non-critical errors
- Provides clear error messages with color coding
- Returns appropriate exit codes

## Symlinks Created

### Home Directory
- `.bash_profile` → Bash login configuration
- `.bashrc` → Bash interactive shell configuration
- `.tmux.conf` → tmux configuration
- `.vimrc` → Vim configuration
- `.lldbinit` → LLDB debugger configuration
- `.gitconfig` → Git configuration
- `.gitignore` → Global Git ignore patterns
- `.my_scripts/` → Custom shell scripts

### ~/.config Directory
- `nvim/` → Neovim configuration
- `base16-shell/` → Base16 color scheme
- `kitty/` → Kitty terminal configuration
- `alacritty/` → Alacritty terminal configuration
- `helix/` → Helix editor configuration
- `swift_po/` → Swift debugging tools

### macOS Specific
- `~/Library/Application Support/nushell/config.nu`
- `~/Library/Application Support/nushell/env.nu`

## Testing Strategy

The test suite validates:

1. **CLI Interface**
   - Help flag displays usage
   - Flag parsing works correctly
   - Error messages for invalid flags

2. **Dry-Run Mode**
   - No actual changes made
   - Correct preview output
   - All operations simulated

3. **Symlink Management**
   - Creates symlinks correctly
   - Detects existing symlinks
   - Handles broken symlinks
   - Creates backups when needed

4. **Idempotency**
   - Running twice produces same result
   - No errors on re-run
   - Detects "already exists" conditions

5. **Error Handling**
   - Graceful handling of missing files
   - Continues on non-critical errors
   - Proper exit codes

6. **Platform Detection**
   - Correctly identifies macOS
   - Runs platform-specific scripts
   - Skips irrelevant configurations

## Migration from Bash

The previous bash-based system had several issues:

1. **Path typos**: `$CONF_PATH` vs `$CONFIG_PATH`
2. **Hard-coded paths**: `~/config` vs `~/configs`
3. **No error handling**: Failed symlinks crashed the script
4. **No dry-run**: Couldn't preview changes
5. **No tests**: No way to verify correctness
6. **Not idempotent**: Couldn't safely re-run

The new Bun-based system addresses all these issues with:
- Dynamic path resolution
- Comprehensive error handling
- Full dry-run support
- Extensive test coverage
- Complete idempotency

## Shell Configuration (Bash Only)

This configuration system uses **bash** exclusively. All zsh-related scripts and configurations have been removed for simplicity.

If you need zsh support, you'll need to:
1. Create your own `.zshrc` configuration
2. Add zsh symlinks to `install/install.ts`
3. Optionally add oh-my-zsh installation script

## Contributing

When adding new features:

1. Update `install/install.ts` with new symlinks or logic
2. Add corresponding tests in `test/install.test.ts`
3. Update this documentation
4. Run tests to ensure nothing breaks: `bun test`
5. Test in dry-run mode: `bun run dry-run`
6. Test in verification mode: `bun run verify`

## Troubleshooting

### "Bun is not installed"
Install Bun: `curl -fsSL https://bun.sh/install | bash`

### "Source does not exist"
Some source files may be missing. This is normal if you haven't created all config files yet. The installer continues gracefully.

### "Failed to create symlink"
Check permissions and ensure target directory exists and is writable.

### Tests failing
Run with verbose output: `bun test --verbose`
Check that all source files in `home/` directory exist.

## Future Improvements

Potential enhancements:

1. **Interactive mode**: Ask user which components to install
2. **Uninstall script**: Remove all symlinks and restore backups
3. **Config validation**: Check dotfiles for common errors before installing
4. **Remote install**: Install directly from GitHub without cloning
5. **Platform detection**: Better Linux/Windows support
6. **Logging**: Write detailed logs to file for debugging
