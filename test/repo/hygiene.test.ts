/**
 * Read-only checks on the repo itself: the manifest covers what's tracked,
 * nothing pollutes the tree, and the Brewfile provides what the configs need.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, lstatSync, readdirSync, readlinkSync } from "fs";
import { dirname, join, relative, resolve } from "path";
import { parseBrewfile } from "../../install/macos/brew.ts";
import { getSymlinks, UNLINKED_ENTRIES } from "../../install/symlinks.ts";
import { REQUIRED_TOOLS } from "../../install/verify.ts";
import { REPO_ROOT } from "../helpers.ts";

const HOME_DIR = join(REPO_ROOT, "home");

function git(...args: string[]): { exitCode: number; stdout: string } {
  const result = Bun.spawnSync(["git", "-C", REPO_ROOT, ...args]);
  return { exitCode: result.exitCode, stdout: result.stdout.toString() };
}

/** Top-level entry (home/<x> or home/.config/<x>) for a tracked path */
function topLevelEntry(path: string): string {
  const parts = path.split("/");
  return parts[1] === ".config" ? parts.slice(0, 3).join("/") : parts.slice(0, 2).join("/");
}

describe("repo hygiene", () => {
  test("no symlink under home/ points back at one of its own ancestors", () => {
    const loops: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = lstatSync(full);
        if (stat.isSymbolicLink()) {
          const target = resolve(dirname(full), readlinkSync(full));
          if (full.startsWith(target + "/")) loops.push(relative(REPO_ROOT, full));
        } else if (stat.isDirectory() && entry !== ".git") {
          walk(full);
        }
      }
    };
    walk(HOME_DIR);
    // The old `ln -s` installer created home/.config/nvim/nvim etc. this way
    expect(loops).toEqual([]);
  });

  test("every tracked entry in home/ is either symlinked or explicitly excluded", () => {
    const tracked = git("ls-files", "home").stdout.split("\n").filter(Boolean);
    const sources = getSymlinks(REPO_ROOT, "/home", "darwin").map((l) => relative(REPO_ROOT, l.source));
    const covered = (entry: string) =>
      entry in UNLINKED_ENTRIES || sources.some((s) => s === entry || s.startsWith(entry + "/") || entry.startsWith(s + "/"));

    const entries = [...new Set(tracked.map(topLevelEntry))];
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.filter((e) => !covered(e))).toEqual([]);
  });

  test("every manifest source and excluded entry exists in the repo", () => {
    for (const { source } of getSymlinks(REPO_ROOT, "/home", "darwin")) expect(existsSync(source)).toBe(true);
    for (const entry of Object.keys(UNLINKED_ENTRIES)) expect(existsSync(join(REPO_ROOT, entry))).toBe(true);
  });

  test("nvim undo history (vimdid) stays out of git", () => {
    expect(existsSync(join(HOME_DIR, ".config", "nvim", "vimdid"))).toBe(true);
    const ignored = git("check-ignore", "-q", "home/.config/nvim/vimdid/%Users%someone%file.txt");
    expect(ignored.exitCode).toBe(0);
  });

  test("package.json has no npm lifecycle scripts (`bun install` must never run the installer)", async () => {
    const { scripts } = await Bun.file(join(REPO_ROOT, "package.json")).json();
    const lifecycle = ["preinstall", "install", "postinstall", "prepublish", "preprepare", "prepare", "postprepare"];
    expect(Object.keys(scripts).filter((s) => lifecycle.includes(s))).toEqual([]);
  });
});

describe("Brewfile", () => {
  const brewfile = () => Bun.file(join(HOME_DIR, "Brewfile")).text().then(parseBrewfile);

  test("provides every Homebrew tool that verify requires", async () => {
    const { formulae } = await brewfile();
    const needed = Object.values(REQUIRED_TOOLS)
      .filter((p) => p.startsWith("brew:"))
      .map((p) => p.slice("brew:".length));
    expect(needed.filter((f) => !formulae.includes(f))).toEqual([]);
  });

  test("taps every third-party formula it installs", async () => {
    const { taps, formulae } = await brewfile();
    const needed = formulae.filter((f) => f.split("/").length === 3).map((f) => f.split("/").slice(0, 2).join("/"));
    expect(needed.filter((t) => !taps.includes(t))).toEqual([]);
  });

  test("has no duplicate entries", async () => {
    const { taps, formulae, casks } = await brewfile();
    for (const list of [taps, formulae, casks]) expect(new Set(list).size).toBe(list.length);
  });
});
