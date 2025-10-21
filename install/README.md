# Installation Scripts

This directory contains TypeScript modules for installing and configuring development tools and dotfiles.

## Usage

### Running as Scripts

All modules can be run directly as standalone scripts:

```bash
# Install everything
bun install/install.ts

# Dry-run mode (preview changes)
bun install/install.ts --dry-run

# Skip package installations (only create symlinks)
bun install/install.ts --skip-packages

# Verify installation status
bun install/install.ts --verify

# Individual package installers
bun install/node.ts
bun install/rust.ts
bun install/macos/brew.ts
bun install/macos/macos.ts
```

### Using as Modules

All installation scripts export functions that can be imported and called directly:

```typescript
import { installNodePackages } from "./install/node.ts";
import { installRust } from "./install/rust.ts";
import { installBrew } from "./install/macos/brew.ts";
import { setupMacOS } from "./install/macos/macos.ts";

// Call functions directly
try {
  await installNodePackages();
  await installRust();
  
  if (process.platform === "darwin") {
    await setupMacOS();
    await installBrew("/path/to/configs");
  }
} catch (error) {
  console.error("Installation failed:", error);
}
```

## Module Exports

### `install/node.ts`
- **Function**: `installNodePackages(): Promise<void>`
- **Description**: Installs global Node.js packages via pnpm
- **Throws**: Error if installation fails

### `install/rust.ts`
- **Function**: `installRust(): Promise<void>`
- **Description**: Installs Rust toolchain and components via rustup
- **Throws**: Error if installation fails

### `install/macos/brew.ts`
- **Function**: `installBrew(configsRoot?: string): Promise<void>`
- **Description**: Installs Homebrew and packages from Brewfile
- **Parameters**: 
  - `configsRoot` (optional): Path to configs repository root
- **Throws**: Error if installation fails

### `install/macos/macos.ts`
- **Function**: `setupMacOS(): Promise<void>`
- **Description**: Applies macOS system settings (Dock, keyboard)
- **Throws**: Error if configuration fails

## Testing

When writing tests, you can import and call functions directly instead of spawning scripts:

```typescript
import { installNodePackages } from "../install/node.ts";

test("should install node packages", async () => {
  // Mock or stub the function as needed
  await installNodePackages();
});
```

## Architecture

Each script follows this pattern:

1. **Export a main function** with descriptive name
2. **Check `import.meta.main`** to determine if running standalone
3. **Handle errors appropriately**:
   - When imported: throw errors to caller
   - When standalone: catch errors and exit with code 1

This allows scripts to be:
- ✅ Run directly from command line
- ✅ Imported and called as functions
- ✅ Easily tested without spawning processes
- ✅ Composed into larger workflows
