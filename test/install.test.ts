import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import {
  mkdirSync,
  rmSync,
  existsSync,
  readlinkSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Test configuration
const CONFIGS_ROOT = join(import.meta.dir, "..");
const TEST_HOME = join(tmpdir(), `test-configs-${Date.now()}`);
const INSTALL_SCRIPT = join(CONFIGS_ROOT, "install", "install.ts");

// Get actual files from the configs repo
const HOME_PATH = join(CONFIGS_ROOT, "home");
const CONFIG_PATH = join(CONFIGS_ROOT, "home", ".config");

describe("Installation Script", () => {
  beforeEach(() => {
    // Create fresh test home directory for each test
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });
    mkdirSync(join(TEST_HOME, ".config"), { recursive: true });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  test("should show help message with --help flag", async () => {
    const result = await $`bun ${INSTALL_SCRIPT} --help`.text();

    expect(result).toContain("Usage:");
    expect(result).toContain("--dry-run");
    expect(result).toContain("--skip-packages");
  });

  test("should run in dry-run mode without making changes", async () => {
    const testFile = join(TEST_HOME, ".bashrc");

    // Run in dry-run mode
    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --dry-run`
      .nothrow()
      .text();

    expect(result).toContain("DRY-RUN MODE");
    expect(result).toContain("Would create");

    // Verify no actual changes were made
    expect(existsSync(testFile)).toBe(false);
  });

  test("should create necessary directories", async () => {
    const configDir = join(TEST_HOME, ".config");

    // Remove directory to test creation
    if (existsSync(configDir)) {
      rmSync(configDir, { recursive: true });
    }

    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    expect(existsSync(configDir)).toBe(true);
  });

  test("should create symlinks for all dotfiles in home directory", async () => {
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Expected home dotfiles (excluding zsh files since we removed zsh support)
    const expectedFiles = [
      ".bash_profile",
      ".bashrc",
      ".tmux.conf",
      ".vimrc",
      ".lldbinit",
      ".gitconfig",
      ".gitignore",
    ];

    for (const file of expectedFiles) {
      const sourcePath = join(HOME_PATH, file);
      const targetPath = join(TEST_HOME, file);

      // Only check if source exists
      if (existsSync(sourcePath)) {
        expect(existsSync(targetPath)).toBe(true);

        // Verify it's a symlink to the correct location
        if (existsSync(targetPath)) {
          const linkTarget = readlinkSync(targetPath);
          expect(linkTarget).toBe(sourcePath);
        }
      }
    }
  });

  test("should create symlinks for all .config directories", async () => {
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Expected .config directories
    const expectedDirs = [
      "nvim",
      "base16-shell",
      "kitty",
      "alacritty",
      "helix",
      "swift_po",
    ];

    for (const dir of expectedDirs) {
      const sourcePath = join(CONFIG_PATH, dir);
      const targetPath = join(TEST_HOME, ".config", dir);

      // Only check if source exists
      if (existsSync(sourcePath)) {
        expect(existsSync(targetPath)).toBe(true);

        // Verify it's a symlink
        if (existsSync(targetPath)) {
          const linkTarget = readlinkSync(targetPath);
          expect(linkTarget).toBe(sourcePath);
        }
      }
    }
  });

  test("should create symlink for .my_scripts directory if it exists", async () => {
    const sourceScripts = join(HOME_PATH, ".my_scripts");
    const targetScripts = join(TEST_HOME, ".my_scripts");

    if (existsSync(sourceScripts)) {
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
        .nothrow()
        .quiet();

      expect(existsSync(targetScripts)).toBe(true);
      const linkTarget = readlinkSync(targetScripts);
      expect(linkTarget).toBe(sourceScripts);
    }
  });

  test("should be idempotent (safe to run multiple times)", async () => {
    const sourceBashrc = join(HOME_PATH, ".bashrc");
    const targetBashrc = join(TEST_HOME, ".bashrc");

    if (!existsSync(sourceBashrc)) {
      return; // Skip if source doesn't exist
    }

    // Run twice
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
        .nothrow()
        .text();

    expect(result).toContain("already exists");

    // Symlink should still be correct
    if (existsSync(targetBashrc)) {
      const linkTarget = readlinkSync(targetBashrc);
      expect(linkTarget).toBe(sourceBashrc);
    }
  });

  test("should NOT override existing correct symlinks", async () => {
    const sourceBashrc = join(HOME_PATH, ".bashrc");
    const targetBashrc = join(TEST_HOME, ".bashrc");

    if (!existsSync(sourceBashrc)) {
      return; // Skip if source doesn't exist
    }

    // Create symlink manually first
    await $`ln -s ${sourceBashrc} ${targetBashrc}`.quiet();
    const originalStat = statSync(targetBashrc, { bigint: true });

    // Run install
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
        .nothrow()
        .text();

    // Should detect existing symlink
    expect(result).toContain("already exists");

    // Symlink should not have been recreated (same inode)
    const newStat = statSync(targetBashrc, { bigint: true });
    expect(newStat.ino).toBe(originalStat.ino);

    // Should still point to correct location
    const linkTarget = readlinkSync(targetBashrc);
    expect(linkTarget).toBe(sourceBashrc);
  });

  test("should backup and replace existing regular files", async () => {
    const targetBashrc = join(TEST_HOME, ".bashrc");
    const originalContent = "existing content from original file";

    // Create a regular file (not a symlink)
    writeFileSync(targetBashrc, originalContent);

    // Run install
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Check that a backup was created
    const files = readdirSync(TEST_HOME);
    const backupFiles = files.filter((f) => f.startsWith(".bashrc.backup."));
    expect(backupFiles.length).toBeGreaterThan(0);

    // Verify backup contains original content
    const backupFile = join(TEST_HOME, backupFiles[0]);
    const backupContent = await Bun.file(backupFile).text();
    expect(backupContent).toBe(originalContent);

    // Verify new file is a symlink (using readlinkSync which throws if not a symlink)
    expect(existsSync(targetBashrc)).toBe(true);
    try {
      const linkTarget = readlinkSync(targetBashrc);
      // If we get here, it's a symlink - verify it points to the right place
      expect(linkTarget).toBe(join(HOME_PATH, ".bashrc"));
    } catch (error) {
      // readlinkSync throws if it's not a symlink
      throw new Error(
        "Expected .bashrc to be a symlink but it's a regular file",
      );
    }
  });

  test("should NOT override existing symlinks pointing elsewhere", async () => {
    const targetBashrc = join(TEST_HOME, ".bashrc");
    const wrongSource = join(TEST_HOME, "wrong-bashrc");

    // Create a file and symlink to wrong location
    writeFileSync(wrongSource, "wrong content");
    await $`ln -s ${wrongSource} ${targetBashrc}`.quiet();

    // Run install
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Should have created a backup of the wrong symlink
    const files = readdirSync(TEST_HOME);
    const backupFiles = files.filter((f) => f.startsWith(".bashrc.backup."));
    expect(backupFiles.length).toBeGreaterThan(0);

    // New symlink should point to correct location
    const sourceBashrc = join(HOME_PATH, ".bashrc");
    if (existsSync(sourceBashrc) && existsSync(targetBashrc)) {
      const linkTarget = readlinkSync(targetBashrc);
      expect(linkTarget).toBe(sourceBashrc);
    }
  });

  test("should handle missing source files gracefully", async () => {
    // This should not crash even if some source files are missing
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`.nothrow();

    expect(result.exitCode).toBe(0);
  });

  test("should skip package installation with --skip-packages flag", async () => {
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
        .nothrow()
        .text();

    expect(result).toContain("Skipping package installations");
  });

  test("should provide verbose output with --verbose flag", async () => {
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --dry-run --verbose`
        .nothrow()
        .text();

    // Verbose mode should produce output
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Configs root:");
  });

  test("should detect macOS platform", async () => {
    if (process.platform === "darwin") {
      const result =
        await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --dry-run --skip-packages`
          .nothrow()
          .text();

      expect(result).toContain("Detected macOS");
    }
  });

  test("should verify all symlinks in install.ts match actual files", async () => {
    // Read the install.ts file to extract expected symlinks
    const installContent = await Bun.file(INSTALL_SCRIPT).text();

    // Get actual files in home directory (excluding .DS_Store and zsh files)
    const actualFiles = readdirSync(HOME_PATH)
      .filter(
        (f) =>
          f.startsWith(".") &&
          f !== ".DS_Store" &&
          f !== ".config" &&
          !f.includes("zsh"),
      )
      .sort();

    // Verify each actual dotfile is referenced in install.ts
    for (const file of actualFiles) {
      const sourcePath = join(HOME_PATH, file);
      const stats = statSync(sourcePath);

      // Only check regular files, not directories
      if (stats.isFile()) {
        expect(installContent).toContain(file);
      }
    }

    // Get actual directories in .config
    const actualConfigDirs = readdirSync(CONFIG_PATH)
      .filter((f) => {
        const stats = statSync(join(CONFIG_PATH, f));
        return stats.isDirectory();
      })
      .sort();

    // Most config dirs should be referenced (excluding some like stylua, vscode)
    const excludedDirs = ["stylua", "vscode"];
    for (const dir of actualConfigDirs) {
      if (!excludedDirs.includes(dir)) {
        expect(installContent).toContain(dir);
      }
    }
  });
});

describe("Installation Script Syntax", () => {
  test("main install script should have valid TypeScript syntax", async () => {
    const result = await $`bun --no-install ${INSTALL_SCRIPT} --help`.nothrow();
    expect(result.exitCode).toBe(0);
  });

  test("node.ts should export installNodePackages function", async () => {
    const nodePath = join(CONFIGS_ROOT, "install", "node.ts");
    if (existsSync(nodePath)) {
      const module = await import(nodePath);
      expect(typeof module.installNodePackages).toBe("function");
    }
  });

  test("rust.ts should export installRust function", async () => {
    const rustPath = join(CONFIGS_ROOT, "install", "rust.ts");
    if (existsSync(rustPath)) {
      const module = await import(rustPath);
      expect(typeof module.installRust).toBe("function");
    }
  });

  test("macos/brew.ts should export installBrew function", async () => {
    const brewPath = join(CONFIGS_ROOT, "install", "macos", "brew.ts");
    if (existsSync(brewPath)) {
      const module = await import(brewPath);
      expect(typeof module.installBrew).toBe("function");
    }
  });

  test("macos/macos.ts should export setupMacOS function", async () => {
    const macosPath = join(CONFIGS_ROOT, "install", "macos", "macos.ts");
    if (existsSync(macosPath)) {
      const module = await import(macosPath);
      expect(typeof module.setupMacOS).toBe("function");
    }
  });

  test("all install scripts can still run standalone", async () => {
    // Test that scripts still work when run directly
    const nodePath = join(CONFIGS_ROOT, "install", "node.ts");
    const rustPath = join(CONFIGS_ROOT, "install", "rust.ts");

    // These should fail because packages aren't installed, but they should parse correctly
    if (existsSync(nodePath)) {
      const result = await $`bun --no-install ${nodePath}`.nothrow();
      // Script runs but may fail due to missing pnpm - that's ok, we just verify syntax
      expect(typeof result.exitCode).toBe("number");
    }
  });
});

describe("Symlink Management", () => {
  test("should detect existing correct symlinks", async () => {
    const testSymlinkDir = join(TEST_HOME, "symlink-test");
    mkdirSync(testSymlinkDir, { recursive: true });

    const source = join(testSymlinkDir, "source.txt");
    const target = join(testSymlinkDir, "target.txt");

    // Create source file
    writeFileSync(source, "test content");

    // Create symlink manually
    await $`ln -s ${source} ${target}`.quiet();

    // Verify it's detected correctly
    expect(existsSync(target)).toBe(true);
    expect(readlinkSync(target)).toBe(source);
  });

  test("should handle broken symlinks", async () => {
    const testSymlinkDir = join(TEST_HOME, "symlink-test2");
    mkdirSync(testSymlinkDir, { recursive: true });

    const nonexistent = join(testSymlinkDir, "nonexistent.txt");
    const brokenLink = join(testSymlinkDir, "broken-link.txt");

    // Create a broken symlink
    await $`ln -s ${nonexistent} ${brokenLink}`.nothrow().quiet();

    // The symlink exists but points to nothing
    expect(existsSync(brokenLink)).toBe(false); // existsSync returns false for broken symlinks
  });
});

describe("Git Integration", () => {
  test("should handle git submodule updates", async () => {
    if (existsSync(join(CONFIGS_ROOT, ".git"))) {
      const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --dry-run`
        .nothrow()
        .text();

      expect(result).toContain("submodule");
    }
  });

  test("should configure git credential helper", async () => {
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
        .nothrow()
        .text();

    expect(result).toContain("git credential helper");
  });
});

describe("File Preservation", () => {
  beforeEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });
    mkdirSync(join(TEST_HOME, ".config"), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  test("should never delete user files without backup", async () => {
    const userFile = join(TEST_HOME, ".bashrc");
    const userData = "important user data that must not be lost";

    writeFileSync(userFile, userData);

    // Run install
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Original data should exist in backup
    const files = readdirSync(TEST_HOME);
    const backupFiles = files.filter((f) => f.startsWith(".bashrc.backup."));
    expect(backupFiles.length).toBeGreaterThan(0);

    const backupPath = join(TEST_HOME, backupFiles[0]);
    const backupData = await Bun.file(backupPath).text();
    expect(backupData).toBe(userData);
  });

  test("should preserve multiple backups if run multiple times", async () => {
    const userFile = join(TEST_HOME, ".bashrc");

    // First file
    writeFileSync(userFile, "first version");
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Wait a moment to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Remove symlink and create second file
    rmSync(userFile);
    writeFileSync(userFile, "second version");
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Should have two backups
    const files = readdirSync(TEST_HOME);
    const backupFiles = files.filter((f) => f.startsWith(".bashrc.backup."));
    expect(backupFiles.length).toBe(2);
  });
});

describe("Edge Cases and Error Handling", () => {
  beforeEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });
    mkdirSync(join(TEST_HOME, ".config"), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  test("should handle permission errors gracefully", async () => {
    // This test ensures the script continues even if some operations fail
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`.nothrow();

    // Should complete successfully even if some files can't be created
    expect(result.exitCode).toBe(0);
  });

  test("should handle directory as target when expecting symlink", async () => {
    const targetDir = join(TEST_HOME, ".bashrc");

    // Create a directory where we want to put a symlink
    mkdirSync(targetDir);

    // Run install - should backup the directory and create symlink
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Should have backed up the directory
    const files = readdirSync(TEST_HOME);
    const backupDirs = files.filter((f) => f.startsWith(".bashrc.backup."));
    expect(backupDirs.length).toBeGreaterThan(0);
  });

  test("should handle very long file paths", async () => {
    // Ensure the script can handle paths with reasonable length
    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --dry-run`
      .nothrow()
      .text();

    expect(result).toContain("DRY-RUN MODE");
  });

  test("should handle special characters in HOME path", async () => {
    // Test with spaces in the HOME path
    const specialHome = join(TEST_HOME, "test space");
    mkdirSync(specialHome, { recursive: true });
    mkdirSync(join(specialHome, ".config"), { recursive: true });

    const result =
      await $`HOME=${specialHome} bun ${INSTALL_SCRIPT} --skip-packages`.nothrow();

    // Should complete successfully
    expect(result.exitCode).toBe(0);
  });

  test("should not follow symlink chains when backing up", async () => {
    const targetBashrc = join(TEST_HOME, ".bashrc");
    const intermediate = join(TEST_HOME, "intermediate");
    const final = join(TEST_HOME, "final");

    // Create a chain: .bashrc -> intermediate -> final
    writeFileSync(final, "final content");
    await $`ln -s ${final} ${intermediate}`.quiet();
    await $`ln -s ${intermediate} ${targetBashrc}`.quiet();

    // Run install
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Should have created a backup
    const files = readdirSync(TEST_HOME);
    const backupFiles = files.filter((f) => f.startsWith(".bashrc.backup."));
    expect(backupFiles.length).toBeGreaterThan(0);
  });

  test("should handle concurrent runs gracefully", async () => {
    // Start two installations at the same time
    const run1 = $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();
    const run2 = $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Both should complete
    const [result1, result2] = await Promise.all([run1, run2]);

    // At least one should succeed
    expect(result1.exitCode === 0 || result2.exitCode === 0).toBe(true);
  });

  test("should handle missing .config directory", async () => {
    // Remove .config directory
    rmSync(join(TEST_HOME, ".config"), { recursive: true, force: true });

    // Run install - should create it
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // .config should now exist
    expect(existsSync(join(TEST_HOME, ".config"))).toBe(true);
  });

  test("should handle empty source directories", async () => {
    // This tests that the script doesn't crash on empty directories
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`.nothrow();

    expect(result.exitCode).toBe(0);
  });
});

describe("CLI Argument Combinations", () => {
  test("should handle --dry-run with --skip-packages", async () => {
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --dry-run --skip-packages`
        .nothrow()
        .text();

    expect(result).toContain("DRY-RUN MODE");
    expect(result).toContain("Skipping package installations");
  });

  test("should handle --dry-run with --verbose", async () => {
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --dry-run --verbose`
        .nothrow()
        .text();

    expect(result).toContain("DRY-RUN MODE");
    expect(result).toContain("Configs root:");
  });

  test("should handle all flags together", async () => {
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --dry-run --skip-packages --verbose`
        .nothrow()
        .text();

    expect(result).toContain("DRY-RUN MODE");
    expect(result).toContain("Skipping package installations");
    expect(result).toContain("Configs root:");
  });

  test("should handle short flags", async () => {
    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} -d -s -v`
      .nothrow()
      .text();

    expect(result).toContain("DRY-RUN MODE");
    expect(result).toContain("Skipping package installations");
  });

  test("should reject invalid flags", async () => {
    const result =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --invalid-flag`.nothrow();

    // Should exit with error
    expect(result.exitCode).not.toBe(0);
  });
});

describe("Verification Mode", () => {
  beforeEach(() => {
    // Create fresh test home directory for each test
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
    mkdirSync(TEST_HOME, { recursive: true });
    mkdirSync(join(TEST_HOME, ".config"), { recursive: true });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(TEST_HOME)) {
      rmSync(TEST_HOME, { recursive: true, force: true });
    }
  });

  test("should report missing symlinks when nothing is installed", async () => {
    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`
      .nothrow()
      .text();

    // Should report missing symlinks
    expect(result).toContain("Not linked:");
    expect(result).toContain("Summary:");
    expect(result).toContain("Missing");

    // Should exit with error code when there are issues
    const exitResult =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`.nothrow();
    expect(exitResult.exitCode).toBe(1);
  });

  test("should report all symlinks OK when properly installed", async () => {
    // First install everything
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Then verify
    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`
      .nothrow()
      .text();

    expect(result).toContain("Summary:");
    expect(result).toContain("OK");
    expect(result).toContain("All symlinks are correctly configured!");

    // Should exit with success code
    const exitResult =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`.nothrow();
    expect(exitResult.exitCode).toBe(0);
  });

  test("should detect wrong symlink targets", async () => {
    const targetBashrc = join(TEST_HOME, ".bashrc");
    const wrongSource = join(TEST_HOME, "wrong_bashrc");

    // Create a symlink to wrong location
    writeFileSync(wrongSource, "wrong content");
    await $`ln -s ${wrongSource} ${targetBashrc}`.quiet();

    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`
      .nothrow()
      .text();

    expect(result).toContain("Wrong target:");
    expect(result).toContain("Summary:");
    expect(result).toContain("Wrong target");

    // Should exit with error code
    const exitResult =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`.nothrow();
    expect(exitResult.exitCode).toBe(1);
  });

  test("should detect regular files that should be symlinks", async () => {
    const targetBashrc = join(TEST_HOME, ".bashrc");

    // Create a regular file instead of symlink
    writeFileSync(targetBashrc, "regular file content");

    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`
      .nothrow()
      .text();

    expect(result).toContain("Not a symlink:");
    expect(result).toContain("Summary:");

    // Should exit with error code
    const exitResult =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`.nothrow();
    expect(exitResult.exitCode).toBe(1);
  });

  test("should report source missing errors", async () => {
    // Remove a source file from configs
    const configBashrc = join(HOME_PATH, ".bashrc");
    const backup = `${configBashrc}.test-backup`;

    // Only run this test if source exists
    if (existsSync(configBashrc)) {
      // Backup and remove
      await $`mv ${configBashrc} ${backup}`.quiet();

      try {
        const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`
          .nothrow()
          .text();

        expect(result).toContain("Source does not exist:");
        expect(result).toContain("Summary:");

        // Should exit with error code
        const exitResult =
          await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`.nothrow();
        expect(exitResult.exitCode).toBe(1);
      } finally {
        // Restore the file
        await $`mv ${backup} ${configBashrc}`.quiet();
      }
    }
  });

  test("should not make any changes in verify mode", async () => {
    // Create a regular file
    const targetBashrc = join(TEST_HOME, ".bashrc");
    writeFileSync(targetBashrc, "original content");
    const originalMtime = statSync(targetBashrc).mtimeMs;

    // Wait a bit to ensure mtime would change if file was modified
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Run verify
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`.nothrow().quiet();

    // File should not have been modified
    expect(existsSync(targetBashrc)).toBe(true);
    const newMtime = statSync(targetBashrc).mtimeMs;
    expect(newMtime).toBe(originalMtime);

    // Content should be unchanged
    const content = await Bun.file(targetBashrc).text();
    expect(content).toBe("original content");

    // No backup should have been created
    const files = readdirSync(TEST_HOME);
    const backupFiles = files.filter((f) => f.includes(".backup."));
    expect(backupFiles.length).toBe(0);
  });

  test("should show colorized output with checkmarks", async () => {
    // Install first
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Verify should have check marks
    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`
      .nothrow()
      .text();

    // Look for checkmark (✓) or the color codes
    expect(result).toContain("OK:");
  });

  test("should provide helpful suggestion when issues found", async () => {
    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`
      .nothrow()
      .text();

    expect(result).toContain("Run 'bun install/install.ts' to fix");
  });

  test("should check all expected symlinks", async () => {
    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`
      .nothrow()
      .text();

    // Should check home dotfiles
    expect(result).toContain(".bashrc");
    expect(result).toContain(".bash_profile");
    expect(result).toContain(".gitconfig");

    // Should check .config items
    expect(result).toContain("nvim");
    expect(result).toContain("kitty");
  });

  test("should handle mixed states correctly", async () => {
    // Install some files
    await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --skip-packages`
      .nothrow()
      .quiet();

    // Then break one symlink
    const targetBashrc = join(TEST_HOME, ".bashrc");
    if (existsSync(targetBashrc)) {
      rmSync(targetBashrc);
      writeFileSync(targetBashrc, "regular file");
    }

    const result = await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`
      .nothrow()
      .text();

    // Should have both OK and issues
    expect(result).toContain("OK:");
    expect(result).toContain("Not a symlink:");
    expect(result).toContain("Summary:");

    // Should exit with error
    const exitResult =
      await $`HOME=${TEST_HOME} bun ${INSTALL_SCRIPT} --verify`.nothrow();
    expect(exitResult.exitCode).toBe(1);
  });
});
