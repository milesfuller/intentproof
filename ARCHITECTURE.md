# IntentProof Architecture Decision

## Hybrid Approach: TypeScript + Rust Core

### Phase 1: TypeScript MVP (Week 1)
- Rapid development and iteration
- Direct MCP integration
- Validate the concept works
- Get user feedback quickly

### Phase 2: Rust Core Module (Week 2-3)
```
intentproof/
├── packages/
│   ├── core-rs/        # Rust verification engine
│   │   ├── src/
│   │   └── Cargo.toml
│   ├── core/           # TypeScript wrapper around Rust
│   │   └── binding.ts  # Node-API/WASM bindings
│   ├── mcp-server/     # TypeScript (MCP is TS)
│   └── cli/            # TypeScript (better for CLI UX)
```

### Why Hybrid?

1. **Performance-critical paths in Rust:**
   - Command execution sandboxing
   - File system verification
   - Parallel DAG execution
   - State snapshots and rollback

2. **Developer-facing APIs in TypeScript:**
   - MCP server (must be TS)
   - CLI with nice output
   - Config file handling
   - Plugin system

3. **WASM distribution:**
   - Rust core compiles to WASM
   - Runs in browser, Deno, Bun, Node.js
   - Single codebase, multiple targets

### Architecture Benefits

```typescript
// TypeScript API (friendly)
const intent = new Intent('Fix bug')
  .step('Find issue', {
    verify: 'grep -r bug',
    expect: 'found'
  });

// Rust engine (fast & safe)
// Handles actual verification in separate process
// Sandboxed execution
// Parallel verification
// Memory-safe rollback
```

### Distribution Strategy

```bash
# npm users get Node.js bindings
npm install intentproof

# Rust users get native performance  
cargo install intentproof

# Browser users get WASM
import { Intent } from 'intentproof/wasm';

# MCP users get TypeScript server
claude mcp add intentproof
```

## Decision: Start TypeScript, Add Rust Core

We should start with TypeScript because:
1. **Faster to validate the idea works**
2. **MCP requires TypeScript anyway**
3. **We can add Rust core later without breaking changes**
4. **Users can start using it immediately**

Then add Rust for:
1. **2.0 release with 100x performance**
2. **WASM browser support**
3. **Security sandboxing**
4. **Single binary distribution**

## Implementation Plan

### Week 1: TypeScript MVP
- Core Intent engine
- Basic verifiers
- MCP server
- CLI tool

### Week 2: User Testing
- Get feedback
- Fix issues
- Refine API

### Week 3-4: Rust Core
- Port verification engine
- Add sandboxing
- WASM compilation
- Benchmark improvements

### Result
- TypeScript API that developers love
- Rust performance users need
- WASM portability everyone wants
- MCP integration that works today