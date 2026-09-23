/**
 * Command execution. Every call site declares whether the command mutates
 * the system; the dry-run runner refuses to execute mutating commands, which
 * is what makes `--dry-run` safe for every install step.
 */

export type Env = Record<string, string | undefined>;

export type RunOptions = {
  /** true if the command changes the system (installs, writes, deletes) */
  mutates: boolean;
  /** stream output to the terminal instead of capturing it */
  stream?: boolean;
  /** extra environment variables for this command */
  env?: Env;
};

export type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export interface Runner {
  run(cmd: string[], opts: RunOptions): Promise<RunResult>;
  which(bin: string): string | null;
}

export function formatCommand(cmd: string[]): string {
  return cmd.map((part) => (/^[\w@%+=:,./-]+$/.test(part) ? part : JSON.stringify(part))).join(" ");
}

/**
 * Runs real commands. `env` is read live on every call so a step can extend
 * PATH (e.g. after installing Homebrew) and later commands see it.
 */
export function createShellRunner(env: Env): Runner {
  const which = (bin: string) => Bun.which(bin, { PATH: env.PATH ?? "" });

  return {
    which,
    async run(cmd, opts) {
      const [bin, ...args] = cmd;
      const resolved = bin.includes("/") ? bin : which(bin);
      if (!resolved) {
        return { exitCode: 127, stdout: "", stderr: `command not found: ${bin}` };
      }
      let proc;
      try {
        proc = Bun.spawn([resolved, ...args], {
          env: { ...env, ...opts.env },
          stdin: "ignore",
          stdout: opts.stream ? "inherit" : "pipe",
          stderr: opts.stream ? "inherit" : "pipe",
        });
      } catch (error) {
        // e.g. an absolute path that doesn't exist
        return { exitCode: 127, stdout: "", stderr: error instanceof Error ? error.message : String(error) };
      }
      const [stdout, stderr, exitCode] = await Promise.all([
        opts.stream ? "" : new Response(proc.stdout as ReadableStream).text(),
        opts.stream ? "" : new Response(proc.stderr as ReadableStream).text(),
        proc.exited,
      ]);
      return { exitCode, stdout, stderr };
    },
  };
}

/**
 * Wraps a runner so read-only probes still run (dry-run output is based on
 * real state) but mutating commands are only reported.
 */
export function createDryRunRunner(inner: Runner, report: (message: string) => void): Runner {
  return {
    which: (bin) => inner.which(bin),
    async run(cmd, opts) {
      if (opts.mutates) {
        report(`Would run: ${formatCommand(cmd)}`);
        return { exitCode: 0, stdout: "", stderr: "" };
      }
      return inner.run(cmd, opts);
    },
  };
}
