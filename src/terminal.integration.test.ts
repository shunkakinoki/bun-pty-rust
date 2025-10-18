import { afterEach, expect, test } from "bun:test";
import type { IExitEvent } from "./interfaces";
import { Terminal } from "./terminal";

// This is an integration test file that runs tests against the actual Rust backend.
// Only run if the environment variable RUN_INTEGRATION_TESTS is set to "true"
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "true";

// Skip tests if integration tests are not enabled
if (!runIntegrationTests) {
  test.skip("Integration tests", () => {
    console.log(
      "Skipping integration tests. Set RUN_INTEGRATION_TESTS=true to run them.",
    );
  });
  process.exit(0);
}

// Keep track of terminals created so they can be cleaned up
const terminals: Terminal[] = [];

afterEach(() => {
  // Clean up any terminals created during tests
  for (const term of terminals) {
    try {
      term.kill();
    } catch (_e) {
      // Ignore errors during cleanup
    }
  }
  terminals.length = 0;
});

test("Terminal can spawn a real process", () => {
  const terminal = new Terminal("sleep", ["1"]);
  terminals.push(terminal);

  expect(terminal.pid).toBeGreaterThan(0);
});

test("Terminal can receive data from a real process", async () => {
  // Use a script command that will definitely produce output - use single argument for '-c' option
  const terminal = new Terminal("bash", [
    "-c",
    "\"echo 'Hello from Bun PTY'\"",
  ]);
  terminals.push(terminal);

  // Collect output and track when process exits
  let dataReceived = "";
  let hasExited = false;

  terminal.onData((data) => {
    console.log("[TEST] Received data:", data);
    dataReceived += data;
  });

  terminal.onExit(() => {
    console.log("[TEST] Process exited");
    hasExited = true;
  });

  // Wait for data and process exit
  const timeout = 2000; // 2 second timeout
  const start = Date.now();

  while (!hasExited && Date.now() - start < timeout) {
    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Allow a short delay for any buffered output to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(dataReceived).toContain("Hello from Bun PTY");
});

test("Terminal can send data to a real process", async () => {
  let dataReceived = "";
  let hasExited = false;

  // Use a properly quoted bash command
  const terminal = new Terminal("bash", [
    "-c",
    'read line; echo "You typed: $line"',
  ]);
  terminals.push(terminal);

  terminal.onData((data) => {
    console.log("[TEST] Received data:", data);
    dataReceived += data;
  });

  terminal.onExit(() => {
    console.log("[TEST] Process exited");
    hasExited = true;
  });

  // Give the process time to start up
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log("[TEST] Sending input: Hello from Bun PTY");
  terminal.write("Hello from Bun PTY\n");

  // Wait for process to exit or timeout
  const timeout = 2000; // 2 second timeout
  const start = Date.now();

  while (!hasExited && Date.now() - start < timeout) {
    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Allow a short delay for any buffered output to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(dataReceived).toContain("You typed: Hello from Bun PTY");
});

test("Terminal can resize a real terminal", async () => {
  const terminal = new Terminal("sleep", ["1"]);
  terminals.push(terminal);

  // Should not throw
  terminal.resize(100, 40);

  expect(terminal.cols).toBe(100);
  expect(terminal.rows).toBe(40);

  // Wait for process to exit
  await new Promise((resolve) => setTimeout(resolve, 1200));
});

test("Terminal can kill a real process", async () => {
  const terminal = new Terminal("sleep", ["10"]);
  terminals.push(terminal);

  let exitEvent: IExitEvent | null = null;
  terminal.onExit((event) => {
    console.log("[TEST] Process exited with event:", event);
    exitEvent = event;
  });

  // Kill the process
  terminal.kill();

  // Wait for exit event
  const timeout = 2000; // 2 second timeout
  const start = Date.now();

  while (!exitEvent && Date.now() - start < timeout) {
    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  expect(exitEvent).not.toBeNull();
});

test("Terminal can retrieve the correct process ID", () => {
  // Create a terminal with sleep command (long-running so we can check PID)
  const terminal = new Terminal("sleep", ["5"]);
  terminals.push(terminal);

  // Check that we got a valid PID
  const pid = terminal.pid;
  console.log("[TEST] Process ID:", pid);
  expect(pid).toBeGreaterThan(0);

  // Verify this PID actually exists in the system
  // This is platform-specific, but we can use a simple check
  let pidExists = false;

  try {
    // On Unix systems, sending signal 0 checks if process exists without affecting it
    process.kill(pid, 0);
    pidExists = true;
    console.log("[TEST] Process ID exists in system");
  } catch (error) {
    console.error("[TEST] Error checking process:", error);
  }

  expect(pidExists).toBe(true);

  // Kill the process to clean up
  terminal.kill();
});

test("Terminal can run a bash script", async () => {
  let dataReceived = "";
  let hasExited = false;

  // Use a properly quoted bash command
  const terminal = new Terminal("bash", [
    "-c",
    "\"echo 'Hello' && sleep 0.2 && echo 'World'\"",
  ]);
  terminals.push(terminal);

  terminal.onData((data) => {
    console.log("[TEST] Received data:", data);
    dataReceived += data;
  });

  terminal.onExit(() => {
    console.log("[TEST] Process exited");
    hasExited = true;
  });

  // Wait for process to exit or timeout
  const timeout = 2000; // 2 second timeout
  const start = Date.now();

  while (!hasExited && Date.now() - start < timeout) {
    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Allow a short delay for any buffered output to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(dataReceived).toContain("Hello");
  expect(dataReceived).toContain("World");
});

test("Terminal can pass custom environment variables", async () => {
  let dataReceived = "";
  let hasExited = false;

  // Create a terminal with custom environment variables
  const terminal = new Terminal(
    "bash",
    ["-c", '"echo \\"TEST_VAR=$TEST_VAR\\""'],
    {
      env: {
        PATH: process.env.PATH || "/usr/bin:/bin",
        TEST_VAR: "custom_value_123",
      },
    },
  );
  terminals.push(terminal);

  terminal.onData((data) => {
    console.log("[TEST] Received data:", data);
    dataReceived += data;
  });

  terminal.onExit(() => {
    console.log("[TEST] Process exited");
    hasExited = true;
  });

  // Wait for process to exit or timeout
  const timeout = 2000;
  const start = Date.now();

  while (!hasExited && Date.now() - start < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Allow a short delay for any buffered output to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(dataReceived).toContain("TEST_VAR=custom_value_123");
});

test("Terminal can inherit parent environment with custom overrides", async () => {
  let dataReceived = "";
  let hasExited = false;

  // Create a terminal that inherits parent env and adds custom variables
  const terminal = new Terminal(
    "bash",
    [
      "-c",
      '"echo \\"CUSTOM=$CUSTOM_VAR\\" && echo \\"PATH_EXISTS=$([[ -n \\"$PATH\\" ]] && echo \'yes\' || echo \'no\')\\""',
    ],
    {
      env: {
        ...process.env,
        CUSTOM_VAR: "inherited_test",
      },
    },
  );
  terminals.push(terminal);

  terminal.onData((data) => {
    console.log("[TEST] Received data:", data);
    dataReceived += data;
  });

  terminal.onExit(() => {
    console.log("[TEST] Process exited");
    hasExited = true;
  });

  // Wait for process to exit or timeout
  const timeout = 2000;
  const start = Date.now();

  while (!hasExited && Date.now() - start < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Allow a short delay for any buffered output to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(dataReceived).toContain("CUSTOM=inherited_test");
  expect(dataReceived).toContain("PATH_EXISTS=yes");
});

test("Terminal with empty env should not have parent environment variables", async () => {
  let dataReceived = "";
  let hasExited = false;

  // Set a unique variable in the parent that should NOT be inherited
  const uniqueTestVar = "UNIQUE_PARENT_VAR_12345";
  process.env[uniqueTestVar] = "should_not_appear";

  // Create a terminal with empty environment (bash still needs to be found, so we use absolute path)
  const terminal = new Terminal(
    "/bin/bash",
    [
      "-c",
      `echo "TEST_VAR_EXISTS=$([[ -n "$${uniqueTestVar}" ]] && echo 'yes' || echo 'no')"`,
    ],
    {
      env: {},
    },
  );
  terminals.push(terminal);

  terminal.onData((data) => {
    console.log("[TEST] Received data:", data);
    dataReceived += data;
  });

  terminal.onExit(() => {
    console.log("[TEST] Process exited");
    hasExited = true;
  });

  // Wait for process to exit or timeout
  const timeout = 2000;
  const start = Date.now();

  while (!hasExited && Date.now() - start < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Allow a short delay for any buffered output to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Clean up the test variable
  delete process.env[uniqueTestVar];

  expect(dataReceived).toContain("TEST_VAR_EXISTS=no");
});

test("Terminal can handle environment variables with special characters", async () => {
  let dataReceived = "";
  let hasExited = false;

  // Create a terminal with env variables containing special characters
  const terminal = new Terminal(
    "bash",
    ["-c", '"echo \\"SPECIAL=$SPECIAL_VAR\\""'],
    {
      env: {
        PATH: process.env.PATH || "/usr/bin:/bin",
        SPECIAL_VAR: "value with spaces and=equals",
      },
    },
  );
  terminals.push(terminal);

  terminal.onData((data) => {
    console.log("[TEST] Received data:", data);
    dataReceived += data;
  });

  terminal.onExit(() => {
    console.log("[TEST] Process exited");
    hasExited = true;
  });

  // Wait for process to exit or timeout
  const timeout = 2000;
  const start = Date.now();

  while (!hasExited && Date.now() - start < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Allow a short delay for any buffered output to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(dataReceived).toContain("SPECIAL=value with spaces and=equals");
});

test("Terminal can pass multiple environment variables", async () => {
  let dataReceived = "";
  let hasExited = false;

  // Create a terminal with multiple env variables
  const terminal = new Terminal(
    "bash",
    ["-c", '"echo \\"VAR1=$VAR1 VAR2=$VAR2 VAR3=$VAR3\\""'],
    {
      env: {
        PATH: process.env.PATH || "/usr/bin:/bin",
        VAR1: "value1",
        VAR2: "value2",
        VAR3: "value3",
      },
    },
  );
  terminals.push(terminal);

  terminal.onData((data) => {
    console.log("[TEST] Received data:", data);
    dataReceived += data;
  });

  terminal.onExit(() => {
    console.log("[TEST] Process exited");
    hasExited = true;
  });

  // Wait for process to exit or timeout
  const timeout = 2000;
  const start = Date.now();

  while (!hasExited && Date.now() - start < timeout) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Allow a short delay for any buffered output to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(dataReceived).toContain("VAR1=value1");
  expect(dataReceived).toContain("VAR2=value2");
  expect(dataReceived).toContain("VAR3=value3");
});
