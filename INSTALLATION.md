# Installation System Documentation

This document describes the Bun-based installation system for managing dotfiles and development environment configuration.

## Overview

- **Dry-run everything**: every step (symlinks, macOS settings, Homebrew, pnpm, Rust) previews its changes
- **Verification mode**: check symlinks, stale links and required tools without making changes
- **Idempotency**: safe to run multiple times
- **Backup protection**: existing files are backed up before being replaced
- **Tested**: unit tests for every module, CLI integration tests, and a coverage gate

## Architecture

```
install/
  install.ts        CLI entry point: install / --dry-run / --verify
  symlinks.ts       The symlink manifest (single source of truth)
  verify.ts         Verification mode, stale-link detection, required tools
  node.ts           Global pnpm packages (+ deprecation audit)
  rust.ts           rustup, components, cargo tools
  macos/macos.ts    macOS `defaults` settings
  macos/brew.ts     Homebrew, Brewfile bundle, fzf bindings, Brewfile audit
  lib/context.ts    Context passed to every step (dry-run flag, HOME, runner, log, summary)
  lib/runner.ts     Command runner; the dry-run runner never executes mutating commands
  lib/fs-ops.ts     Symlink/directory operations (lstat + symlinkSync, backups)
  lib/step.ts       Runs a step and folds its result into the summary
  lib/summary.ts    End-of-run summary table
  lib/standalone.ts Lets each step run on its own with the same flags
```

### How dry-run works

Every command is run through `ctx.runner.run(cmd, { mutates })`. In dry-run mode the runner is
wrapped by `createDryRunRunner`: commands with `mutates: false` (e.g. `brew bundle check`,
`defaults read`, `pnpm list`) still run so the preview reflects the real machine, while
commands with `mutates: true` are only printed as `Would run: …`. Filesystem changes in
`lib/fs-ops.ts` check `ctx.dryRun` the same way. The summary marks previewed changes as
**Would change**.

## Usage

```bash
bun run verify          # Check status (recommended first step)
bun run dry-run         # Preview every change
bun run setup           # Install everything
bun run setup:dotfiles  # Install only dotfiles (skip packages)
bun run setup:verbose   # Verbose output
bun run usage           # Show detailed help
```

Individual steps can run standalone and accept the same flags:

```bash
bun install/macos/brew.ts --dry-run
bun install/macos/macos.ts --dry-run
bun install/node.ts --dry-run
bun install/rust.ts --dry-run
```

`CONFIGS_ROOT` overrides the repo location (used by the tests to point at a fixture).

## Key Features

### Verification Mode

```bash
bun run verify
```

Output shows:
- ✓ **OK** (green): Symlink correctly points to source
- ✗ **Missing** (yellow): Symlink doesn't exist yet
- ✗ **Wrong target** (red): Symlink points to the wrong location (or nowhere)
- ✗ **Not a symlink** (red): Regular file/directory exists instead
- ✗ **Source missing** (red): Source file doesn't exist in configs
- ✗ **Stale link** (red): A symlink in `~` or `~/.config` that is dangling, or points into
  this repo but isn't in the manifest (e.g. left behind by a removed config)

It also checks the environment (tmux, bash as login shell, SSH git remote, required tools,
fzf bindings). Environment issues are reported but don't fail verification.

Exit codes:
- `0`: All symlinks are correctly configured
- `1`: Symlink issues found (run `bun run setup` to fix; remove stale links by hand)

### Idempotency and Backups

- Correct symlinks are detected and left untouched
- Anything else at a target (file, directory, wrong or dangling link) is renamed to
  `<target>.backup.<timestamp>` before the link is created
- Links are created with `symlinkSync`, so an existing directory link is never followed
  (the old `ln -s` implementation could write links *inside* the repo)

## Symlinks Created

The manifest lives in `install/symlinks.ts`.

### Home Directory
- `.bash_profile`, `.bashrc` → Bash login and interactive configuration
- `.tmux.conf` → tmux configuration
- `.vimrc` → Vim configuration
- `.lldbinit` → LLDB debugger configuration
- `.gitconfig`, `.gitignore` → Git configuration and global ignore patterns
- `.my_scripts/` → Custom shell scripts
- `.vimdid` → Neovim undo history (`home/.config/nvim/vimdid`, gitignored)

### ~/.config Directory
- `nvim/` → Neovim configuration
- `base16-shell/` → Base16 color scheme (submodule)
- `helix/` → Helix editor configuration
- `swift_po/` → Swift debugging tools (submodule)
- `starship.toml` → Starship prompt
- `stylua.toml` → StyLua (Lua formatter used by Neovim) global config

### macOS Specific
- `~/Library/Application Support/nushell/config.nu` and `env.nu`
- `~/Library/Application Support/com.mitchellh.ghostty/config` → Ghostty terminal

### Tracked but not linked
Listed in `UNLINKED_ENTRIES` in `install/symlinks.ts`: `home/Brewfile` (used by `brew.ts`),
`home/README.md`, and `home/.config/vscode` (kept for reference).

## Testing

```bash
bun run test        # unit + integration + repo hygiene, with coverage gate
bun run test:env    # opt-in, read-only checks against this machine
bun run typecheck   # tsc --noEmit
```

- **`test/unit/`**: imports every module in-process with a `FakeRunner` (scripted command
  responses + call log) and temp-dir HOME/configs roots. Each step is tested in normal and
  dry-run mode, including "no mutating command ran" assertions.
- **`test/integration/install.test.ts`**: the real CLI against a throwaway HOME and a fixture
  configs root: backups, idempotency (by inode), dangling links, concurrency, verify states.
- **`test/integration/dry-run-safety.test.ts`**: full `--dry-run` (and each standalone script)
  with stub `brew`/`pnpm`/`npm`/`rustup`/`cargo`/`defaults`/`curl`/`git` on PATH; fails if
  anything other than a read-only probe ran, or if HOME or the fixture changed.
- **`test/repo/hygiene.test.ts`**: every tracked entry in `home/` is linked or explicitly
  excluded, no self-referential symlinks, vimdid stays gitignored, the Brewfile provides every
  required tool and taps every third-party formula, no npm lifecycle scripts.
- **`test/env/`**: skipped unless `CONFIGS_ENV_TESTS=1` (set by `bun run test:env`). Runs
  everything in dry-run mode against the real machine: Brewfile audit, Brewfile installed,
  and `--verify` if this checkout is the one linked into HOME.

`bunfig.toml` sets the coverage threshold (95% lines and functions per file), enforced by
`bun run test`.

## Shell Configuration (Bash Only)

This configuration uses **bash** exclusively; there is no zsh configuration.

## Contributing

When adding new features:

1. Add symlinks to `install/symlinks.ts` (or to `UNLINKED_ENTRIES` if intentionally not linked)
2. Declare every command's `mutates` flag correctly so dry-run stays safe
3. Add unit tests in `test/unit/` (both normal and dry-run paths)
4. Run `bun run test`, `bun run typecheck`, `bun run dry-run`, and `bun run verify`

## Troubleshooting

### "Bun is not installed"
Install Bun: `curl -fsSL https://bun.sh/install | bash`

### "Source does not exist"
A manifest source is missing from `home/`. For submodules, run
`git submodule update --init --recursive`.

### "Stale link"
Remove the listed symlink by hand once you've confirmed it's not needed.

### Tests failing
Run a single file for detail: `bun test test/unit/fs-ops.test.ts`.
