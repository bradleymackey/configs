import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { auditBrewfile, installBrew, parseBrewfile, parseBundleCheck } from "../../install/macos/brew.ts";
import { cleanupTempDirs, FakeRunner, makeCtx, tempDir } from "../helpers.ts";

afterEach(cleanupTempDirs);

const BREWFILE = `tap "oven-sh/bun", trusted: true
tap "potatolabs/git-redate", "https://github.com/PotatoLabs/homebrew-git-redate", trusted: true
brew "jq"
brew "luajit", args: ["HEAD"]
# brew "commented-out"
brew "oven-sh/bun/bun"
cask "ghostty"
`;

function setup(options: { dryRun?: boolean; brew?: boolean; fzf?: boolean; brewfile?: string | null } = {}) {
  const root = tempDir("configs-root-");
  mkdirSync(join(root, "home"));
  if (options.brewfile !== null) writeFileSync(join(root, "home", "Brewfile"), options.brewfile ?? BREWFILE);

  const prefix = tempDir("brew-prefix-");
  if (options.fzf ?? true) {
    mkdirSync(join(prefix, "opt", "fzf", "shell"), { recursive: true });
    writeFileSync(join(prefix, "opt", "fzf", "shell", "key-bindings.bash"), "");
  }

  const fake = new FakeRunner(new Set(options.brew === false ? [] : ["brew"])).on("brew --prefix", { stdout: `${prefix}\n` });
  const ctx = makeCtx({ dryRun: options.dryRun, configsRoot: root, fake });
  return { ctx, fake, prefix, brewfile: join(root, "home", "Brewfile") };
}

const MISSING = "brew bundle can't satisfy your Brewfile's dependencies.\n→ Formula jq needs to be installed or updated.\n→ Cask ghostty needs to be installed.\n";

describe("parseBrewfile", () => {
  test("extracts taps, formulae and casks, ignoring options and comments", () => {
    expect(parseBrewfile(BREWFILE)).toEqual({
      taps: ["oven-sh/bun", "potatolabs/git-redate"],
      formulae: ["jq", "luajit", "oven-sh/bun/bun"],
      casks: ["ghostty"],
    });
  });
});

describe("parseBundleCheck", () => {
  test("lists the entries brew bundle check says are missing", () => {
    expect(parseBundleCheck(MISSING)).toEqual(["jq", "ghostty"]);
    expect(parseBundleCheck("The Brewfile's dependencies are satisfied.")).toEqual([]);
  });
});

describe("installBrew", () => {
  test("dry-run with brew missing plans the Homebrew install and runs nothing", async () => {
    const { ctx, fake } = setup({ dryRun: true, brew: false });
    const result = await installBrew(ctx);
    expect(result.ok).toBe(true);
    expect(fake.calls).toHaveLength(0);
    expect(result.changes?.map((c) => [c.name, c.status])).toEqual([
      ["Homebrew", "planned"],
      ["Brewfile bundle", "planned"],
    ]);
    expect(ctx.logger.text()).toContain("Would run: /bin/bash -c");
  });

  test("installs Homebrew when missing and puts it on PATH for the rest of the run", async () => {
    const { ctx, fake } = setup({ brew: false });
    ctx.env.PATH = "/usr/bin";
    const result = await installBrew(ctx);
    expect(result.changes?.[0]).toEqual({ category: "Package step", name: "Homebrew", status: "created" });
    expect(fake.calls[0].opts).toMatchObject({ mutates: true });
    expect(ctx.env.PATH).toBe("/opt/homebrew/bin:/usr/bin");
  });

  test("handles an unset PATH when adding Homebrew", async () => {
    const { ctx } = setup({ brew: false });
    ctx.env = { ...ctx.env, PATH: undefined };
    await installBrew(ctx);
    expect(ctx.env.PATH).toBe("/opt/homebrew/bin:");
  });

  test("stops if the Homebrew installer fails", async () => {
    const { ctx, fake } = setup({ brew: false });
    fake.on("/bin/bash", { exitCode: 1 });
    const result = await installBrew(ctx);
    expect(result).toMatchObject({ ok: false, error: "Homebrew install failed" });
    expect(fake.calls).toHaveLength(1);
  });

  test("flags a missing Brewfile", async () => {
    const { ctx } = setup({ brewfile: null });
    const result = await installBrew(ctx);
    expect(result.changes?.at(-1)).toMatchObject({ name: "Brewfile bundle", status: "failed" });
  });

  test("runs brew bundle and reports unchanged when everything is already installed", async () => {
    const { ctx, fake, brewfile } = setup();
    const result = await installBrew(ctx);
    expect(result.ok).toBe(true);
    expect(fake.mutatingCommands()).toEqual([`brew bundle --file ${brewfile}`]);
    expect(result.changes).toEqual([
      { category: "Package step", name: "Homebrew", status: "unchanged" },
      { category: "Package step", name: "Brewfile bundle", status: "unchanged" },
      { category: "Package step", name: "fzf completions", status: "unchanged" },
    ]);
  });

  test("probes never trigger Homebrew auto-update", async () => {
    const { ctx, fake } = setup();
    await installBrew(ctx);
    for (const call of fake.calls.filter((c) => !c.opts.mutates)) {
      expect(call.opts.env).toEqual({ HOMEBREW_NO_AUTO_UPDATE: "1" });
    }
  });

  test("reports which Brewfile entries were installed", async () => {
    const { ctx, fake } = setup();
    fake.on("brew bundle check", { exitCode: 1, stdout: MISSING });
    const result = await installBrew(ctx);
    expect(result.changes?.[1]).toEqual({
      category: "Package step",
      name: "Brewfile bundle",
      status: "created",
      detail: "installed: jq, ghostty",
    });
  });

  test("reports a failing brew bundle", async () => {
    const { ctx, fake } = setup();
    fake.on("brew bundle --file", { exitCode: 1 });
    const result = await installBrew(ctx);
    expect(result.changes?.[1]).toMatchObject({ status: "failed", detail: "brew bundle returned non-zero" });
  });

  test("dry-run lists what brew bundle would install and runs only probes", async () => {
    const { ctx, fake } = setup({ dryRun: true, fzf: false });
    fake.on("brew bundle check", { exitCode: 1, stdout: MISSING });
    const result = await installBrew(ctx);

    expect(fake.mutatingCommands()).toEqual([]);
    expect(result.changes?.[1]).toMatchObject({ status: "planned", detail: "would install: jq, ghostty" });
    expect(result.changes?.[2]).toMatchObject({ name: "fzf completions", status: "planned" });
    expect(ctx.logger.text()).toContain("Would run: brew bundle --file");
    expect(ctx.logger.text()).toContain("--no-zsh --no-fish");
  });

  test("dry-run reports a satisfied Brewfile as unchanged", async () => {
    const { ctx } = setup({ dryRun: true });
    const result = await installBrew(ctx);
    expect(result.changes?.[1]).toMatchObject({ status: "unchanged", detail: "all dependencies satisfied" });
  });

  test("installs fzf bash bindings only (no zsh/fish, no rc edits)", async () => {
    const { ctx, fake, prefix } = setup({ fzf: false });
    const result = await installBrew(ctx);
    expect(fake.mutatingCommands()).toContain(
      `${join(prefix, "opt", "fzf", "install")} --key-bindings --completion --no-update-rc --no-zsh --no-fish`,
    );
    expect(result.changes?.at(-1)).toMatchObject({ name: "fzf completions", status: "created" });
  });

  test("reports a failing fzf install", async () => {
    const { ctx, fake, prefix } = setup({ fzf: false });
    fake.on(join(prefix, "opt", "fzf", "install"), { exitCode: 1 });
    const result = await installBrew(ctx);
    expect(result.changes?.at(-1)).toMatchObject({ name: "fzf completions", status: "failed" });
  });
});

describe("auditBrewfile", () => {
  const info = (formulae: object[], casks: object[] = []) => ({
    handlers: [
      ["brew info --json=v2 --cask", { stdout: JSON.stringify({ casks }) }],
      ["brew info --json=v2", { stdout: JSON.stringify({ formulae }) }],
    ] as const,
  });

  function audit(options: Parameters<typeof setup>[0], formulae: object[], casks: object[]) {
    const { ctx, fake } = setup(options);
    for (const [prefix, result] of info(formulae, casks).handlers) fake.on(prefix, result);
    return { ctx, fake, run: () => auditBrewfile(ctx) };
  }

  const healthy = [{ full_name: "jq" }, { full_name: "luajit" }, { full_name: "oven-sh/bun/bun" }];

  test("skips without a Brewfile or without brew", async () => {
    expect((await auditBrewfile(setup({ brewfile: null }).ctx)).changes?.[0]).toMatchObject({ status: "skipped", detail: "Brewfile not found" });
    expect((await auditBrewfile(setup({ brew: false }).ctx)).changes?.[0]).toMatchObject({ status: "skipped", detail: "brew not available" });
  });

  test("reports a healthy Brewfile", async () => {
    const { run, fake } = audit({}, healthy, [{ token: "ghostty" }]);
    const result = await run();
    expect(result.changes).toEqual([{ category: "Audit", name: "3 formulae · 1 casks", status: "unchanged", detail: "all healthy" }]);
    expect(fake.mutatingCommands()).toEqual([]);
  });

  test("flags deprecated and disabled entries with their replacements", async () => {
    const { run } = audit(
      {},
      [
        { full_name: "jq", deprecated: true, deprecation_replacement: "jaq" },
        { full_name: "luajit", disabled: true },
        { full_name: "oven-sh/bun/bun" },
      ],
      [{ token: "ghostty", deprecated: true }],
    );
    const result = await run();
    expect(result.changes).toEqual([
      { category: "Audit", name: "jq", status: "failed", detail: "deprecated — replacement: jaq" },
      { category: "Audit", name: "luajit", status: "failed", detail: "disabled" },
      { category: "Audit", name: "ghostty", status: "failed", detail: "deprecated" },
    ]);
  });

  test("flags entries Homebrew doesn't know about", async () => {
    const { run } = audit({}, [{ full_name: "jq" }], []);
    const names = (await run()).changes?.map((c) => `${c.name}: ${c.detail}`);
    expect(names).toEqual([
      "luajit: formula not found in Homebrew",
      "oven-sh/bun/bun: formula not found in Homebrew",
      "ghostty: cask not found in Homebrew",
    ]);
  });

  test("tolerates entries without a name and responses without a list", async () => {
    const { ctx, fake } = setup({ brewfile: 'brew "jq"\n' });
    fake.on("brew info", { stdout: JSON.stringify({ formulae: [{ full_name: "jq" }, { disabled: true }] }) });
    expect((await auditBrewfile(ctx)).changes?.[0]).toMatchObject({ name: "?", detail: "disabled" });

    const other = setup({ brewfile: 'cask "ghostty"\n' });
    other.fake.on("brew info", { stdout: "{}" });
    expect((await auditBrewfile(other.ctx)).changes?.[0]).toMatchObject({ name: "ghostty", detail: "cask not found in Homebrew" });
  });

  test("one bad entry doesn't hide the rest: a failed batch is re-checked entry by entry", async () => {
    const { ctx, fake } = setup({ brewfile: 'cask "ghostty"\ncask "flux-markdown"\ncask "iterm2"\n' });
    const untrusted = "Error: Refusing to load cask xykong/tap/flux-markdown from untrusted tap xykong/tap.\nRun `brew trust`";
    fake
      .on("brew info --json=v2 --cask ghostty flux-markdown", { exitCode: 1, stderr: untrusted })
      .on("brew info --json=v2 --cask ghostty", { stdout: JSON.stringify({ casks: [{ token: "ghostty" }] }) })
      .on("brew info --json=v2 --cask flux-markdown", { exitCode: 1, stderr: untrusted })
      .on("brew info --json=v2 --cask iterm2", { stdout: JSON.stringify({ casks: [{ token: "iterm2", deprecated: true }] }) });

    const result = await auditBrewfile(ctx);

    expect(result.changes).toEqual([
      { category: "Audit", name: "flux-markdown", status: "failed", detail: untrusted.split("\n")[0] },
      { category: "Audit", name: "iterm2", status: "failed", detail: "deprecated" },
    ]);
  });

  test("reports a single failing entry with brew's error, or a generic one", async () => {
    const { ctx, fake } = setup({ brewfile: 'brew "nope"\n' });
    fake.on("brew info", { exitCode: 1, stderr: 'Error: No available formula with the name "nope".' });
    expect((await auditBrewfile(ctx)).changes).toEqual([
      { category: "Audit", name: "nope", status: "failed", detail: 'Error: No available formula with the name "nope".' },
    ]);

    const silent = setup({ brewfile: 'brew "nope"\n' });
    silent.fake.on("brew info", { exitCode: 1 });
    expect((await auditBrewfile(silent.ctx)).changes?.[0].detail).toBe("brew info returned no JSON");
  });
});
