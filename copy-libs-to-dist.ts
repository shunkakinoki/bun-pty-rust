#!/usr/bin/env bun
/**
 * Copy native libraries to dist directory for publishing
 * This is used in CI after cross-compiled libraries are placed in rust-pty/target/release/
 */

import { existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Configuration
const RUST_RELEASE_DIR = "./rust-pty/target/release";
const OUTPUT_DIR = "./dist";

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log("Copying native libraries to dist directory...");

// Copy all native libraries found in the release directory
const allFiles = readdirSync(RUST_RELEASE_DIR);
const libExtensions = ['.so', '.dylib', '.dll'];
const libFiles = allFiles.filter(file =>
  libExtensions.some(ext => file.endsWith(ext)) &&
  (file.startsWith('librust_pty') || file.startsWith('rust_pty'))
);

let copiedCount = 0;

// Copy each library if it exists
for (const libName of libFiles) {
  const libPath = join(RUST_RELEASE_DIR, libName);
  const destPath = join(OUTPUT_DIR, libName);
  console.log(`Copying ${libName}...`);
  copyFileSync(libPath, destPath);
  copiedCount++;
}

if (copiedCount === 0) {
  console.error("No native libraries found to copy!");
  process.exit(1);
}

console.log(`Successfully copied ${copiedCount} native libraries to dist directory!`);
