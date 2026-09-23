/**
 * Verification mode: report symlink + environment status without changing anything.
 */

import { existsSync, readdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { colors, type Context } from "./lib/context.ts";
import { lexists, readLink, verifySymlink, type VerifyStatus } from "./lib/fs-ops.ts";
import { getSymlinks } from "./symlinks.ts";

/**
 * Tools the configs depend on, and where each comes from. The repo hygiene
 * test checks every `brew:` provider is actually in the Brewfile.
 */
export const REQUIRED_TOOLS: Record<string, string> = {
  brew: "homebrew",
  nvim: "brew:neovim",
  tmux: "brew:tmux",
  git: "brew:git",
  "git-lfs": "brew:git-lfs",
  rg: "brew:ripgrep",
  fzf: "brew:fzf",
  starship: "brew:starship",
  lazygit: "brew:lazygit",
  fnm: "brew:fnm",
  node: "fnm",
  pnpm: "brew:pnpm",
  deno: "brew:deno",
  bun: "brew:oven-sh/bun/bun",
  go: "brew:go",
  hx: "brew:helix",
  nu: "brew:nushell",
  stylua: "brew:stylua",
  pyenv: "brew:pyenv",
  rustup: "rust.ts",
  cargo: "rust.ts",
  rustc: "rust.ts",
};

export type StaleLink = { path: string; linkTarget: string; reason: "dangling" | "not managed by configs" };

/**
 * Symlinks in ~ and ~/.config that are dangling, or point into the configs
 * repo without being in the manifest (e.g. left behind by a removed config).
 */
export function findStaleLinks(home: string, configsRoot: string, managedTargets: Set<string>): StaleLink[] {
  const stale: StaleLink[] = [];
  for (const dir of [home, join(home, ".config")]) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries.sort()) {
      const path = join(dir, entry);
      const linkTarget = readLink(path);
      if (linkTarget === null || managedTargets.has(path)) continue;
      if (!existsSync(path)) {
        stale.push({ path, linkTarget, reason: "dangling" });
        continue;
      }
      const resolved = resolve(dirname(path), linkTarget);
      if (resolved === configsRoot || resolved.startsWith(configsRoot + "/")) {
        stale.push({ path, linkTarget, reason: "not managed by configs" });
      }
    }
  }
  return stale;
}

const ok = (m: string) => `${colors.green}✓${colors.reset} ${m}`;
const warn = (m: string) => `${colors.yellow}✗${colors.reset} ${m}`;
const bad = (m: string) => `${colors.red}✗${colors.reset} ${m}`;

/** Returns the process exit code: 1 if any symlink issue, else 0. */
export async function runVerify(ctx: Context): Promise<number> {
  const { log } = ctx;
  log.info("Running verification mode...");
  log.info(`Configs root: ${ctx.configsRoot}`);

  const counts: Record<VerifyStatus, number> = { ok: 0, missing: 0, wrong: 0, "not-symlink": 0, "source-missing": 0 };
  const links = getSymlinks(ctx.configsRoot, ctx.home, ctx.platform);

  log.plain("");
  for (const link of links) {
    const result = verifySymlink(link);
    counts[result.status]++;
    const line = result.status === "ok" ? ok(result.message) : result.status === "missing" ? warn(result.message) : bad(result.message);
    log.plain(line);
  }

  const stale = findStaleLinks(ctx.home, ctx.configsRoot, new Set(links.map((l) => l.target)));
  for (const s of stale) log.plain(bad(`Stale link: ${s.path} -> ${s.linkTarget} (${s.reason})`));

  log.plain("");
  log.info("Checking environment...");
  log.plain("");

  let envIssues = 0;
  const check = (passed: boolean, good: string, badMessage: string) => {
    log.plain(passed ? ok(`OK: ${good}`) : warn(badMessage));
    if (!passed) envIssues++;
  };

  check(Boolean(ctx.env.TMUX), "Inside tmux session", "Not inside tmux");

  const shell = ctx.env.SHELL || "";
  check(shell.endsWith("/bash"), `Default shell is bash (${shell})`, `Default shell is not bash (${shell || "unknown"})`);

  const remote = await ctx.runner.run(["git", "-C", ctx.configsRoot, "remote", "get-url", "origin"], { mutates: false });
  const url = remote.stdout.trim();
  if (remote.exitCode !== 0) check(false, "", "Could not determine git remote URL");
  else check(url.startsWith("git@"), `Git remote uses SSH (${url})`, `Git remote uses HTTPS, not SSH (${url})`);

  for (const tool of Object.keys(REQUIRED_TOOLS)) {
    check(ctx.runner.which(tool) !== null, `${tool} is installed`, `${tool} is not installed`);
  }

  if (ctx.runner.which("brew")) {
    const prefix = (await ctx.runner.run(["brew", "--prefix"], { mutates: false, env: { HOMEBREW_NO_AUTO_UPDATE: "1" } })).stdout.trim();
    check(
      lexists(join(prefix, "opt", "fzf", "shell", "key-bindings.bash")),
      "fzf shell completions installed",
      "fzf shell completions not installed (run: $(brew --prefix)/opt/fzf/install)",
    );
  }

  log.plain("");
  log.plain("Symlinks:");
  log.plain(`  ${colors.green}${counts.ok} OK${colors.reset}`);
  const issueLines: [number, string, string][] = [
    [counts.missing, "Missing", colors.yellow],
    [counts.wrong, "Wrong target", colors.red],
    [counts["not-symlink"], "Not a symlink", colors.red],
    [counts["source-missing"], "Source missing", colors.red],
    [stale.length, "Stale link", colors.red],
  ];
  for (const [count, label, color] of issueLines) {
    if (count > 0) log.plain(`  ${color}${count} ${label}${colors.reset}`);
  }

  log.plain("");
  log.plain("Environment:");
  log.plain(
    envIssues > 0
      ? `  ${colors.yellow}${envIssues} issue${envIssues === 1 ? "" : "s"}${colors.reset}`
      : `  ${colors.green}All checks passed${colors.reset}`,
  );

  log.plain("");
  const symlinkIssues = counts.missing + counts.wrong + counts["not-symlink"] + counts["source-missing"] + stale.length;
  if (symlinkIssues > 0) {
    log.info("Run 'bun run setup' to fix missing or incorrect symlinks (remove stale links by hand)");
    return 1;
  }
  log.success(envIssues > 0 ? "All symlinks are correctly configured!" : "All checks passed!");
  return 0;
}
