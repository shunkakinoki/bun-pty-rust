# examples

This example project runs directly against the locally built `bun-pty-rust`
artifacts rather than a published package.

To install dependencies:

```bash
bun install
```

Build the library in the repository root so the example can import `../dist`:

```bash
bun run build:ts
```

Then run the example from the `examples` directory:

```bash
bun start
```
