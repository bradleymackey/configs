import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { safeSymlink } from "../../install/lib/fs-ops.ts";
import { getSymlinks } from "../../install/symlinks.ts";
import { findStaleLinks, REQUIRED_TOOLS, runVerify } from "../../install/verify.ts";
import { cleanupTempDirs, FakeRunner, makeCtx, makeFixtureRoot, tempDir } from "../helpers.ts";

afterEach(cleanupTempDirs);

describe("findStaleLinks", () => {
  test("reports dangling links and unmanaged links into the configs root", () => {
    const home = tempDir();
    const root = makeFixtureRoot();
    mkdirSync(join(home, ".config"));
    symlinkSync(join(root, "home", ".config", "old-terminal"), join(home, ".config", "old-terminal")); // removed config
    symlinkSync("configs/home/.config/stylua", join(home, ".config", "stylua")); // broken relative link
    symlinkSync(join(root, "home", ".vimrc"), join(home, ".old-vimrc")); // valid, but not in the manifest
    symlinkSync(join(root, "home", ".bashrc"), join(home, ".bashrc")); // managed
    symlinkSync("/usr/bin", join(home, "bin")); // unrelated, valid
    symlinkSync(root, join(home, "configs-link")); // the root itself
    writeFileSync(join(home, "plain"), "");

    const stale = findStaleLinks(home, root, new Set([join(home, ".bashrc")]));

    expect(stale.map((s) => [s.path.slice(home.length), s.reason])).toEqual([
      ["/.old-vimrc", "not managed by configs"],
      ["/configs-link", "not managed by configs"],
      ["/.config/old-terminal", "dangling"],
      ["/.config/stylua", "dangling"],
    ]);
  });

  test("copes with a missing ~/.config", () => {
    expect(findStaleLinks(tempDir(), "/configs", new Set())).toEqual([]);
  });
});

describe("REQUIRED_TOOLS", () => {
  test("covers the tools the shell and editor configs rely on", () => {
    for (const tool of ["nvim", "tmux", "git-lfs", "hx", "nu", "stylua", "starship", "fnm", "pyenv", "go"]) {
      expect(REQUIRED_TOOLS).toHaveProperty(tool);
    }
  });
});

describe("runVerify", () => {
  const ALL_TOOLS = new Set([...Object.keys(REQUIRED_TOOLS)]);

  function setup(options: { tools?: Set<string>; env?: Record<string, string>; remote?: object; fzf?: boolean } = {}) {
    const root = makeFixtureRoot();
    const fake = new FakeRunner(options.tools ?? ALL_TOOLS).on("git -C", options.remote ?? { stdout: "git@github.com:me/configs.git\n" });
    const ctx = makeCtx({ configsRoot: root, fake, env: { TMUX: "1", SHELL: "/bin/bash", ...options.env } });
    if (options.fzf ?? true) writeFileSync(join(ctx.home, ".fzf.bash"), "");
    const install = () => {
      for (const link of getSymlinks(root, ctx.home, ctx.platform)) safeSymlink(makeCtx({ home: ctx.home, configsRoot: root }), link);
    };
    return { ctx, fake, root, install };
  }

  test("passes everything on a fully configured machine", async () => {
    const { ctx, fake, install } = setup();
    install();
    expect(await runVerify(ctx)).toBe(0);
    expect(ctx.logger.text()).toContain("All checks passed!");
    expect(fake.mutatingCommands()).toEqual([]);
  });

  test("environment issues are reported but don't fail verification", async () => {
    const { ctx, install } = setup({
      tools: new Set(["brew"]),
      env: { TMUX: "", SHELL: "/bin/zsh" },
      remote: { stdout: "https://github.com/me/configs.git\n" },
      fzf: false,
    });
    install();

    expect(await runVerify(ctx)).toBe(0);
    const text = ctx.logger.text();
    expect(text).toContain("Not inside tmux");
    expect(text).toContain("Default shell is not bash (/bin/zsh)");
    expect(text).toContain("Git remote uses HTTPS, not SSH");
    expect(text).toContain("nvim is not installed");
    expect(text).toContain("fzf shell completions not installed");
    expect(text).toContain("All symlinks are correctly configured!");
  });

  test("handles an unknown shell, an unreadable remote and no brew", async () => {
    const tools = new Set([...ALL_TOOLS].filter((t) => t !== "brew"));
    const { ctx, install } = setup({ tools, env: { SHELL: "" }, remote: { exitCode: 128 } });
    install();
    expect(await runVerify(ctx)).toBe(0);
    expect(ctx.logger.text()).toContain("Default shell is not bash (unknown)");
    expect(ctx.logger.text()).toContain("Could not determine git remote URL");
    expect(ctx.logger.text()).not.toContain("fzf shell completions");
    expect(ctx.logger.text()).toContain("3 issues");
  });

  test("fails with a count per problem type", async () => {
    const { ctx, root, install } = setup();
    install();
    rmSync(join(ctx.home, ".bashrc"));
    symlinkSync("/wrong", join(ctx.home, ".bashrc"));
    rmSync(join(ctx.home, ".vimrc"));
    writeFileSync(join(ctx.home, ".vimrc"), "");
    rmSync(join(ctx.home, ".tmux.conf"));
    rmSync(join(root, "home", ".lldbinit"));
    symlinkSync(join(root, "home", "gone"), join(ctx.home, ".stale"));

    expect(await runVerify(ctx)).toBe(1);
    const text = ctx.logger.text();
    for (const line of ["1 Missing", "1 Wrong target", "1 Not a symlink", "1 Source missing", "1 Stale link"]) {
      expect(text).toContain(line);
    }
    expect(text).toContain("Run 'bun run setup' to fix");
  });
});
