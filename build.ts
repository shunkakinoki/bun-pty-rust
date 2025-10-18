/**
 * TypeScript build script for bun-pty
 * 
 * This script handles both building the Rust library and TypeScript code.
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

// Configuration
const RUST_DIR = "./rust-pty";
const OUTPUT_DIR = "./dist";

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Build Rust library
console.log("Building Rust library...");
const rustBuild = spawnSync("cargo", ["build", "--release"], { 
  cwd: RUST_DIR,
  stdio: "inherit",
  shell: true
});

if (rustBuild.status !== 0) {
  console.error("Failed to build Rust library");
  process.exit(1);
}

console.log("Rust library built successfully!");

// Copy native library to dist directory
const platform = process.platform;
const arch = process.arch;
const libName = platform === "darwin" ? "librust_pty.dylib" : platform === "win32" ? "rust_pty.dll" : "librust_pty.so";
const libSourcePath = join(RUST_DIR, "target", "release", libName);
const libDestPath = join(OUTPUT_DIR, libName);

if (existsSync(libSourcePath)) {
  console.log(`Copying ${libName} to dist directory...`);
  copyFileSync(libSourcePath, libDestPath);
  console.log("Native library copied successfully!");
} else {
  console.error(`Native library not found at ${libSourcePath}`);
  process.exit(1);
}

// Copy architecture-specific library files for better compatibility
if (platform === "darwin" && arch === "arm64") {
  const archSpecificName = "librust_pty_arm64.dylib";
  const archSpecificPath = join(RUST_DIR, "target", "release", archSpecificName);
  const archSpecificDestPath = join(OUTPUT_DIR, archSpecificName);

  // If architecture-specific file doesn't exist, create it from the generic one
  if (!existsSync(archSpecificPath) && existsSync(libSourcePath)) {
    console.log(`Creating ${archSpecificName} from ${libName}...`);
    copyFileSync(libSourcePath, archSpecificPath);
  }

  if (existsSync(archSpecificPath)) {
    console.log(`Copying ${archSpecificName} to dist directory...`);
    copyFileSync(archSpecificPath, archSpecificDestPath);
    console.log("Architecture-specific library copied successfully!");
  }
} else if (platform === "linux" && arch === "arm64") {
  const archSpecificName = "librust_pty_arm64.so";
  const archSpecificPath = join(RUST_DIR, "target", "release", archSpecificName);
  const archSpecificDestPath = join(OUTPUT_DIR, archSpecificName);

  // If architecture-specific file doesn't exist, create it from the generic one
  if (!existsSync(archSpecificPath) && existsSync(libSourcePath)) {
    console.log(`Creating ${archSpecificName} from ${libName}...`);
    copyFileSync(libSourcePath, archSpecificPath);
  }

  if (existsSync(archSpecificPath)) {
    console.log(`Copying ${archSpecificName} to dist directory...`);
    copyFileSync(archSpecificPath, archSpecificDestPath);
    console.log("Architecture-specific library copied successfully!");
  }
}

// Building TypeScript code is handled by the bun CLI (see package.json scripts) 