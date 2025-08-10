# IntentProof 🎯

> **AI Intent Verification Framework** - Prove what AI actually did, not what it claims.

## The Problem

After an 8-day debugging nightmare where an AI assistant:
- Claimed to create tests *(no test files existed)*
- Said bugs were fixed *(bugs still occurred)*  
- Generated documentation instead of code
- Wasted countless hours on phantom solutions

We realized: **AI assistants need external verification, not internal "personality traits"**.

## The Solution

IntentProof forces AI to:
1. **Declare intent** before acting
2. **Break down** goals into verifiable steps
3. **Execute** with automatic verification
4. **Only claim success** when verification passes

## Quick Start

### Installation

```bash
npm install -g intentproof
```

### For Claude Users (MCP)

```bash
# Add to Claude
claude mcp add intentproof npx intentproof-mcp

# Now Claude will automatically verify claims!
```

### Basic Usage

```typescript
import { Intent } from 'intentproof';

// Before claiming "I fixed the authentication bug"
const intent = new Intent('Fix authentication bug')
  .requires('npm test auth', 'fails')  // Bug must exist
  .step('Find root cause', {
    verify: 'grep -r singleton client.ts',
    expect: 'found'
  })
  .step('Remove singleton', {
    verify: '! grep -r "if (clientInstance)" client.ts',
    expect: ''
  })
  .ensures('npm test auth', 'passes');  // Bug must be fixed

const result = await intent.execute();

if (!result.success) {
  console.error(`Failed at: ${result.failedStep}`);
  // DO NOT claim the bug is fixed!
}
```

## Real Examples

### 1. Verify Test Creation

```typescript
const intent = new Intent('Create integration tests')
  .step('Create test directory', {
    verify: 'test -d tests/integration',
    expect: 'tests/integration'
  })
  .step('Create auth test', {
    verify: 'test -f tests/integration/auth.test.ts'
  })
  .step('Tests have actual test cases', {
    verify: 'grep -c "describe\\|it" tests/integration/auth.test.ts',
    expect: '>0'
  })
  .ensures('npm test:integration', 'passes');
```

### 2. Verify Bug Fix

```typescript
const intent = new Intent('Fix 401 authentication error')
  .requires('curl /api/user', 'returns 401')  // Verify bug exists
  .step('Apply fix', {
    action: async () => {
      // Your fix code here
    },
    verify: 'grep -v singleton client.ts'
  })
  .ensures('curl /api/user', 'returns 200');  // Verify fix works
```

### 3. Verify Refactoring (with invariants)

```typescript
const intent = new Intent('Refactor to TypeScript')
  .invariant('npm test', 'passes')  // Tests must ALWAYS pass
  .step('Convert files', {
    verify: 'find src -name "*.ts" | wc -l',
    expect: '>0'
  })
  .step('No JS files remain', {
    verify: 'find src -name "*.js" | wc -l',
    expect: '0'
  })
  .ensures('tsc --noEmit', 'exit 0');  // TypeScript compiles
```

## CLI Usage

```bash
# Quick check
intentproof check "npm test" --expect "passes"

# Create intent file
intentproof init

# Execute intent from file
intentproof verify intent.json

# Show examples
intentproof examples
```

## MCP Integration (for AI Assistants)

When IntentProof is installed as an MCP server, AI assistants get these tools:

- `intent_declare` - Declare what you're about to do
- `intent_step` - Add verification steps
- `intent_verify` - Execute and verify all steps
- `intent_quick_check` - Quick one-off verification
- `intent_status` - Check current intent progress

Example AI workflow:
```typescript
// AI: "I'll fix the authentication bug"
mcp.intent_declare({
  goal: "Fix authentication bug",
  steps: [
    { name: "Find issue", verify: "grep singleton", expect: "found" },
    { name: "Apply fix", verify: "! grep singleton" }
  ]
});

// AI does the work...

const result = await mcp.intent_verify();
// Only claim success if result.success === true
```

## How It Works

### 1. Hierarchical Intent Trees
Break complex goals into verifiable sub-tasks:
```
Fix auth bug
├── Identify issue (verify: tests fail)
├── Apply fix (verify: code changed)
└── Validate (verify: tests pass)
```

### 2. Contract-Based Verification
```typescript
{
  preconditions: [],   // What must be true before
  steps: [],          // Verifiable actions
  postconditions: [], // What must be true after
  invariants: []      // What stays true throughout
}
```

### 3. External Validation
- Real commands (`npm test`)
- Real files (`test -f file.ts`)
- Real APIs (`curl /endpoint`)
- Real state (no self-assessment)

## Why IntentProof?

### ❌ Without IntentProof:
```
AI: "I created the tests"
Reality: No test files exist
Result: Hours wasted debugging
Trust: Destroyed
```

### ✅ With IntentProof:
```
AI: "I will create tests" → Declaration
IntentProof: Verifies files exist → Reality check
Result: Trust maintained
Time: Saved
```

## Architecture

```
intentproof/
├── packages/
│   ├── core/           # Verification engine
│   ├── cli/            # Command-line tool
│   ├── mcp-server/     # Claude integration
│   └── wasm/           # Browser support (coming soon)
```

## Contributing

We need help with:
- Additional verifiers (Docker, K8s, cloud)
- Language bindings (Python, Rust, Go)
- Framework integrations (VS Code, GitHub Actions)
- More MCP tools

## The 8-Day Bug That Started It All

This framework exists because an AI assistant spent 8 days claiming to fix a bug that was never fixed. It created "tests" that didn't exist, applied "fixes" that didn't work, and wasted countless hours on phantom solutions.

The core issue: A singleton pattern was caching an anonymous Supabase client, preventing authentication from working. The AI claimed it was fixed multiple times. It wasn't.

With IntentProof, that bug would have been caught immediately:
```typescript
intent.ensures('npm test auth', 'passes');  // Would have failed
```

## License

MIT - Because truth should be free.

---

**Remember**: Every claim needs proof. No proof, no claim.