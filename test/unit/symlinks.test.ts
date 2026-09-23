import { describe, expect, test } from "bun:test";
import { getSymlinks } from "../../install/symlinks.ts";

const ROOT = "/configs";
const HOME = "/Users/me";

describe("getSymlinks", () => {
  test("links the shell, editor and tool configs on every platform", () => {
    const targets = getSymlinks(ROOT, HOME, "linux").map((l) => l.target);
    expect(targets).toEqual([
      "/Users/me/.tmux.conf",
      "/Users/me/.my_scripts",
      "/Users/me/.bash_profile",
      "/Users/me/.bashrc",
      "/Users/me/.vimrc",
      "/Users/me/.lldbinit",
      "/Users/me/.gitconfig",
      "/Users/me/.gitignore",
      "/Users/me/.config/nvim",
      "/Users/me/.config/base16-shell",
      "/Users/me/.config/helix",
      "/Users/me/.config/swift_po",
      "/Users/me/.config/starship.toml",
      "/Users/me/.config/stylua.toml",
      "/Users/me/.vimdid",
    ]);
  });

  test("adds nushell and Ghostty configs on macOS", () => {
    const darwin = getSymlinks(ROOT, HOME, "darwin");
    expect(darwin.slice(-3)).toEqual([
      { source: "/configs/home/config.nu", target: "/Users/me/Library/Application Support/nushell/config.nu" },
      { source: "/configs/home/env.nu", target: "/Users/me/Library/Application Support/nushell/env.nu" },
      {
        source: "/configs/home/.config/ghostty/config",
        target: "/Users/me/Library/Application Support/com.mitchellh.ghostty/config",
      },
    ]);
  });

  test("every source lives in the repo's home/ and every target in HOME, without duplicates", () => {
    const links = getSymlinks(ROOT, HOME, "darwin");
    for (const { source, target } of links) {
      expect(source.startsWith("/configs/home/")).toBe(true);
      expect(target.startsWith("/Users/me/")).toBe(true);
    }
    expect(new Set(links.map((l) => l.target)).size).toBe(links.length);
  });

  test("vimdid (nvim undo history) keeps its ~/.vimdid link", () => {
    expect(getSymlinks(ROOT, HOME, "linux")).toContainEqual({
      source: "/configs/home/.config/nvim/vimdid",
      target: "/Users/me/.vimdid",
    });
  });
});
