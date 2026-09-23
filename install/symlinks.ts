/**
 * Single source of truth for every dotfile symlink. Used by install, verify
 * and the tests, so the lists can't drift apart.
 */

import { join } from "path";
import type { SymlinkSpec } from "./lib/fs-ops.ts";

const HOME_DOTFILES = [".tmux.conf", ".my_scripts", ".bash_profile", ".bashrc", ".vimrc", ".lldbinit", ".gitconfig", ".gitignore"];

const XDG_CONFIGS = ["nvim", "base16-shell", "helix", "swift_po", "starship.toml", "stylua.toml"];

/**
 * Tracked entries in home/ and home/.config/ that are deliberately NOT
 * symlinked. Anything tracked must be in the manifest or listed here.
 */
export const UNLINKED_ENTRIES: Record<string, string> = {
  "home/Brewfile": "consumed by install/macos/brew.ts",
  "home/README.md": "documentation",
  "home/.config/vscode": "kept for reference; VS Code/VSCodium config is not managed",
};

export function getSymlinks(configsRoot: string, home: string, platform: NodeJS.Platform): SymlinkSpec[] {
  const homePath = join(configsRoot, "home");
  const configPath = join(homePath, ".config");

  const links: SymlinkSpec[] = [
    ...HOME_DOTFILES.map((f) => ({ source: join(homePath, f), target: join(home, f) })),
    ...XDG_CONFIGS.map((f) => ({ source: join(configPath, f), target: join(home, ".config", f) })),
    { source: join(configPath, "nvim", "vimdid"), target: join(home, ".vimdid") },
  ];

  if (platform === "darwin") {
    const appSupport = join(home, "Library", "Application Support");
    links.push(
      { source: join(homePath, "config.nu"), target: join(appSupport, "nushell", "config.nu") },
      { source: join(homePath, "env.nu"), target: join(appSupport, "nushell", "env.nu") },
      { source: join(configPath, "ghostty", "config"), target: join(appSupport, "com.mitchellh.ghostty", "config") },
    );
  }

  return links;
}
