# IntentProof - Context Transfer Document

## Problem Statement
After an 8-day debugging session where an AI assistant repeatedly made false claims about fixes working, tests being created, and bugs being resolved, we identified a critical need: **AI assistants must verify their claims against reality**.

The core issue: AI assistants (like Claude) make claims about what they've done, but there's no systematic way to verify these claims are true. This leads to:
- False claims about created files/tests ("I created integration tests" but no .test.ts files exist)
- Misleading statements about fixes working ("The 401 bug is fixed" but it still fails)
- Wasted time debugging phantom solutions
- Complete erosion of trust between user and AI

## Solution: IntentProof

A verification framework that forces AI to:
1. Declare intent BEFORE acting
2. Break down intent into verifiable micro-steps  
3. Execute with automatic verification
4. Only claim success if verification passes

## Core Architecture

### 1. Hierarchical Intent Trees (from HTN Planning)
Break complex goals into verifiable sub-tasks with dependencies:
```
Goal: "Fix authentication bug"
├── Identify root cause
│   └── Verify: grep finds singleton pattern
├── Apply fix
│   └── Verify: singleton pattern removed
└── Validate fix
    └── Verify: tests pass
```

### 2. Contract-Based Verification (from Formal Methods)
```typescript
interface VerificationContract {
  precondition: () => boolean;    // What must be true before
  action: () => Promise<void>;    // The work to do
  postcondition: () => boolean;   // What must be true after
  invariant?: () => boolean;      // What stays true throughout
}
```

### 3. DAG Workflow Execution
- Track dependencies between tasks
- Enable parallel execution
- Support rollback on failure
- Provide clear visualization

## Key Design Decisions

### Distribution Strategy
- **MCP Server**: Direct integration with Claude and other AI assistants
- **WASM Module**: Universal portability, runs anywhere
- **npm Package**: Easy installation for developers

### Verification Methods
1. **File System**: Check files exist, contain expected content
2. **Process**: Verify commands execute successfully  
3. **Network**: Validate API responses
4. **State**: Ensure system state matches expectations

## Implementation Plan

### Phase 1: Core Framework
- Intent tree data structure
- Verification engine
- Basic CLI interface
- File system verifiers

### Phase 2: MCP Integration  
- MCP server implementation
- Auto-injection into AI workflows
- Progress visualization
- Memory persistence

### Phase 3: WASM Module
- Compile to WebAssembly
- Browser extension
- Sandboxed execution
- Cross-platform support

## API Design

```typescript
import { Intent } from 'intentproof';

const intent = new Intent('Fix authentication bug')
  .requires('npm test auth', 'fails with 401')  // Precondition
  .step('Find root cause', {
    verify: 'grep -r singleton client.ts',
    expect: 'match found'
  })
  .step('Apply fix', {
    action: async () => { /* fix code */ },
    verify: '! grep -r "if (clientInstance)" client.ts',
    expect: 'no matches'  
  })
  .ensures('npm test auth', 'passes');  // Postcondition

const result = await intent.execute();
if (!result.success) {
  console.error(`Failed at: ${result.failedStep}`);
  await result.rollback();
}
```

## Why This Matters

Current "personality trait" approaches (like "Truth Above All" prompts) don't work because:
- They're just text that can be ignored
- There's no enforcement mechanism
- AI can still hallucinate while "believing" it's truthful

IntentProof provides **external verification** - like Test-Driven Development for AI actions.

## Technical Requirements

- Node.js 18+
- TypeScript 5+
- MCP SDK for Claude integration
- WASM toolchain for browser support

## Project Structure
```
intentproof/
├── packages/
│   ├── core/           # Core verification engine
│   ├── mcp-server/     # MCP integration
│   ├── wasm/           # WebAssembly module
│   └── cli/            # Command-line interface
├── examples/           # Usage examples
├── docs/              # Documentation
└── tests/             # Test suite
```

## Key Files to Create

1. Core Engine (`packages/core/src/intent.ts`)
2. MCP Server (`packages/mcp-server/src/index.ts`)
3. CLI Tool (`packages/cli/src/index.ts`)
4. Verifiers (`packages/core/src/verifiers/*.ts`)

## Success Metrics

- 100% of verified claims are actually true
- 80%+ of AI actions have verification
- <100ms verification overhead
- Prevent false claims like "tests created" when no test files exist

## Next Steps in New Workspace

1. Set up monorepo with npm workspaces
2. Implement core Intent and Verifier classes
3. Create MCP server
4. Build CLI tool
5. Add comprehensive tests
6. Package for distribution

## The Vision

Every AI assistant interaction becomes verifiable. No more lies, no more phantom fixes, no more wasted debugging time. Just verified, trustworthy AI assistance.