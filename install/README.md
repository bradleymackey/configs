# Installation Scripts

TypeScript modules for installing and configuring development tools and dotfiles.
See `INSTALLATION.md` at the repo root for the full picture.

## Usage

### Running as Scripts

Every module runs standalone and accepts `--dry-run` and `--verbose`:

```bash
# Install everything
bun install/install.ts

# Preview every change (nothing is modified)
bun install/install.ts --dry-run

# Only create symlinks
bun install/install.ts --skip-packages

# Verify installation status
bun install/install.ts --verify

# Individual steps
bun install/node.ts --dry-run
bun install/rust.ts --dry-run
bun install/macos/brew.ts --dry-run
bun install/macos/macos.ts --dry-run
```

### Using as Modules

Every step takes a `Context` and returns a `StepResult` (`{ ok, changes?, error? }`):

```typescript
import { createContext } from "./install/lib/context.ts";
import { runStep } from "./install/lib/step.ts";
import { renderSummary } from "./install/lib/summary.ts";
import { installRust } from "./install/rust.ts";

const ctx = createContext({ dryRun: true, verbose: false }, { ...process.env });
await runStep(ctx, "Rust toolchain", () => installRust(ctx));
console.log(renderSummary(ctx.summary));
```

## Module Exports

| Module | Step | Notes |
|---|---|---|
| `node.ts` | `syncNodePackages(ctx)` | `auditNodePackages` (drops/uninstalls deprecated) then `installNodePackages` |
| `rust.ts` | `installRust(ctx)` | rustup, components, deprecated component removal, `cargo-edit` |
| `macos/brew.ts` | `installBrew(ctx)`, `auditBrewfile(ctx)` | also `parseBrewfile`, `parseBundleCheck` |
| `macos/macos.ts` | `setupMacOS(ctx)` | reads each `defaults` value first; only writes differences |
| `verify.ts` | `runVerify(ctx)` | also `findStaleLinks`, `REQUIRED_TOOLS` |
| `symlinks.ts` | `getSymlinks(root, home, platform)` | the manifest, plus `UNLINKED_ENTRIES` |

## Rules for new code

1. Run commands only through `ctx.runner.run(cmd, { mutates })`, and declare `mutates`
   honestly: the dry-run runner skips mutating commands and runs read-only probes.
2. Make filesystem changes through `lib/fs-ops.ts`, or check `ctx.dryRun` first.
3. In dry-run mode, report planned changes with status `"planned"`.
4. Never read or write `process.env` inside a step; use `ctx.env`.
5. Guard the entry point with `if (import.meta.main)` and use `runStandalone`.

## Testing

Use `makeCtx` and `FakeRunner` from `test/helpers.ts`:

```typescript
import { FakeRunner, makeCtx } from "../helpers.ts";
import { installRust } from "../../install/rust.ts";

test("dry-run runs only probes", async () => {
  const fake = new FakeRunner(new Set(["rustup"]));
  await installRust(makeCtx({ dryRun: true, fake }));
  expect(fake.mutatingCommands()).toEqual([]);
});
```
