import { spawn } from "./dist/index.js";

console.log("Testing package import...");

try {
  const terminal = spawn("echo", ["Hello from installed package test"], { cols: 80, rows: 24 });
  console.log("✅ Package imported successfully!");
  console.log(`PID: ${terminal.pid}`);
  terminal.kill();
} catch (error) {
  console.error("❌ Package import failed:", error);
}
