import { afterEach, describe, expect, test } from "bun:test";
import { installRust, listCargoTools, listInstalledComponents, RUST_COMPONENTS } from "../../install/rust.ts";
import { cleanupTempDirs, FakeRunner, makeCtx } from "../helpers.ts";

afterEach(cleanupTempDirs);

const ALL_COMPONENTS = { stdout: "cargo-aarch64-apple-darwin\nclippy-aarch64-apple-darwin\nrust-src\nrustfmt-aarch64-apple-darwin\n" };
const CARGO_EDIT = { stdout: "cargo-edit v0.13.10:\n    cargo-add\n    cargo-rm\nzee v0.1.2:\n    zee\n" };

/** A machine with rustup, all components and cargo-edit already installed */
const upToDate = () =>
  new FakeRunner(new Set(["rustup"])).on("rustup component list", ALL_COMPONENTS).on("cargo install --list", CARGO_EDIT);

describe("probes", () => {
  test("listInstalledComponents parses lines and tolerates errors", async () => {
    expect(await listInstalledComponents(makeCtx({ fake: upToDate() }))).toHaveLength(4);
    expect(await listInstalledComponents(makeCtx({ fake: new FakeRunner().on("rustup", { exitCode: 1 }) }))).toEqual([]);
  });

  test("listCargoTools reads crate names, not binaries", async () => {
    expect([...(await listCargoTools(makeCtx({ fake: upToDate() })))]).toEqual(["cargo-edit", "zee"]);
  });
});

describe("installRust", () => {
  test("up to date: updates stable, re-adds components, installs nothing new", async () => {
    const fake = upToDate();
    const result = await installRust(makeCtx({ fake }));
    expect(result.ok).toBe(true);
    expect(fake.mutatingCommands()).toEqual(["rustup update stable", `rustup component add ${RUST_COMPONENTS.join(" ")}`]);
    expect(result.changes?.every((c) => c.status === "unchanged")).toBe(true);
  });

  test("installs missing components and cargo tools", async () => {
    let listed = 0;
    const fake = new FakeRunner(new Set(["rustup"])).on("rustup component list", () =>
      listed++ === 0 ? { stdout: "rust-src\n" } : ALL_COMPONENTS,
    );
    const result = await installRust(makeCtx({ fake }));
    expect(fake.mutatingCommands()).toContain("cargo install cargo-edit");
    expect(result.changes?.map((c) => [c.name, c.status])).toEqual([
      ["rustup", "unchanged"],
      ["rust-src", "unchanged"],
      ["clippy", "created"],
      ["rustfmt", "created"],
      ["cargo-edit", "created"],
    ]);
  });

  test("flags components still missing after add, and failed cargo installs", async () => {
    const fake = new FakeRunner(new Set(["rustup"])).on("cargo install cargo-edit", { exitCode: 1 });
    const result = await installRust(makeCtx({ fake }));
    expect(result.changes?.filter((c) => c.status === "failed").map((c) => c.name)).toEqual([...RUST_COMPONENTS, "cargo-edit"]);
  });

  test("removes deprecated components", async () => {
    const fake = new FakeRunner(new Set(["rustup"]))
      .on("rustup component list", { stdout: ALL_COMPONENTS.stdout + "rls-aarch64-apple-darwin\nrust-analysis-aarch64\n" })
      .on("rustup component remove rust-analysis", { exitCode: 1 })
      .on("cargo install --list", CARGO_EDIT);
    const result = await installRust(makeCtx({ fake }));
    expect(fake.mutatingCommands()).toContain("rustup component remove rls");
    expect(result.changes?.filter((c) => c.category === "Cleanup").map((c) => [c.name, c.status])).toEqual([
      ["rls", "replaced"],
      ["rust-analysis", "failed"],
    ]);
  });

  test("stops when rustup update fails", async () => {
    const fake = new FakeRunner(new Set(["rustup"])).on("rustup update", { exitCode: 1 });
    const result = await installRust(makeCtx({ fake }));
    expect(result).toMatchObject({ ok: false, error: "rustup update stable failed" });
  });

  test("installs rustup when missing and adds ~/.cargo/bin to PATH", async () => {
    const fake = new FakeRunner();
    const ctx = makeCtx({ fake, env: { PATH: "/usr/bin" } });
    const result = await installRust(ctx);
    expect(fake.mutatingCommands()[0]).toStartWith("/bin/sh -c curl --proto '=https'");
    // rustup must not append to ~/.bashrc / ~/.bash_profile: they're symlinks into the repo
    expect(fake.mutatingCommands()[0]).toEndWith("sh -s -- -y --no-modify-path");
    expect(result.changes?.[0]).toEqual({ category: "Package step", name: "rustup", status: "created" });
    expect(ctx.env.PATH).toBe(`${ctx.home}/.cargo/bin:/usr/bin`);
  });

  test("handles an unset PATH when adding cargo", async () => {
    const ctx = makeCtx({ fake: new FakeRunner(), env: { PATH: undefined } });
    await installRust(ctx);
    expect(ctx.env.PATH).toBe(`${ctx.home}/.cargo/bin:`);
  });

  test("stops when the rustup installer fails", async () => {
    const fake = new FakeRunner().on("/bin/sh", { exitCode: 1 });
    const result = await installRust(makeCtx({ fake }));
    expect(result).toMatchObject({ ok: false, error: "rustup install failed" });
    expect(fake.calls).toHaveLength(1);
  });

  test("dry-run with rustup missing plans everything and runs nothing", async () => {
    const fake = new FakeRunner();
    const result = await installRust(makeCtx({ dryRun: true, fake }));
    expect(fake.calls).toEqual([]);
    expect(result.changes?.map((c) => c.status)).toEqual(["planned", "planned", "planned", "planned", "planned"]);
  });

  test("dry-run plans missing components, removals and cargo tools using probes only", async () => {
    const fake = new FakeRunner(new Set(["rustup"])).on("rustup component list", { stdout: "rust-src\nrls-x\n" });
    const ctx = makeCtx({ dryRun: true, fake });
    const result = await installRust(ctx);

    expect(fake.mutatingCommands()).toEqual([]);
    expect(result.changes?.map((c) => [c.name, c.status])).toEqual([
      ["rustup", "unchanged"],
      ["rls", "planned"],
      ["rust-src", "unchanged"],
      ["clippy", "planned"],
      ["rustfmt", "planned"],
      ["cargo-edit", "planned"],
    ]);
    expect(ctx.logger.text()).toContain("Would run: rustup update stable");
  });
});
